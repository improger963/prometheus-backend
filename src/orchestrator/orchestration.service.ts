import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { OnEvent } from '@nestjs/event-emitter';
import { DockerManagerService } from './docker-manager.service';
import { EventsGateway } from './events.gateway';
import { Task, TaskDocument, TaskStatus } from '../tasks/schemas/task.schema';
import { LlmManagerService } from './llm-manager.service';
import { AgentDocument } from 'src/agents/schemas/agent.schema';
import { ProjectDocument } from 'src/projects/schemas/project.schema';

@Injectable()
export class OrchestrationService {
  private readonly logger = new Logger(OrchestrationService.name);

  constructor(
    private readonly dockerManager: DockerManagerService,
    private readonly eventsGateway: EventsGateway,
    private readonly llmManager: LlmManagerService,
    @InjectModel(Task.name) private taskModel: Model<TaskDocument>,
  ) {}

  @OnEvent('task.created')
  async handleTaskCreated(payload: { taskId: string }) {
    this.logger.log(
      `Перехвачено событие 'task.created' для задачи: ${payload.taskId}`,
    );
    this.startTaskExecution(payload.taskId);
  }

  async startTaskExecution(taskId: string): Promise<void> {
    const task = await this.taskModel
      .findById(taskId)
      .populate<{
        project: ProjectDocument;
        assignee: AgentDocument;
      }>(['project', 'assignee']);

    if (!task || !task.project || !task.assignee) {
      /* ... (Guard Clause без изменений) ... */ return;
    }

    const { project, assignee } = task;
    const projectId = project._id.toString();

    this.logger.log(
      `[ОРКЕСТРАТОР] Запускаю задачу: "${task.title}" в проекте "${project.name}" для агента "${assignee.name}"`,
    );
    this._logToProject(
      projectId,
      `[Оркестратор]: Принял задачу "${task.title}" в работу. Исполнитель: агент "${assignee.name}".`,
    );

    let containerId: string | null = null;
    this.llmManager.resetState(); // Сбрасываем состояние LLM-заглушки

    try {
      await this.updateTaskStatus(taskId, projectId, TaskStatus.IN_PROGRESS);
      this._logToProject(projectId, `[Docker]: Создаю среду...`);
      containerId =
        await this.dockerManager.createAndStartContainer('ubuntu:latest');
      this._logToProject(
        projectId,
        `[Docker]: Среда создана. ID: ${containerId.substring(0, 12)}`,
      );

      // Подготовка среды
      await this.executeAndLogCommand(
        containerId,
        projectId,
        ['apt-get', 'update'],
        assignee.name,
      );
      await this.executeAndLogCommand(
        containerId,
        projectId,
        ['apt-get', 'install', '-y', 'git'],
        assignee.name,
      );
      await this.executeAndLogCommand(
        containerId,
        projectId,
        ['git', 'clone', project.gitRepositoryURL, '/app'],
        assignee.name,
      );

      // --- НАЧАЛО ГЛАВНОГО ЦИКЛА "МОЗГ-РУКИ" ---
      let currentPrompt = this.buildStartPrompt(assignee, task);
      let maxIterations = 10; // Защита от бесконечного цикла

      while (maxIterations > 0) {
        maxIterations--;

        this._logToProject(
          projectId,
          `[Оркестратор]: Обращаюсь к LLM за следующей командой...`,
        );
        const llmResponse =
          await this.llmManager.generateCommand(currentPrompt);
        this._logToProject(
          projectId,
          `[Агент]: ${assignee.name} подумал: "${llmResponse.thought}"`,
        );

        // Условие выхода из цикла
        if (llmResponse.finished || !llmResponse.command) {
          this._logToProject(
            projectId,
            `[Оркестратор]: Агент считает, что задача выполнена.`,
          );
          break;
        }

        // Попытка выполнить команду
        try {
          const commandResult = await this.executeAndLogCommand(
            containerId,
            projectId,
            [llmResponse.command, ...llmResponse.args],
            assignee.name,
          );
          // Подготовка следующего промпта
          currentPrompt = `Ты только что выполнил команду "${llmResponse.command}" и получил результат:\n---\n${commandResult}\n---\nКакой твой следующий шаг для выполнения глобальной задачи?`;
        } catch (error) {
          // Обработка Ошибок Внутри Цикла
          this._logToProject(
            projectId,
            `[Оркестратор]: Ошибка при выполнении команды!`,
          );
          currentPrompt = `При выполнении команды "${llmResponse.command}" произошла ошибка:\n---\n${error.message}\n---\nКак ты предлагаешь ее исправить? Дай мне новую команду.`;
        }
      } // --- КОНЕЦ ГЛАВНОГО ЦИКЛА ---

      if (maxIterations <= 0) {
        this._logToProject(
          projectId,
          `[Оркестратор]: Превышен лимит итераций. Принудительное завершение задачи.`,
        );
      }

      this._logToProject(
        projectId,
        `[Оркестратор]: Задача "${task.title}" успешно выполнена.`,
      );
      await this.updateTaskStatus(taskId, projectId, TaskStatus.COMPLETED);
    } catch (error) {
      this.logger.error(`КРИТИЧЕСКАЯ ОШИБКА в задаче ${taskId}:`, error);
      this._logToProject(
        projectId,
        `[Оркестратор]: КРИТИЧЕСКАЯ ОШИБКА: ${error.message}`,
      );
      await this.updateTaskStatus(taskId, projectId, TaskStatus.FAILED);
    } finally {
      if (containerId) {
        this._logToProject(projectId, `[Docker]: Уничтожаю среду...`);
        await this.dockerManager.stopAndRemoveContainer(containerId);
        this._logToProject(projectId, `[Docker]: Среда уничтожена.`);
      }
    }
  }

