import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Agent } from '../entities/agent.entity';
import { Task } from 'src/tasks/entities/task.entity';


export interface TaskPerformance {
  executionTime: number; // in minutes
  complexity: 'low' | 'medium' | 'high' | 'critical';
  quality: number; // 1-10 scale
  userSatisfaction: number; // 1-5 scale
}

export interface ReputationRecord {
  agentId: string;
  taskId: string;
  rating: number;
  experience: number;
  feedback?: string;
  timestamp: Date;
}

@Injectable()
export class ReputationService {
  private readonly logger = new Logger(ReputationService.name);

  constructor(
    @InjectRepository(Agent)
    private agentsRepository: Repository<Agent>,
    @InjectRepository(Task)
    private tasksRepository: Repository<Task>,
  ) {}

  async rateTaskExecution(
    taskId: string,
    rating: number,
    feedback?: string,
  ): Promise<void> {
    const task = await this.tasksRepository.findOne({
      where: { id: taskId },
    });

    if (!task) {
      throw new NotFoundException(`Task with ID "${taskId}" not found.`);
    }

    // In the new multi-agent system, we rate all assigned agents
    if (task.assigneeIds && task.assigneeIds.length > 0) {
      for (const agentId of task.assigneeIds) {
        await this.updateAgentRating(agentId, rating, feedback);
        
        // Calculate experience gain based on rating and task complexity
        const xpGain = this.calculateExperienceGain(rating, task);
        await this.addExperience(agentId, xpGain);
        
        this.logger.log(
          `Agent ${agentId} rated ${rating}/5 for task ${taskId}, gained ${xpGain} XP`,
        );
      }
    }
  }

  async updateAgentRating(
    agentId: string,
    newRating: number,
    feedback?: string,
  ): Promise<void> {
    const agent = await this.agentsRepository.findOne({
      where: { id: agentId },
    });

    if (!agent) {
      throw new NotFoundException(`Agent with ID "${agentId}" not found.`);
    }

    // Calculate weighted average rating (give more weight to recent ratings)
    const currentRating = agent.rating || 0;
    const weightedRating = (currentRating * 0.8) + (newRating * 0.2);
    
    agent.rating = Math.round(weightedRating * 100) / 100; // Round to 2 decimal places
    await this.agentsRepository.save(agent);

    // Log the rating update
    this.logger.log(
      `Agent ${agentId} rating updated: ${currentRating} -> ${agent.rating}${feedback ? ` (${feedback})` : ''}`,
    );
  }

  async addExperience(agentId: string, xp: number): Promise<void> {
    const agent = await this.agentsRepository.findOne({
      where: { id: agentId },
    });

    if (!agent) {
      throw new NotFoundException(`Agent with ID "${agentId}" not found.`);
    }

    const oldXP = agent.experience || 0;
    agent.experience = oldXP + Math.max(0, Math.round(xp));
    await this.agentsRepository.save(agent);

    this.logger.log(`Agent ${agentId} gained ${xp} XP: ${oldXP} -> ${agent.experience}`);
  }

  private calculateExperienceGain(rating: number, task: Task): number {
    // Base XP calculation
    let baseXP = 10;

    // Rating multiplier (1-5 scale)
    const ratingMultiplier = Math.max(0.5, rating / 5);

    // Task complexity bonus (inferred from task description/title)
    let complexityMultiplier = 1;
    const description = (task.description || task.title || '').toLowerCase();
    
    if (description.includes('critical') || description.includes('urgent')) {
      complexityMultiplier = 2;
    } else if (description.includes('complex') || description.includes('advanced')) {
      complexityMultiplier = 1.5;
    } else if (description.includes('simple') || description.includes('basic')) {
      complexityMultiplier = 0.8;
    }

    // Priority bonus
    switch (task.priority) {
      case 'critical':
        complexityMultiplier *= 2;
        break;
      case 'high':
        complexityMultiplier *= 1.5;
        break;
      case 'medium':
        complexityMultiplier *= 1;
        break;
      case 'low':
        complexityMultiplier *= 0.8;
        break;
    }

    return Math.round(baseXP * ratingMultiplier * complexityMultiplier);
  }

