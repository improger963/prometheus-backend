import { Injectable, Logger } from '@nestjs/common';
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

  // Шаг 1: Слушатель
  @OnEvent('task.created')
  handleTaskCreated(payload: { taskId: string; user: UserDocument }) {
    this.logger.log(
      `Перехвачено событие 'task.created' для задачи: ${payload.taskId}`,
    );
    // Запускаем главный цикл без ожидания (в фоновом режиме)
    this.startTaskExecution(payload.taskId);
  }

  // Шаг 2: Инициация и Подготовка
  async startTaskExecution(taskId: string): Promise<void> {
    const task = await this.taskModel
      .findById(taskId)
      .populate<{
        project: ProjectDocument;
        assignee: AgentDocument;
      }>(['project', 'assignee']);

    // Проверка (Guard Clause)
    if (!task || !task.project || !task.assignee) {
      this.logger.error(
        `Задача ${taskId} не найдена или не имеет полного набора данных (проект/исполнитель).`,
      );
      if (task) {
        await this.updateTaskStatus(
          task._id.toString(),
          (task.project as ProjectDocument)?._id.toString(),
          TaskStatus.FAILED,
        );
      }
      return;
    }

    const { project, assignee } = task;
    const projectId = project._id.toString();

    // Логирование
    const initialLog = `[ОРКЕСТРАТОР] Запускаю задачу: "${task.title}" в проекте "${project.name}" для агента "${assignee.name}"`;
    this.logger.log(initialLog);
    this._logToProject(projectId, initialLog);

    let containerId: string | null = null;

    // Блок try...catch...finally
    try {
      // Шаг 3: Исполнение
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

      const startPrompt = this.buildStartPrompt(assignee, task);
      const llmResponse = await this.llmManager.generateCommand(startPrompt);

      this._logToProject(
        projectId,
        `[Агент]: Выполняю команду > ${llmResponse.command} ${llmResponse.args.join(' ')}`,
      );
      await this.executeAndLogCommand(containerId, projectId, [
        llmResponse.command,
        ...llmResponse.args,
      ]);

      this._logToProject(
        projectId,
        `[Оркестратор]: Задача "${task.title}" успешно выполнена.`,
      );
      await this.updateTaskStatus(taskId, projectId, TaskStatus.COMPLETED);
    } catch (error) {
      // Шаг 4: Обработка Ошибок
      this.logger.error(
        `КРИТИЧЕСКАЯ ОШИБКА при выполнении задачи ${taskId}:`,
        error,
      );
      this._logToProject(
        projectId,
        `[Оркестратор]: КРИТИЧЕСКАЯ ОШИБКА: ${error.message}`,
      );
      await this.updateTaskStatus(taskId, projectId, TaskStatus.FAILED);
    } finally {
      // Шаг 5: Очистка
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