  // Обновляем вспомогательные методы для передачи имени агента в лог
  private async executeAndLogCommand(
    containerId: string,
    projectId: string,
    command: string[],
    agentName: string,
  ): Promise<string> {
    this._logToProject(
      projectId,
      `[Агент ${agentName}]: Выполняю > ${command.join(' ')}`,
    );
    const result = await this.dockerManager.executeCommand(
      containerId,
      command,
    );
    this._logToProject(projectId, `[Результат]:\n${result}`);
    return result;
  }

  private buildStartPrompt(agent: AgentDocument, task: TaskDocument): string {
    return `
    СИСТЕМНЫЙ ПРОМПТ:
    Ты - автономный AI-агент. Твое имя: ${agent.name}.
    Твоя роль: ${agent.role}.
    Твои характеристики (матрица личности): ${JSON.stringify(agent.personalityMatrix, null, 2)}
    Ты работаешь внутри Docker-контейнера. Тебе доступны команды shell.
    Твоя цель - выполнить поставленную задачу.
    Отвечай всегда только в формате JSON вида {"command": "...", "args": ["...", "..."]}.

    ПОСТАВЛЕННАЯ ЗАДАЧА:
    Заголовок: ${task.title}
    Описание: ${task.description}

    Рабочая директория с кодом проекта находится в /app.
    С чего ты начнешь? Дай мне первую команду.
    `;
  }

  private _logToProject(projectId: string, message: string) {
    this.eventsGateway.sendToProjectRoom(projectId, 'agentLog', {
      message,
      timestamp: new Date(),
    });
  }

  private async updateTaskStatus(
    taskId: string,
    projectId: string,
    newStatus: TaskStatus,
  ) {
    await this.taskModel.updateOne({ _id: taskId }, { status: newStatus });
    this.eventsGateway.sendToProjectRoom(projectId, 'taskStatusUpdate', {
      taskId,
      newStatus,
    });
    this._logToProject(
      projectId,
      `[Статус]: Статус задачи изменен на ${newStatus}`,
    );
  }
}