  async calculateExperienceGainFromPerformance(
    task: Task,
    performance: TaskPerformance,
  ): Promise<number> {
    let baseXP = 15;

    // Execution time factor (faster = bonus, slower = penalty)
    const timeMultiplier = performance.executionTime < 30 ? 1.2 : 
                          performance.executionTime > 120 ? 0.8 : 1;

    // Complexity multiplier
    const complexityMultipliers = {
      low: 0.8,
      medium: 1,
      high: 1.5,
      critical: 2,
    };

    // Quality multiplier (1-10 scale)
    const qualityMultiplier = performance.quality / 10;

    // User satisfaction multiplier (1-5 scale)
    const satisfactionMultiplier = performance.userSatisfaction / 5;

    const totalXP = baseXP * 
      timeMultiplier * 
      complexityMultipliers[performance.complexity] * 
      qualityMultiplier * 
      satisfactionMultiplier;

    return Math.round(Math.max(1, totalXP));
  }

  async getAgentLeaderboard(limit: number = 10): Promise<Agent[]> {
    return this.agentsRepository.find({
      order: { 
        rating: 'DESC', 
        experience: 'DESC',
        createdAt: 'ASC',
      },
      take: limit,
    });
  }

  async getAgentRank(agentId: string): Promise<{
    rank: number;
    totalAgents: number;
    percentile: number;
  }> {
    const agent = await this.agentsRepository.findOne({
      where: { id: agentId },
    });

    if (!agent) {
      throw new NotFoundException(`Agent with ID "${agentId}" not found.`);
    }

    const [betterAgents, totalAgents] = await Promise.all([
      this.agentsRepository.count({
        where: [
          { rating: { $gt: agent.rating } },
          { 
            rating: agent.rating,
            experience: { $gt: agent.experience },
          },
        ] as any,
      }),
      this.agentsRepository.count(),
    ]);

    const rank = betterAgents + 1;
    const percentile = Math.round(((totalAgents - rank) / totalAgents) * 100);

    return { rank, totalAgents, percentile };
  }

  async getAgentStats(agentId: string): Promise<{
    rating: number;
    experience: number;
    level: number;
    nextLevelXP: number;
    rank: number;
    totalAgents: number;
    percentile: number;
  }> {
    const agent = await this.agentsRepository.findOne({
      where: { id: agentId },
    });

    if (!agent) {
      throw new NotFoundException(`Agent with ID "${agentId}" not found.`);
    }

    const { rank, totalAgents, percentile } = await this.getAgentRank(agentId);
    const level = this.calculateLevel(agent.experience);
    const nextLevelXP = this.getXPForLevel(level + 1) - agent.experience;

    return {
      rating: agent.rating,
      experience: agent.experience,
      level,
      nextLevelXP: Math.max(0, nextLevelXP),
      rank,
      totalAgents,
      percentile,
    };
  }

  private calculateLevel(experience: number): number {
    // Level formula: level = floor(sqrt(experience / 100))
    // Level 1: 0-99 XP, Level 2: 100-399 XP, Level 3: 400-899 XP, etc.
    return Math.floor(Math.sqrt(experience / 100)) + 1;
  }

  private getXPForLevel(level: number): number {
    // XP required for level: (level - 1)^2 * 100
    return Math.pow(level - 1, 2) * 100;
  }

  async promoteAgent(
    agentId: string,
    bonusXP: number,
    reason: string,
  ): Promise<void> {
    await this.addExperience(agentId, bonusXP);
    this.logger.log(`Agent ${agentId} promoted with ${bonusXP} bonus XP: ${reason}`);
  }

  async getTopPerformers(
    timeframe: 'day' | 'week' | 'month' = 'week',
    limit: number = 5,
  ): Promise<Agent[]> {
    // For now, return top agents by rating
    // In future, this could filter by recent performance in the timeframe
    return this.getAgentLeaderboard(limit);
  }
}