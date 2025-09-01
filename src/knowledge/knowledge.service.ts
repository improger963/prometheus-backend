import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, In } from 'typeorm';
import { KnowledgeRecord } from './entities/knowledge-record.entity';
import { CreateKnowledgeDto } from './dto/create-knowledge.dto';
import { Agent } from '../agents/entities/agent.entity';

@Injectable()
export class KnowledgeService {
  constructor(
    @InjectRepository(KnowledgeRecord)
    private knowledgeRepository: Repository<KnowledgeRecord>,
    @InjectRepository(Agent)
    private agentsRepository: Repository<Agent>,
  ) {}

  async createKnowledgeRecord(
    userId: string,
    createKnowledgeDto: CreateKnowledgeDto,
  ): Promise<KnowledgeRecord> {
    const knowledgeRecord = this.knowledgeRepository.create({
      ...createKnowledgeDto,
      user: { id: userId },
      useCount: 0,
      rating: 0.0,
      ratingCount: 0,
    });

    return this.knowledgeRepository.save(knowledgeRecord);
  }

  async findAll(
    userId: string,
    page: number = 1,
    limit: number = 10,
    category?: string,
    search?: string,
  ): Promise<{
    records: KnowledgeRecord[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const queryBuilder = this.knowledgeRepository
      .createQueryBuilder('knowledge')
      .where('knowledge.visibility = :visibility OR knowledge.userId = :userId', {
        visibility: 'public',
        userId,
      });

    if (category) {
      queryBuilder.andWhere('knowledge.category = :category', { category });
    }

    if (search) {
      queryBuilder.andWhere(
        '(knowledge.title ILIKE :search OR knowledge.content ILIKE :search OR knowledge.tags ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    const [records, total] = await queryBuilder
      .orderBy('knowledge.updatedAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      records,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string, userId: string): Promise<KnowledgeRecord> {
    const record = await this.knowledgeRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!record) {
      throw new NotFoundException(`Knowledge record with ID "${id}" not found.`);
    }

    // Check access permissions
    if (record.visibility === 'private' && record.user.id !== userId) {
      throw new ForbiddenException('You do not have access to this knowledge record.');
    }

    // Increment use count
    record.useCount += 1;
    await this.knowledgeRepository.save(record);

    return record;
  }

  async update(
    id: string,
    userId: string,
    updateData: Partial<CreateKnowledgeDto>,
  ): Promise<KnowledgeRecord> {
    const record = await this.knowledgeRepository.findOne({
      where: { id, user: { id: userId } },
    });

    if (!record) {
      throw new NotFoundException(
        `Knowledge record with ID "${id}" not found or you don't have permission to update it.`,
      );
    }

    Object.assign(record, updateData);
    return this.knowledgeRepository.save(record);
  }

  async remove(id: string, userId: string): Promise<{ deleted: boolean; id: string }> {
    const record = await this.knowledgeRepository.findOne({
      where: { id, user: { id: userId } },
    });

    if (!record) {
      throw new NotFoundException(
        `Knowledge record with ID "${id}" not found or you don't have permission to delete it.`,
      );
    }

    await this.knowledgeRepository.remove(record);
    return { deleted: true, id };
  }

  async searchKnowledgeByTags(tags: string[], userId?: string): Promise<KnowledgeRecord[]> {
    const queryBuilder = this.knowledgeRepository.createQueryBuilder('knowledge');

    // Base visibility filter
    if (userId) {
      queryBuilder.where('knowledge.visibility = :visibility OR knowledge.userId = :userId', {
        visibility: 'public',
        userId,
      });
    } else {
      queryBuilder.where('knowledge.visibility = :visibility', { visibility: 'public' });
    }

    // Tags filter - find records that contain any of the specified tags
    if (tags.length > 0) {
      const tagConditions = tags.map((_, index) => `knowledge.tags LIKE :tag${index}`).join(' OR ');
      queryBuilder.andWhere(`(${tagConditions})`);
      
      const parameters: Record<string, string> = {};
      tags.forEach((tag, index) => {
        parameters[`tag${index}`] = `%${tag}%`;
      });
      queryBuilder.setParameters(parameters);
    }

    return queryBuilder
      .orderBy('knowledge.rating', 'DESC')
      .addOrderBy('knowledge.useCount', 'DESC')
      .limit(10)
      .getMany();
  }

  async injectRelevantKnowledge(agentId: string, taskContext: string): Promise<string> {
    const agent = await this.agentsRepository.findOne({
      where: { id: agentId },
      relations: ['user'],
    });

    if (!agent) {
      return '';
    }

    // Extract potential tags from task context and agent role
    const contextTags = this.extractTagsFromContext(taskContext, agent.role);
    
    if (contextTags.length === 0) {
      return '';
    }

    // Find relevant knowledge records
    const relevantKnowledge = await this.searchKnowledgeByTags(contextTags, agent.user.id);

    if (relevantKnowledge.length === 0) {
      return '';
    }

    // Format knowledge for injection
    let injectedKnowledge = '\n\n===== RELEVANT KNOWLEDGE =====\n';
    
    relevantKnowledge.slice(0, 3).forEach((record, index) => {
      injectedKnowledge += `\n[Knowledge ${index + 1}] ${record.title}\n`;
      injectedKnowledge += `Tags: ${record.tags.join(', ')}\n`;
      injectedKnowledge += `Content: ${record.content.substring(0, 300)}${record.content.length > 300 ? '...' : ''}\n`;
    });
    
    injectedKnowledge += '\n===== END KNOWLEDGE =====\n\n';

    // Update use counts
    await Promise.all(
      relevantKnowledge.slice(0, 3).map(record => {
        record.useCount += 1;
        return this.knowledgeRepository.save(record);
      })
    );

    return injectedKnowledge;
  }

  private extractTagsFromContext(taskContext: string, agentRole: string): string[] {
    const tags: string[] = [];
    const lowerContext = taskContext.toLowerCase();
    const lowerRole = agentRole.toLowerCase();

    // Technology tags
    const techKeywords = [
      'javascript', 'typescript', 'python', 'java', 'react', 'vue', 'angular',
      'nodejs', 'express', 'nestjs', 'docker', 'kubernetes', 'aws', 'git',
      'database', 'sql', 'mongodb', 'redis', 'api', 'rest', 'graphql',
      'testing', 'jest', 'cypress', 'selenium', 'deployment', 'ci/cd'
    ];

    techKeywords.forEach(keyword => {
      if (lowerContext.includes(keyword) || lowerRole.includes(keyword)) {
        tags.push(keyword);
      }
    });

    // Task type tags
    if (lowerContext.includes('bug') || lowerContext.includes('error') || lowerContext.includes('fix')) {
      tags.push('troubleshooting', 'debugging');
    }
    
    if (lowerContext.includes('feature') || lowerContext.includes('implement') || lowerContext.includes('create')) {
      tags.push('development', 'implementation');
    }
    
    if (lowerContext.includes('test') || lowerContext.includes('testing')) {
      tags.push('testing', 'qa');
    }

    if (lowerContext.includes('deploy') || lowerContext.includes('deployment')) {
      tags.push('deployment', 'devops');
    }

    // Role-based tags
    if (lowerRole.includes('frontend')) {
      tags.push('frontend', 'ui', 'ux');
    }
    
    if (lowerRole.includes('backend')) {
      tags.push('backend', 'server', 'api');
    }
    
    if (lowerRole.includes('devops')) {
      tags.push('devops', 'infrastructure', 'deployment');
    }

    return [...new Set(tags)]; // Remove duplicates
  }

  async rateKnowledge(
    knowledgeId: string,
    userId: string,
    rating: number,
  ): Promise<KnowledgeRecord> {
    const record = await this.knowledgeRepository.findOne({
      where: { id: knowledgeId },
    });

    if (!record) {
      throw new NotFoundException(`Knowledge record with ID "${knowledgeId}" not found.`);
    }

    // Update rating (simple average for now)
    const newRatingCount = record.ratingCount + 1;
    const newRating = ((record.rating * record.ratingCount) + rating) / newRatingCount;

    record.rating = Math.round(newRating * 100) / 100;
    record.ratingCount = newRatingCount;

    return this.knowledgeRepository.save(record);
  }

  async getPopularKnowledge(limit: number = 10): Promise<KnowledgeRecord[]> {
    return this.knowledgeRepository.find({
      where: { visibility: 'public' },
      order: {
        useCount: 'DESC',
        rating: 'DESC',
      },
      take: limit,
    });
  }

  async getUserKnowledge(userId: string): Promise<KnowledgeRecord[]> {
    return this.knowledgeRepository.find({
      where: { user: { id: userId } },
      order: { updatedAt: 'DESC' },
    });
  }
}