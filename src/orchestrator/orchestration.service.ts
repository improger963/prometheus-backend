import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OnEvent } from '@nestjs/event-emitter';
import {
  DockerConnectionError,
  DockerManagerService,
  ImagePullError,
} from './docker-manager.service';
import { EventsGateway } from './events.gateway';
import { Task, TaskStatus } from '../tasks/entities/task.entity';
import { LlmMultiplexerService } from './llm-multiplexer.service';
import { Agent } from 'src/agents/entities/agent.entity';
import { Project } from 'src/projects/entities/project.entity';

@Injectable()
export class OrchestrationService {
  private readonly logger = new Logger(OrchestrationService.name);

  constructor(
    private readonly dockerManager: DockerManagerService,
    private readonly eventsGateway: EventsGateway,
    private readonly llmMultiplexer: LlmMultiplexerService,
    @InjectRepository(Task)
    private tasksRepository: Repository<Task>,
  ) {}

  @OnEvent('task.created')
  async handleTaskCreated(payload: { taskId: string }) {
    this.logger.log(
      `Перехвачено событие 'task.created' для задачи: ${payload.taskId}`,
    );
    this.startTaskExecution(payload.taskId);
  }

  async startTaskExecution(taskId: string): Promise<void> {
    const task = await this.tasksRepository.findOne({
      where: { id: taskId },
      relations: ['project', 'assignee'],
    });

    if (!task || !task.project || !task.assignee) {
      this.logger.error(
        `Задача ${taskId} не найдена или не имеет полного набора данных.`,
      );
      if (task && task.project) {
        this._logToProject(
          task.project.id,
          `[Оркестратор]: Ошибка! Задача или агент не найдены.`,
          'system',
          'System',
        );
        await this.updateTaskStatus(
          taskId,
          task.project.id,
          TaskStatus.FAILED,
          'system',
          'System',
        );
      }
      return;
    }

    const { project, assignee } = task;
    const projectId = project.id;
    const agentName = assignee.name;
    const agentId = assignee.id;

    this.logger.log(
      `[ОРКЕСТРАТОР] Запускаю задачу: "${task.title}" в проекте "${project.name}" для агента "${agentName}"`,
    );
    this._logToProject(
      projectId,
      `[Оркестратор]: Принял задачу "${task.title}" в работу.`,
      agentId,
      agentName,
    );

    let containerId: string | null = null;

    try {
      await this.updateTaskStatus(
        taskId,
        projectId,
        TaskStatus.IN_PROGRESS,
        agentId,
        agentName,
      );

      const envVars = project.gitAccessToken
        ? [`GIT_ACCESS_TOKEN=${project.gitAccessToken}`]
        : [];
      containerId = await this.dockerManager.createAndStartContainer(
        project.baseDockerImage,
        envVars,
      );
      this._logToProject(
        projectId,
        `[Docker]: Среда создана. ID: ${containerId.substring(0, 12)}`,
        agentId,
        agentName,
      );

      // --- ФАЗА 1: ПОДГОТОВКА СРЕДЫ (в корне '/') ---
      this._logToProject(
        projectId,
        `[Docker]: Подготовка среды...`,
        agentId,
        agentName,
      );
      await this.executeAndLogCommand(
        containerId,
        projectId,
        ['apt-get', 'update'],
        agentId,
        agentName,
        null,
      );
      await this.executeAndLogCommand(
        containerId,
        projectId,
        ['apt-get', 'install', '-y', 'git'],
        agentId,
        agentName,
        null,
      );

      const repoUrl = new URL(project.gitRepositoryURL);
      if (project.gitAccessToken) {
        repoUrl.username = project.gitAccessToken;
      }
      await this.executeAndLogCommand(
        containerId,
        projectId,
        ['git', 'clone', repoUrl.toString(), '/app'],
        agentId,
        agentName,
        null,
      );

      await this.executeAndLogCommand(
        containerId,
        projectId,
        ['git', '-C', '/app', 'config', 'user.name', `"${agentName}"`],
        agentId,
        agentName,
        null,
      );
      await this.executeAndLogCommand(
        containerId,
        projectId,
        [
          'git',
          '-C',
          '/app',
          'config',
          'user.email',
          `"${agentId}@prometheus.dev"`,
        ],
        agentId,
        agentName,
        null,
      );

      // --- ФАЗА 2: РАБОТА АГЕНТА (в '/app') ---
      let history = `КОНТЕКСТ: Ты находишься в Git-репозитории в /app. Твой первый шаг?`;
      let maxIterations = 15;

      while (maxIterations > 0) {
        maxIterations--;

        const currentPrompt = this.buildIterativePrompt(
          assignee,
          task,
          history,
        );
        const llmResponse = await this.llmMultiplexer.generate(
          assignee,
          currentPrompt,
        );
        this._logToProject(
          projectId,
          `[Мысль]: ${llmResponse.thought}`,
          agentId,
          agentName,
        );

        if (llmResponse.finished || !llmResponse.command) {
          this._logToProject(
            projectId,
            `[Оркестратор]: Агент считает, что задача выполнена.`,
            agentId,
            agentName,
          );
          break;
        }

        try {
          const commandResult = await this.executeAndLogCommand(
            containerId,
            projectId,
            [llmResponse.command, ...llmResponse.args],
            agentId,
            agentName,
            '/app',
          );
          history = `ПРЕДЫДУЩЕЕ ДЕЙСТВИЕ (УСПЕХ):\n- Команда: "${llmResponse.command} ${llmResponse.args.join(' ')}"\n- Вывод:\n\`\`\`\n${commandResult || '(пустой вывод)'}\n\`\`\``;
        } catch (error) {
          history = `ПРЕДЫДУЩЕЕ ДЕЙСТВИЕ (ОШИБКА):\n- Команда: "${llmResponse.command} ${llmResponse.args.join(' ')}"\n- Ошибка:\n\`\`\`\n${error.message}\n\`\`\``;
        }
      }

      if (maxIterations <= 0) {
        this._logToProject(
          projectId,
          `[Оркестратор]: Превышен лимит итераций.`,
          agentId,
          agentName,
        );
      }

      await this.updateTaskStatus(
        taskId,
        projectId,
        TaskStatus.COMPLETED,
        agentId,
        agentName,
      );
    } catch (error) {
      this.logger.error(`КРИТИЧЕСКАЯ ОШИБКА в задаче ${taskId}:`, error);
      let userFriendlyMessage = `[Оркестратор]: КРИТИЧЕСКАЯ ОШИБКА: ${error.message}`;
      if (error instanceof DockerConnectionError) {
        /* ... */
      }
      this._logToProject(projectId, userFriendlyMessage, agentId, agentName);
      await this.updateTaskStatus(
        taskId,
        projectId,
        TaskStatus.FAILED,
        agentId,
        agentName,
      );
    } finally {
      if (containerId) {
        this._logToProject(
          projectId,
          `[Docker]: Уничтожаю среду...`,
          agentId,
          agentName,
        );
        await this.dockerManager.stopAndRemoveContainer(containerId);
        this._logToProject(
          projectId,
          `[Docker]: Среда уничтожена.`,
          agentId,
          agentName,
        );
      }
    }
  }

