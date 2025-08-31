import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Agent } from './entities/agent.entity';
import { User } from '../auth/entities/user.entity';
import { CreateAgentDto } from './dto/create-agent.dto';
import { Project } from '../projects/entities/project.entity';

@Injectable()
export class AgentsService {
  constructor(
    @InjectRepository(Agent)
    private agentsRepository: Repository<Agent>,
    @InjectRepository(Project)
    private projectsRepository: Repository<Project>,
  ) {}

  // Вспомогательная функция для проверки, что проект принадлежит пользователю
  private async _getProjectIfOwned(
    projectId: string,
    user: User,
  ): Promise<Project> {
    const project = await this.projectsRepository.findOne({
      where: { id: projectId, user: { id: user.id } },
    });
    if (!project) {
      throw new NotFoundException(
        `Проект с ID "${projectId}" не найден или у вас нет к нему доступа.`,
      );
    }
    return project;
  }

  async create(
    projectId: string,
    createAgentDto: CreateAgentDto,
    user: User,
  ): Promise<Agent> {
    const project = await this._getProjectIfOwned(projectId, user);
    const newAgent = this.agentsRepository.create({
      ...createAgentDto,
      project: project, // <-- Привязываем агента к найденной сущности проекта
    });
    return this.agentsRepository.save(newAgent);
  }

  async findAll(projectId: string, user: User): Promise<Agent[]> {
    await this._getProjectIfOwned(projectId, user);
    return this.agentsRepository.find({
      where: { project: { id: projectId } },
    });
  }

  async findOne(
    projectId: string,
    agentId: string,
    user: User,
  ): Promise<Agent> {
    await this._getProjectIfOwned(projectId, user);
    const agent = await this.agentsRepository.findOne({
      where: { id: agentId, project: { id: projectId } },
    });
    if (!agent) {
      throw new NotFoundException(
        `Агент с ID "${agentId}" в проекте "${projectId}" не найден.`,
      );
    }
    return agent;
  }

  async update(
    projectId: string,
    agentId: string,
    updateAgentDto: Partial<CreateAgentDto>,
    user: User,
  ): Promise<Agent> {
    const agent = await this.findOne(projectId, agentId, user); // Проверка прав доступа
    Object.assign(agent, updateAgentDto);
    return this.agentsRepository.save(agent);
  }

  async remove(
    projectId: string,
    agentId: string,
    user: User,
  ): Promise<{ deleted: boolean; id: string }> {
    const agent = await this.findOne(projectId, agentId, user); // Проверка прав доступа
    await this.agentsRepository.remove(agent);
    return { deleted: true, id: agentId };
  }
}
