import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Task } from './entities/task.entity';
import { User } from '../auth/entities/user.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { Project } from '../projects/entities/project.entity';
import { DeepPartial } from 'typeorm'; // Импортируем для ясности

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private tasksRepository: Repository<Task>,
    @InjectRepository(Project)
    private projectsRepository: Repository<Project>,
    private eventEmitter: EventEmitter2,
  ) {}

  private async _getProjectIfOwned(
    projectId: string,
    user: User,
  ): Promise<Project> {
    const project = await this.projectsRepository.findOne({
      where: { id: projectId, user: { id: user.id } },
    });
    if (!project) {
      throw new NotFoundException(`Проект с ID "${projectId}" не найден.`);
    }
    return project;
  }

  async create(
    projectId: string,
    createTaskDto: CreateTaskDto,
    user: User,
  ): Promise<Task> {
    const project = await this._getProjectIfOwned(projectId, user);

    // --- ИСПРАВЛЕНИЕ ---
    // Создаем базовый объект для новой задачи
    const taskPayload: DeepPartial<Task> = {
      title: createTaskDto.title,
      description: createTaskDto.description,
      project: project,
    };

    // Условно добавляем связь с агентом, только если agentId предоставлен
    if (createTaskDto.agentId) {
      taskPayload.assignee = { id: createTaskDto.agentId };
    }

    const newTask = this.tasksRepository.create(taskPayload);
    // -----------------

    await this.tasksRepository.save(newTask);

    this.eventEmitter.emit('task.created', {
      taskId: newTask.id,
    });

    return newTask;
  }

  async findAll(projectId: string, user: User): Promise<Task[]> {
    await this._getProjectIfOwned(projectId, user);
    return this.tasksRepository.find({
      where: { project: { id: projectId } },
      relations: ['assignee'],
    });
  }

  async findOne(projectId: string, taskId: string, user: User): Promise<Task> {
    await this._getProjectIfOwned(projectId, user);
    const task = await this.tasksRepository.findOne({
      where: { id: taskId, project: { id: projectId } },
      relations: ['assignee'],
    });
    if (!task) {
      throw new NotFoundException(`Задача с ID "${taskId}" не найдена.`);
    }
    return task;
  }

  async update(
    projectId: string,
    taskId: string,
    updateTaskDto: Partial<CreateTaskDto>,
    user: User,
  ): Promise<Task> {
    const task = await this.findOne(projectId, taskId, user);
    Object.assign(task, updateTaskDto);
    return this.tasksRepository.save(task);
  }

  async remove(
    projectId: string,
    taskId: string,
    user: User,
  ): Promise<{ deleted: boolean; id: string }> {
    const task = await this.findOne(projectId, taskId, user);
    await this.tasksRepository.remove(task);
    return { deleted: true, id: taskId };
  }
}
