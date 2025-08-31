import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DockerManagerService } from './docker-manager.service';
import { EventsGateway } from './events.gateway';
import { Task, TaskDocument, TaskStatus } from '../tasks/schemas/task.schema';
import { LlmGatewayService } from './llm-gateway.service';
import { AgentDocument } from 'src/agents/schemas/agent.schema';
import { ProjectDocument } from 'src/projects/schemas/project.schema';
import { OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class OrchestrationService {
  private readonly logger = new Logger(OrchestrationService.name);

  constructor(
    private readonly dockerManager: DockerManagerService,
    private readonly eventsGateway: EventsGateway,
    private readonly llmGateway: LlmGatewayService,
    @InjectModel(Task.name) private taskModel: Model<TaskDocument>,
  ) {}

  @OnEvent('task.created')
  async handleTaskCreated(payload: { taskId: string }) {
    this.logger.log(`Перехвачено событие 'task.created' для задачи: ${payload.taskId}`);
    this.startTaskExecution(payload.taskId);
  }

  async startTaskExecution(taskId: string): Promise<void> {
    const task = await this.taskModel.findById(taskId).populate<{ project: ProjectDocument; assignee: AgentDocument }>(['project', 'assignee']);
    
    if (!task || !task.project || !task.assignee) {
      this.logger.error(`Задача ${taskId} не найдена или не имеет полного набора данных (проект/исполнитель).`);
      if (task && task.project) {
        const projectId = (task.project as ProjectDocument)._id.toString();
        this._logToProject(projectId, `[Оркестратор]: Ошибка! Задача или назначенный агент не найдены.`, 'system', 'System');
        await this.updateTaskStatus(taskId, projectId, TaskStatus.FAILED, 'system', 'System');
      }
      return;
    }
    
    const { project, assignee } = task;
    const projectId = project._id.toString();
    const agentName = assignee.name;
    const agentId = assignee._id.toString();

    this.logger.log(`[ОРКЕСТРАТОР] Запускаю задачу: "${task.title}" в проекте "${project.name}" для агента "${agentName}"`);
    this._logToProject(projectId, `[Оркестратор]: Принял задачу "${task.title}" в работу.`, agentId, agentName);
    
    let containerId: string | null = null;
    
    try {
        await this.updateTaskStatus(taskId, projectId, TaskStatus.IN_PROGRESS, agentId, agentName);

        this._logToProject(projectId, `[Docker]: Создаю среду...`, agentId, agentName);
        containerId = await this.dockerManager.createAndStartContainer('ubuntu:latest');
        this._logToProject(projectId, `[Docker]: Среда создана. ID: ${containerId.substring(0, 12)}`, agentId, agentName);

        await this.executeAndLogCommand(containerId, projectId, ['apt-get', 'update'], agentId, agentName);
        await this.executeAndLogCommand(containerId, projectId, ['apt-get', 'install', '-y', 'git'], agentId, agentName);
        await this.executeAndLogCommand(containerId, projectId, ['git', 'clone', project.gitRepositoryURL, '/app'], agentId, agentName);
        
        // --- НАЧАЛО ГЛАВНОГО ЦИКЛА ---
        let history = `КОНТЕКСТ: Ты только что вошел в систему. Код проекта находится в /app. Твой первый шаг?`;
        let maxIterations = 10;

        while (maxIterations > 0) {
          maxIterations--;

          const currentPrompt = this.buildIterativePrompt(assignee, task, history);

          this._logToProject(projectId, `[Оркестратор]: Обращаюсь к LLM...`, agentId, agentName);
          const llmResponse = await this.llmGateway.generateCommand(currentPrompt);
          this._logToProject(projectId, `[Мысль]: ${llmResponse.thought}`, agentId, agentName);

          if (llmResponse.finished || !llmResponse.command) {
            this._logToProject(projectId, `[Оркестратор]: Агент считает, что задача выполнена.`, agentId, agentName);
            break;
          }

          try {
            const commandResult = await this.executeAndLogCommand(
              containerId, projectId, [llmResponse.command, ...llmResponse.args], agentId, agentName
            );
            history = `ПРЕДЫДУЩЕЕ ДЕЙСТВИЕ:\n- Команда: "${llmResponse.command} ${llmResponse.args.join(' ')}"\n- Результат: УСПЕХ\n- Вывод:\n\`\`\`\n${commandResult || '(пустой вывод)'}\n\`\`\``;
          } catch (error) {
            history = `ПРЕДЫДУЩЕЕ ДЕЙСТВИЕ:\n- Команда: "${llmResponse.command} ${llmResponse.args.join(' ')}"\n- Результат: ОШИБКА\n- Вывод ошибки:\n\`\`\`\n${error.message}\n\`\`\``;
          }
        } // --- КОНЕЦ ГЛАВНОГО ЦИКЛА ---

        if (maxIterations <= 0) {
            this._logToProject(projectId, `[Оркестратор]: Превышен лимит итераций.`, agentId, agentName);
        }

        await this.updateTaskStatus(taskId, projectId, TaskStatus.COMPLETED, agentId, agentName);

    } catch (error) {
      this.logger.error(`КРИТИЧЕСКАЯ ОШИБКА в задаче ${taskId}:`, JSON.stringify(error, null, 2));
      this._logToProject(projectId, `[Оркестратор]: КРИТИЧЕСКАЯ ОШИБКА: ${error.message}`, agentId, agentName);
      await this.updateTaskStatus(taskId, projectId, TaskStatus.FAILED, agentId, agentName);
    } finally {
      if (containerId) {
        this._logToProject(projectId, `[Docker]: Уничтожаю среду...`, agentId, agentName);
        await this.dockerManager.stopAndRemoveContainer(containerId);
        this._logToProject(projectId, `[Docker]: Среда уничтожена.`, agentId, agentName);
      }
    }
  }
  
  private buildIterativePrompt(agent: AgentDocument, task: TaskDocument, history: string): string {
    return `
    SYSTEM PROMPT: Ты - автономный AI-агент-инструмент.
    ТВОЯ РОЛЬ: ${agent.role}.
    ПРАВИЛА:
    1. Ты работаешь в shell внутри Docker-контейнера.
    2. Ты должен выполнить ГЛОБАЛЬНУЮ ЗАДАЧУ.
    3. Твой ответ ВСЕГДА должен быть ТОЛЬКО JSON-объектом, без текста до или после.
    4. Если задача выполнена, "finished" должно быть true.

    СТРОГИЙ ФОРМАТ ОТВЕТА:
    {"thought": "Моя мысль.", "command": "команда", "args": ["аргумент"], "finished": false}
    
    ГЛОБАЛЬНАЯ ЗАДАЧА: "${task.title}: ${task.description}"
    
    ИСТОРИЯ ДЕЙСТВИЙ И КОНТЕКСТ:
    ${history}

    ТВОЙ СЛЕДУЮЩИЙ ШАГ В ФОРМАТЕ JSON:`;
  }

  private async executeAndLogCommand(containerId: string, projectId: string, command: string[], agentId: string, agentName: string): Promise<string> {
    this._logToProject(projectId, `[Команда]: ${command.join(' ')}`, agentId, agentName);
    const result = await this.dockerManager.executeCommand(containerId, command);
    this._logToProject(projectId, `[Результат]:\n${result}`, agentId, agentName);
    return result;
  }

  private _logToProject(projectId: string, message: string, agentId: string, agentName: string) {
    this.eventsGateway.sendToProjectRoom(projectId, 'agentLog', {
      message,
      agentId,
      agentName,
      timestamp: new Date(),
    });
  }

  private async updateTaskStatus(taskId: string, projectId: string, newStatus: TaskStatus, agentId: string, agentName: string) {
    await this.taskModel.updateOne({ _id: taskId }, { status: newStatus });
    this.eventsGateway.sendToProjectRoom(projectId, 'taskStatusUpdate', {
      taskId,
      newStatus,
      agentId,
      agentName,
    });
    this._logToProject(projectId, `[Статус]: Статус задачи изменен на ${newStatus}`, agentId, agentName);
  }
}