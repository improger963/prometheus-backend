import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { OnEvent } from '@nestjs/event-emitter';
import { DockerManagerService } from './docker-manager.service';
import { EventsGateway } from './events.gateway';
import { Task, TaskDocument, TaskStatus } from '../tasks/schemas/task.schema';
import { UserDocument } from '../auth/schemas/user.schema';
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
  async handleTaskCreated(payload: { taskId: string; user: UserDocument }) {
    this.logger.log(
      `Перехвачено событие 'task.created' для задачи: ${payload.taskId}`,
    );
    this.startTaskExecution(payload.taskId);
  }

  // Убираем user, т.к. проверка прав уже прошла в TasksService при создании
  async startTaskExecution(taskId: string): Promise<void> {
    // --- ГЛАВНОЕ ИСПРАВЛЕНИЕ: Убеждаемся, что populate использует правильные имена полей из схемы ---
    const task = await this.taskModel
      .findById(taskId)
      .populate<{
        project: ProjectDocument;
        agent: AgentDocument;
      }>(['project', 'agent']);

    if (!task || !task.project || !task.agent) {
      this.logger.error(
        `Задача ${taskId} не найдена или не имеет полного набора данных (проект/агент).`,
      );
      if (task && task.project) {
        const projectId = (task.project as ProjectDocument)._id.toString();
        this._logToProject(
          projectId,
          `[Оркестратор]: Ошибка! Не удалось запустить задачу. Задача или назначенный агент не найдены.`,
        );
        await this.updateTaskStatus(taskId, projectId, TaskStatus.FAILED);
      }
      return;
    }

    const { project, agent } = task;
    const projectId = project._id.toString();

    // --- УЛУЧШЕННОЕ ЛОГИРОВАНИЕ: Прозрачность системы ---
    this.logger.log(
      `[ОРКЕСТРАТОР] Запускаю задачу: "${task.title}" в проекте "${project.name}" для агента "${agent.name}"`,
    );

    this._logToProject(
      projectId,
      `[Оркестратор]: Принял задачу "${task.title}" в работу. Исполнитель: агент "${agent.name}".`,
    );

    let containerId: string | null = null;

    // --- БЕЗОПАСНЫЙ ЦИКЛ ---
    try {
      await this.updateTaskStatus(taskId, projectId, TaskStatus.IN_PROGRESS);
      this._logToProject(projectId, `[Docker]: Создаю изолированную среду...`);
      containerId =
        await this.dockerManager.createAndStartContainer('ubuntu:latest');
      this._logToProject(
        projectId,
        `[Docker]: Среда создана. ID: ${containerId.substring(0, 12)}`,
      );

      await this.executeAndLogCommand(containerId, projectId, [
        'apt-get',
        'update',
      ]);
      await this.executeAndLogCommand(containerId, projectId, [
        'apt-get',
        'install',
        '-y',
        'git',
      ]);
      await this.executeAndLogCommand(containerId, projectId, [
        'git',
        'clone',
        project.gitRepositoryURL,
        '/app',
      ]);

      const startPrompt = this.buildStartPrompt(agent, task);
      this._logToProject(
        projectId,
        `[LLM]: Формирую стартовый промпт для агента "${agent.name}"...`,
      );

      const llmResponse = await this.llmManager.generateCommand(startPrompt);

      await this.executeAndLogCommand(containerId, projectId, [
        llmResponse.command,
        ...llmResponse.args,
      ]);

      this._logToProject(
        projectId,
        `[Оркестратор]: Первая фаза задачи "${task.title}" успешно выполнена.`,
      );
      await this.updateTaskStatus(taskId, projectId, TaskStatus.COMPLETED);
    } catch (error) {
      // Улучшенный вывод ошибки
      this.logger.error(
        `КРИТИЧЕСКАЯ ОШИБКА при выполнении задачи ${taskId}:`,
        error,
      );
      this._logToProject(
        projectId,
        `[Оркестратор]: КРИТИЧЕСКАЯ ОШИБКА: ${error.message || 'Неизвестная ошибка выполнения'}`,
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
  // --- Вспомогательные методы ---

  private async executeAndLogCommand(
    containerId: string,
    projectId: string,
    command: string[],
  ): Promise<void> {
    this._logToProject(projectId, `[Команда]: Выполняю > ${command.join(' ')}`);
    const result = await this.dockerManager.executeCommand(
      containerId,
      command,
    );
    this._logToProject(projectId, `[Результат]:\n${result}`);
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
