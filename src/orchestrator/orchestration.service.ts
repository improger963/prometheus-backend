import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DockerManagerService } from './docker-manager.service';
import { EventsGateway } from './events.gateway';
import { Task, TaskDocument, TaskStatus } from '../tasks/schemas/task.schema';
import { UserDocument } from '../auth/schemas/user.schema';
import { ProjectDocument, Project } from 'src/projects/schemas/project.schema';

@Injectable()
export class OrchestrationService {
  private readonly logger = new Logger(OrchestrationService.name);

  constructor(
    private readonly dockerManager: DockerManagerService,
    private readonly eventsGateway: EventsGateway,
    @InjectModel(Task.name) private taskModel: Model<TaskDocument>,
    @InjectModel(Project.name) private projectModel: Model<ProjectDocument>,
  ) {}

  // Главный метод, запускающий выполнение задачи
  async startTaskExecution(taskId: string, user: UserDocument): Promise<void> {
    this.logger.log(`Получен запрос на запуск задачи ${taskId}`);

    // 1. Найти задачу и связанный с ней проект, проверить права доступа
    const task = await this.taskModel.findById(taskId).populate('project');
    if (!task) {
      throw new NotFoundException(`Задача с ID ${taskId} не найдена.`);
    }
    const project = task.project as unknown as ProjectDocument;
    if (project.user.toString() !== user._id.toString()) {
      throw new NotFoundException(
        `Задача с ID ${taskId} не найдена (проверка прав доступа).`,
      );
    }

    const projectId = project._id.toString();
    this._logToProject(
      projectId,
      `[Оркестратор]: Начинаю выполнение задачи "${task.title}"...`,
    );

    let containerId: string | null = null;
    try {
      // 2. Обновить статус задачи на IN_PROGRESS
      await this.updateTaskStatus(taskId, projectId, TaskStatus.IN_PROGRESS);

      // 3. Создать Docker-контейнер
      this._logToProject(
        projectId,
        `[Docker]: Создаю изолированную среду (контейнер)...`,
      );
      containerId =
        await this.dockerManager.createAndStartContainer('ubuntu:latest');
      this._logToProject(
        projectId,
        `[Docker]: Среда создана. ID контейнера: ${containerId.substring(0, 12)}`,
      );

      // 4. Выполнить последовательность команд
      // Сначала установим git
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

      // Теперь клонируем репозиторий
      await this.executeAndLogCommand(containerId, projectId, [
        'git',
        'clone',
        project.gitRepositoryURL,
        '/app',
      ]);

      // Посмотрим, что получилось
      await this.executeAndLogCommand(containerId, projectId, [
        'ls',
        '-la',
        '/app',
      ]);

      // 5. Обновить статус задачи на COMPLETED
      this._logToProject(
        projectId,
        `[Оркестратор]: Задача "${task.title}" успешно выполнена.`,
      );
      await this.updateTaskStatus(taskId, projectId, TaskStatus.COMPLETED);
    } catch (error) {
      this.logger.error(`Ошибка при выполнении задачи ${taskId}:`, error);
      this._logToProject(
        projectId,
        `[Оркестратор]: КРИТИЧЕСКАЯ ОШИБКА: ${error.message}`,
      );
      // 6. В случае ошибки обновить статус на FAILED
      await this.updateTaskStatus(taskId, projectId, TaskStatus.FAILED);
      throw new InternalServerErrorException(error.message);
    } finally {
      // 7. ОБЯЗАТЕЛЬНО: Очистить ресурсы (удалить контейнер)
      if (containerId) {
        this._logToProject(
          projectId,
          `[Docker]: Уничтожаю изолированную среду...`,
        );
        await this.dockerManager.stopAndRemoveContainer(containerId);
        this._logToProject(projectId, `[Docker]: Среда уничтожена.`);
      }
    }
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
