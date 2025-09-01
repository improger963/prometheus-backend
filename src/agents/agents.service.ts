import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Agent } from './entities/agent.entity';
import { User } from '../auth/entities/user.entity';
import { CreateAgentDto } from './dto/create-agent.dto';

@Injectable()
export class AgentsService {
  constructor(
    @InjectRepository(Agent)
    private agentsRepository: Repository<Agent>,
  ) {}

  // NEW: Global agent management methods
  async createGlobalAgent(
    userId: string,
    createAgentDto: CreateAgentDto,
  ): Promise<Agent> {
    const newAgent = this.agentsRepository.create({
      ...createAgentDto,
      user: { id: userId },
      rating: 0.0,
      experience: 0,
    });
    return this.agentsRepository.save(newAgent);
  }

  async getUserAgents(userId: string): Promise<Agent[]> {
    return this.agentsRepository.find({
      where: { user: { id: userId } },
      order: { createdAt: 'DESC' },
    });
  }

  async getAgentById(agentId: string, userId: string): Promise<Agent> {
    const agent = await this.agentsRepository.findOne({
      where: { id: agentId, user: { id: userId } },
    });
    if (!agent) {
      throw new NotFoundException(
        `Agent with ID "${agentId}" not found or you don't have access to it.`,
      );
    }
    return agent;
  }

  async updateAgent(
    agentId: string,
    userId: string,
    updateAgentDto: Partial<CreateAgentDto>,
  ): Promise<Agent> {
    const agent = await this.getAgentById(agentId, userId);
    Object.assign(agent, updateAgentDto);
    return this.agentsRepository.save(agent);
  }

  async deleteAgent(
    agentId: string,
    userId: string,
  ): Promise<{ deleted: boolean; id: string }> {
    const agent = await this.getAgentById(agentId, userId);
    await this.agentsRepository.remove(agent);
    return { deleted: true, id: agentId };
  }

  async updateAgentRating(agentId: string, rating: number): Promise<void> {
    await this.agentsRepository.update(agentId, { rating });
  }

  async addExperience(agentId: string, xp: number): Promise<void> {
    const agent = await this.agentsRepository.findOne({
      where: { id: agentId },
    });
    if (agent) {
      agent.experience += xp;
      await this.agentsRepository.save(agent);
    }
  }

  async getAgentLeaderboard(limit: number = 10): Promise<Agent[]> {
    return this.agentsRepository.find({
      order: { rating: 'DESC', experience: 'DESC' },
      take: limit,
    });
  }

  // Helper method for project team management
  async validateAgentOwnership(
    agentId: string,
    userId: string,
  ): Promise<boolean> {
    const agent = await this.agentsRepository.findOne({
      where: { id: agentId, user: { id: userId } },
    });
    return !!agent;
  }
}
