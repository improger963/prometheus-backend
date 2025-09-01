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
      throw new NotFoundException(`Project with ID "${projectId}" not found.`);
    }
    return project;
  }

  async create(
    projectId: string,
    createTaskDto: CreateTaskDto,
    user: User,
  ): Promise<Task> {
    const project = await this._getProjectIfOwned(projectId, user);

    // --- FIX ---
    // Create a base object for the new task
    const taskPayload: DeepPartial<Task> = {
      title: createTaskDto.title,
      description: createTaskDto.description,
      project: project,
    };

    // Conditionally add agent relationship only if agentId is provided
    if (createTaskDto.agentId) {
      taskPayload.assigneeIds = [createTaskDto.agentId];
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
    });
  }

  async findOne(projectId: string, taskId: string, user: User): Promise<Task> {
    await this._getProjectIfOwned(projectId, user);
    const task = await this.tasksRepository.findOne({
      where: { id: taskId, project: { id: projectId } },
    });
    if (!task) {
      throw new NotFoundException(`Task with ID "${taskId}" not found.`);
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
    
    // Handle agentId separately if provided
    if (updateTaskDto.agentId !== undefined) {
      if (updateTaskDto.agentId) {
        task.assigneeIds = [updateTaskDto.agentId];
      } else {
        task.assigneeIds = [];
      }
      // Remove agentId from the DTO since it's not a direct Task property
      const { agentId, ...taskUpdates } = updateTaskDto;
      Object.assign(task, taskUpdates);
    } else {
      Object.assign(task, updateTaskDto);
    }
    
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

  async findTaskById(taskId: string, user: User): Promise<Task | null> {
    const task = await this.tasksRepository.findOne({
      where: { id: taskId },
      relations: ['project'],
    });

    if (!task) {
      return null;
    }

    // Verify that the task belongs to a project owned by the user
    if (task.project.user.id !== user.id) {
      return null;
    }

    return task;
  }
}
