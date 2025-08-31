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
        `Задача ${taskId} не найдена или не имеет полного набора данных (проект/исполнитель).`,
      );
      if (task && task.project) {
        this._logToProject(
          task.project.id,
          `[Оркестратор]: Ошибка! Задача или назначенный агент не найдены.`,
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
      this._logToProject(
        projectId,
        `[Docker]: Создаю среду на базе образа "${project.baseDockerImage}"...`,
        agentId,
        agentName,
      );
      containerId = await this.dockerManager.createAndStartContainer(
        project.baseDockerImage,
      );
      this._logToProject(
        projectId,
        `[Docker]: Среда создана. ID: ${containerId.substring(0, 12)}`,
        agentId,
        agentName,
      );

      await this.executeAndLogCommand(
        containerId,
        projectId,
        ['apt-get', 'update'],
        agentId,
        agentName,
      );
      await this.executeAndLogCommand(
        containerId,
        projectId,
        ['apt-get', 'install', '-y', 'git'],
        agentId,
        agentName,
      );
      await this.executeAndLogCommand(
        containerId,
        projectId,
        ['git', 'clone', project.gitRepositoryURL, '/app'],
        agentId,
        agentName,
      );

      // --- НАЧАЛО ОПТИМИЗИРОВАННОГО ЦИКЛА ---
      let summarizedHistory = `КОНТЕКСТ: Ты находишься в Git-репозитории в /app.`;
      let turnHistory: string[] = [];
      let maxIterations = 15;

      while (maxIterations > 0) {
        maxIterations--;

        const currentPrompt = this.buildIterativePrompt(
          assignee,
          task,
          summarizedHistory,
        );

        this._logToProject(
          projectId,
          `[Оркестратор]: Обращаюсь к LLM...`,
          agentId,
          agentName,
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

        let turnResult: string;
        try {
          const commandResult = await this.executeAndLogCommand(
            containerId,
            projectId,
            [llmResponse.command, ...llmResponse.args],
            agentId,
            agentName,
          );
          const truncatedResult =
            commandResult.length > 2000
              ? commandResult.substring(0, 2000) + '\n... (вывод обрезан)'
              : commandResult;
          turnResult = `ПРЕДЫДУЩЕЕ ДЕЙСТВИЕ (УСПЕХ):\n- Команда: "${llmResponse.command} ${llmResponse.args.join(' ')}"\n- Вывод:\n\`\`\`\n${truncatedResult}\n\`\`\``;
        } catch (error) {
          turnResult = `ПРЕДЫДУЩЕЕ ДЕЙСТВИЕ (ОШИБКА):\n- Команда: "${llmResponse.command} ${llmResponse.args.join(' ')}"\n- Ошибка:\n\`\`\`\n${error.message}\n\`\`\``;
        }

        turnHistory.push(turnResult);

        if (turnHistory.length >= 3) {
          this._logToProject(
            projectId,
            `[Оркестратор]: Контекст разросся. Запускаю суммаризацию...`,
            agentId,
            agentName,
          );
          summarizedHistory = await this._summarizeHistory(
            assignee,
            task,
            summarizedHistory,
            turnHistory,
          );
          turnHistory = [];
          this._logToProject(
            projectId,
            `[Оркестратор]: Контекст сжат. Новое саммари:\n${summarizedHistory}`,
            agentId,
            agentName,
          );
        } else {
          summarizedHistory += `\n\n` + turnResult;
        }
      } // --- КОНЕЦ ЦИКЛА ---

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

  private async _summarizeHistory(
    agent: Agent,
    task: Task,
    oldSummary: string,
    turnsToSummarize: string[],
  ): Promise<string> {
    const summarizationPrompt = `
      Твоя задача - обновить саммари диалога.
      ПРЕДЫДУЩЕЕ САММАРИ:
      ${oldSummary}

      ПОСЛЕДНИЕ ДЕЙСТВИЯ (которые нужно добавить в саммари):
      ${turnsToSummarize.join('\n\n')}

      ОБНОВИ САММАРИ: Перепиши его, включив новые факты из последних действий. Сохрани только ключевые выводы и состояние. Будь краток. Верни только текст нового саммари.
      `;

    // Создаем временную "личность" агента для задачи суммаризации
    const summarizerAgent: Agent = {
      ...agent,
      llmConfig: { provider: 'groq', model: 'llama3-8b-8192' },
    };

    // Мы ожидаем текстовый ответ, а не JSON
    const response = await this.llmMultiplexer.generate(
      summarizerAgent,
      summarizationPrompt,
    );

    // LLM может вернуть саммари в поле `thought`. Это наша лучшая эвристика.
    return response.thought;
  }

  private buildIterativePrompt(
    agent: Agent,
    task: Task,
    history: string,
  ): string {
    return `
    SYSTEM PROMPT: Ты - AI-агент. Твой ответ - ВСЕГДА ТОЛЬКО JSON.
    ФОРМАТ: {"thought": "моя мысль", "command": "команда", "args": ["аргумент"], "finished": false}
    ГЛОБАЛЬНАЯ ЗАДАЧА: "${task.title}: ${task.description}"
    
    ИСТОРИЯ И КОНТЕКСТ:
    ${history}

    ТВОЙ СЛЕДУЮЩИЙ ШАГ В ФОРМАТЕ JSON:`;
  }

  private async executeAndLogCommand(
    containerId: string,
    projectId: string,
    command: string[],
    agentId: string,
    agentName: string,
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
