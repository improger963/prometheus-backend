import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Task, TaskDocument } from './schemas/task.schema';
import { UserDocument } from '../auth/schemas/user.schema';
import { CreateTaskDto } from './dto/create-task.dto';
import { Project, ProjectDocument } from '../projects/schemas/project.schema';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    @InjectModel(Task.name) private taskModel: Model<TaskDocument>,
    @InjectModel(Project.name) private projectModel: Model<ProjectDocument>,
    private eventEmitter: EventEmitter2,
  ) {}

  private async _verifyProjectOwnership(
    projectId: string,
    user: UserDocument,
  ): Promise<void> {
    const project = await this.projectModel.findOne({
      _id: projectId,
      user: user._id,
    });
    if (!project) {
      throw new NotFoundException(
        `Проект с ID "${projectId}" не найден или у вас нет к нему доступа.`,
      );
    }
  }

  async create(
    projectId: string,
    createTaskDto: CreateTaskDto,
    user: UserDocument,
  ): Promise<Task> {
    await this._verifyProjectOwnership(projectId, user);
    const { title, description, agentId } = createTaskDto;

    const newTask = new this.taskModel({
      title,
      description,
      assignee: agentId,
      project: projectId,
    });

    await newTask.save();
    this.logger.log(`Задача ${newTask._id} успешно сохранена в БД.`);
    this.logger.log(
      `Задача сохранена в БД. Документ: ${JSON.stringify(newTask, null, 2)}`,
    );

    // Генерируем событие
    this.eventEmitter.emit('task.created', {
      taskId: newTask._id.toString(),
      user,
    });
    this.logger.log(
      `Событие 'task.created' для задачи ${newTask._id} сгенерировано.`,
    );

    this.logger.log(
      `Событие 'task.created' сгенерировано для taskId: ${newTask._id.toString()}`,
    );

    return newTask;
  }

  async findAll(projectId: string, user: UserDocument): Promise<Task[]> {
    await this._verifyProjectOwnership(projectId, user);
    return this.taskModel.find({ project: projectId }).exec();
  }

  async findOne(
    projectId: string,
    taskId: string,
    user: UserDocument,
  ): Promise<Task> {
    await this._verifyProjectOwnership(projectId, user);
    const task = await this.taskModel.findOne({
      _id: taskId,
      project: projectId,
    });
    if (!task) {
      throw new NotFoundException(
        `Задача с ID "${taskId}" в проекте "${projectId}" не найдена.`,
      );
    }
    return task;
  }

  async update(
    projectId: string,
    taskId: string,
    updateTaskDto: Partial<CreateTaskDto>,
    user: UserDocument,
  ): Promise<Task> {
    await this._verifyProjectOwnership(projectId, user);
    const task = await this.taskModel.findOneAndUpdate(
      { _id: taskId, project: projectId },
      updateTaskDto,
      { new: true },
    );
    if (!task) {
      throw new NotFoundException(
        `Задача с ID "${taskId}" в проекте "${projectId}" не найдена.`,
      );
    }
    return task;
  }

  async remove(
    projectId: string,
    taskId: string,
    user: UserDocument,
  ): Promise<{ deleted: boolean; id: string }> {
    await this._verifyProjectOwnership(projectId, user);
    const result = await this.taskModel.deleteOne({
      _id: taskId,
      project: projectId,
    });
    if (result.deletedCount === 0) {
      throw new NotFoundException(
        `Задача с ID "${taskId}" в проекте "${projectId}" не найдена.`,
      );
    }
    return { deleted: true, id: taskId };
  }
}