  private buildIterativePrompt(
    agent: Agent,
    task: Task,
    history: string,
  ): string {
    return `
    SYSTEM PROMPT: Ты - автономный AI-агент-разработчик.
    ТВОЯ РОЛЬ: ${agent.role}.
    ПРАВИЛА:
    1. Ты работаешь в shell в директории /app, которая является Git-репозиторием.
    2. Твой ответ ВСЕГДА должен быть ТОЛЬКО JSON-объектом.
    3. Финальным шагом твоей работы **обязательно** должен быть git push.
    4. Когда задача полностью выполнена (включая git push), "finished" должно быть true.

    СТРОГИЙ ФОРМАТ ОТВЕТА:
    {"thought": "Моя мысль.", "command": "команда", "args": ["аргумент"], "finished": false}
    
    ГЛОБАЛЬНАЯ ЗАДАЧА: "${task.title}: ${task.description}"
    
    ИСТОРИЯ ДЕЙСТВИЙ И КОНТЕКСТ:
    ${history}

    ТВОЙ СЛЕДУЮЩИЙ ШАГ В ФОРМАТЕ JSON:`;
  }

  private async executeAndLogCommand(
    containerId: string,
    projectId: string,
    command: string[],
    agentId: string,
    agentName: string,
    workingDir: string | null = null,
  ): Promise<string> {
    this._logToProject(
      projectId,
      `[Команда]: ${command.join(' ')}`,
      agentId,
      agentName,
    );
    const result = await this.dockerManager.executeCommand(
      containerId,
      command,
      workingDir,
    );
    this._logToProject(
      projectId,
      `[Результат]:\n${result}`,
      agentId,
      agentName,
    );
    return result;
  }

  private _logToProject(
    projectId: string,
    message: string,
    agentId: string,
    agentName: string,
  ) {
    this.eventsGateway.sendToProjectRoom(projectId, 'agentLog', {
      message,
      agentId,
      agentName,
      timestamp: new Date(),
    });
  }

  private async updateTaskStatus(
    taskId: string,
    projectId: string,
    newStatus: TaskStatus,
    agentId: string,
    agentName: string,
  ) {
    await this.tasksRepository.update(taskId, { status: newStatus });
    this.eventsGateway.sendToProjectRoom(projectId, 'taskStatusUpdate', {
      taskId,
      newStatus,
      agentId,
      agentName,
    });
    this._logToProject(
      projectId,
      `[Статус]: Статус задачи изменен на ${newStatus}`,
      agentId,
      agentName,
    );
  }
}
