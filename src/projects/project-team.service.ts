import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from './entities/project.entity';
import { Agent } from '../agents/entities/agent.entity';
import { AgentsService } from '../agents/agents.service';

@Injectable()
export class ProjectTeamService {
  constructor(
    @InjectRepository(Project)
    private projectsRepository: Repository<Project>,
    @InjectRepository(Agent)
    private agentsRepository: Repository<Agent>,
    private agentsService: AgentsService,
  ) {}

  async inviteAgentToProject(
    projectId: string,
    agentId: string,
    userId: string,
  ): Promise<{ success: boolean; message: string }> {
    // Verify project ownership
    const project = await this.projectsRepository.findOne({
      where: { id: projectId, user: { id: userId } },
    });
    if (!project) {
      throw new NotFoundException(
        `Проект с ID "${projectId}" не найден или у вас нет к нему доступа.`,
      );
    }

    // Verify agent ownership
    const isOwner = await this.agentsService.validateAgentOwnership(
      agentId,
      userId,
    );
    if (!isOwner) {
      throw new NotFoundException(
        `Агент с ID "${agentId}" не найден или у вас нет к нему доступа.`,
      );
    }

    // Check if agent is already in project
    if (project.agentIds.includes(agentId)) {
      throw new BadRequestException(
        `Агент уже находится в команде проекта "${project.name}".`,
      );
    }

    // Add agent to project team
    project.agentIds.push(agentId);
    await this.projectsRepository.save(project);

    return {
      success: true,
      message: `Агент успешно добавлен в команду проекта "${project.name}".`,
    };
  }

  async removeAgentFromProject(
    projectId: string,
    agentId: string,
    userId: string,
  ): Promise<{ success: boolean; message: string }> {
    // Verify project ownership
    const project = await this.projectsRepository.findOne({
      where: { id: projectId, user: { id: userId } },
    });
    if (!project) {
      throw new NotFoundException(
        `Проект с ID "${projectId}" не найден или у вас нет к нему доступа.`,
      );
    }

    // Check if agent is in project
    if (!project.agentIds.includes(agentId)) {
      throw new BadRequestException(
        `Агент не найден в команде проекта "${project.name}".`,
      );
    }

    // Remove agent from project team
    project.agentIds = project.agentIds.filter((id) => id !== agentId);
    await this.projectsRepository.save(project);

    return {
      success: true,
      message: `Агент успешно удален из команды проекта "${project.name}".`,
    };
  }

  async getProjectTeam(
    projectId: string,
    userId: string,
  ): Promise<Agent[]> {
    // Verify project ownership
    const project = await this.projectsRepository.findOne({
      where: { id: projectId, user: { id: userId } },
    });
    if (!project) {
      throw new NotFoundException(
        `Проект с ID "${projectId}" не найден или у вас нет к нему доступа.`,
      );
    }

    // Get all agents in project team
    if (project.agentIds.length === 0) {
      return [];
    }

    return this.agentsRepository.findByIds(project.agentIds);
  }

  async validateAgentAccess(
    agentId: string,
    projectId: string,
  ): Promise<boolean> {
    const project = await this.projectsRepository.findOne({
      where: { id: projectId },
    });
    return project?.agentIds.includes(agentId) || false;
  }
}