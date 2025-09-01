import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';

import { KnowledgeService } from '../../../src/knowledge/knowledge.service';
import { KnowledgeRecord } from '../../../src/knowledge/entities/knowledge-record.entity';
import { Agent } from '../../../src/agents/entities/agent.entity';
import { TestUtils, MockDataFactory, TestCleanup } from '../../test-utils';

describe('KnowledgeService', () => {
  let service: KnowledgeService;
  let knowledgeRepository: any;
  let agentRepository: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KnowledgeService,
        {
          provide: getRepositoryToken(KnowledgeRecord),
          useValue: TestUtils.createMockRepository<KnowledgeRecord>(),
        },
        {
          provide: getRepositoryToken(Agent),
          useValue: TestUtils.createMockRepository<Agent>(),
        },
      ],
    }).compile();

    service = module.get<KnowledgeService>(KnowledgeService);
    knowledgeRepository = module.get(getRepositoryToken(KnowledgeRecord));
    agentRepository = module.get(getRepositoryToken(Agent));
  });

  afterEach(() => {
    TestCleanup.resetAllMocks();
  });

  describe('createKnowledgeRecord', () => {
    it('should successfully create a knowledge record', async () => {
      const userId = 'test-user-id';
      const createKnowledgeDto = {
        title: 'Test Knowledge',
        content: 'Test knowledge content',
        tags: ['test', 'example'],
        visibility: 'public' as const,
        category: 'technical' as const,
      };
      const mockKnowledge = MockDataFactory.createKnowledgeRecord(createKnowledgeDto);

      knowledgeRepository.create.mockReturnValue(mockKnowledge);
      knowledgeRepository.save.mockResolvedValue(mockKnowledge);

      const result = await service.createKnowledgeRecord(userId, createKnowledgeDto);

      expect(knowledgeRepository.create).toHaveBeenCalledWith({
        ...createKnowledgeDto,
        user: { id: userId },
        useCount: 0,
        rating: 0.0,
        ratingCount: 0,
      });
      expect(knowledgeRepository.save).toHaveBeenCalledWith(mockKnowledge);
      expect(result).toEqual(mockKnowledge);
    });

    it('should handle repository errors during creation', async () => {
      const userId = 'test-user-id';
      const createKnowledgeDto = {
        title: 'Test Knowledge',
        content: 'Test content',
        tags: [] as string[],
        visibility: 'public' as const,
        category: 'general' as const,
      };

      knowledgeRepository.create.mockReturnValue({});
      knowledgeRepository.save.mockRejectedValue(new Error('Database error'));

      await expect(service.createKnowledgeRecord(userId, createKnowledgeDto)).rejects.toThrow('Database error');
    });
  });

  describe('findAll', () => {
    it('should return paginated knowledge records', async () => {
      const userId = 'test-user-id';
      const page = 1;
      const limit = 10;
      const mockKnowledge = [
        MockDataFactory.createKnowledgeRecord(),
        MockDataFactory.createKnowledgeRecord({ title: 'Knowledge 2' }),
      ];

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([mockKnowledge, 2]),
      };

      knowledgeRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.findAll(userId, page, limit);

      expect(knowledgeRepository.createQueryBuilder).toHaveBeenCalledWith('knowledge');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'knowledge.visibility = :visibility OR knowledge.userId = :userId',
        { visibility: 'public', userId }
      );
      expect(result).toEqual({
        records: mockKnowledge,
        total: 2,
        page: 1,
        totalPages: 1,
      });
    });

    it('should filter by category when provided', async () => {
      const userId = 'test-user-id';
      const category = 'technical';

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };

      knowledgeRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await service.findAll(userId, 1, 10, category);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('knowledge.category = :category', { category });
    });

    it('should search by content when search term provided', async () => {
      const userId = 'test-user-id';
      const search = 'test search';

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };

      knowledgeRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await service.findAll(userId, 1, 10, undefined, search);

      expect(knowledgeRepository.createQueryBuilder).toHaveBeenCalled();
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'knowledge.visibility = :visibility OR knowledge.userId = :userId',
        { visibility: 'public', userId }
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(knowledge.title ILIKE :search OR knowledge.content ILIKE :search OR knowledge.tags ILIKE :search)',
        { search: `%${search}%` }
      );
    });

    it('should calculate correct pagination offset', async () => {
      const userId = 'test-user-id';
      const page = 3;
      const limit = 5;

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };

      knowledgeRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await service.findAll(userId, page, limit);

      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(10); // (3 - 1) * 5
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(5);
    });
  });

  describe('findOne', () => {
    it('should return knowledge record if user owns it', async () => {
      const userId = 'test-user-id';
      const knowledgeId = 'test-knowledge-id';
      const mockKnowledge = MockDataFactory.createKnowledgeRecord();

      knowledgeRepository.findOne.mockResolvedValue(mockKnowledge);

      const result = await service.findOne(knowledgeId, userId);

      expect(knowledgeRepository.findOne).toHaveBeenCalledWith({
        where: { id: knowledgeId },
        relations: ['user'],
      });
      expect(result).toEqual(mockKnowledge);
    });

    it('should throw NotFoundException if knowledge not found', async () => {
      const userId = 'test-user-id';
      const knowledgeId = 'non-existent-id';

      knowledgeRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(knowledgeId, userId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should successfully update knowledge record', async () => {
      const userId = 'test-user-id';
      const knowledgeId = 'test-knowledge-id';
      const mockKnowledge = MockDataFactory.createKnowledgeRecord();
      const updateDto = { title: 'Updated Title' };
      const updatedKnowledge = { ...mockKnowledge, ...updateDto };

      knowledgeRepository.findOne.mockResolvedValue(mockKnowledge);
      knowledgeRepository.save.mockResolvedValue(updatedKnowledge);

      const result = await service.update(knowledgeId, userId, updateDto);

      expect(knowledgeRepository.save).toHaveBeenCalledWith(updatedKnowledge);
      expect(result).toEqual(updatedKnowledge);
    });

    it('should throw NotFoundException if knowledge not found for update', async () => {
      const userId = 'test-user-id';
      const knowledgeId = 'non-existent-id';
      const updateDto = { title: 'Updated Title' };

      knowledgeRepository.findOne.mockResolvedValue(null);

      await expect(service.update(knowledgeId, userId, updateDto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should successfully remove knowledge record', async () => {
      const userId = 'test-user-id';
      const knowledgeId = 'test-knowledge-id';
      const mockKnowledge = MockDataFactory.createKnowledgeRecord();

      knowledgeRepository.findOne.mockResolvedValue(mockKnowledge);
      knowledgeRepository.remove.mockResolvedValue(mockKnowledge);

      const result = await service.remove(knowledgeId, userId);

      expect(knowledgeRepository.remove).toHaveBeenCalledWith(mockKnowledge);
      expect(result).toEqual({ deleted: true, id: knowledgeId });
    });

    it('should throw NotFoundException if knowledge not found for removal', async () => {
      const userId = 'test-user-id';
      const knowledgeId = 'non-existent-id';

      knowledgeRepository.findOne.mockResolvedValue(null);

      await expect(service.remove(knowledgeId, userId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('rateKnowledge', () => {
    it('should successfully rate knowledge record', async () => {
      const userId = 'test-user-id';
      const knowledgeId = 'test-knowledge-id';
      const rating = 4;
      const mockKnowledge = MockDataFactory.createKnowledgeRecord({
        rating: 3.0,
        ratingCount: 2,
      });

      // Expected calculation: (3.0 * 2 + 4) / 3 = 3.33 (rounded to 2 decimal places)
      const expectedRating = Math.round(((3.0 * 2 + 4) / 3) * 100) / 100;
      const updatedKnowledge = {
        ...mockKnowledge,
        rating: expectedRating,
        ratingCount: 3,
      };

      knowledgeRepository.findOne.mockResolvedValue(mockKnowledge);
      knowledgeRepository.save.mockResolvedValue(updatedKnowledge);

      const result = await service.rateKnowledge(knowledgeId, userId, rating);

      expect(knowledgeRepository.save).toHaveBeenCalledWith(updatedKnowledge);
      expect(result.rating).toBeCloseTo(expectedRating, 2);
      expect(result.ratingCount).toBe(3);
    });

    it('should handle first rating correctly', async () => {
      const userId = 'test-user-id';
      const knowledgeId = 'test-knowledge-id';
      const rating = 5;
      const mockKnowledge = MockDataFactory.createKnowledgeRecord({
        rating: 0.0,
        ratingCount: 0,
      });

      const updatedKnowledge = {
        ...mockKnowledge,
        rating: 5.0,
        ratingCount: 1,
      };

      knowledgeRepository.findOne.mockResolvedValue(mockKnowledge);
      knowledgeRepository.save.mockResolvedValue(updatedKnowledge);

      const result = await service.rateKnowledge(knowledgeId, userId, rating);

      expect(result.rating).toBe(5.0);
      expect(result.ratingCount).toBe(1);
    });

    it('should process any rating value (validation done at controller level)', async () => {
      const userId = 'test-user-id';
      const knowledgeId = 'test-knowledge-id';
      const unusualRating = 6; // Would be invalid at controller level, but service processes it
      const mockKnowledge = MockDataFactory.createKnowledgeRecord({
        rating: 0.0,
        ratingCount: 0,
      });
      const expectedRating = Math.round(unusualRating * 100) / 100;
      const updatedKnowledge = {
        ...mockKnowledge,
        rating: expectedRating,
        ratingCount: 1,
      };

      knowledgeRepository.findOne.mockResolvedValue(mockKnowledge);
      knowledgeRepository.save.mockResolvedValue(updatedKnowledge);

      const result = await service.rateKnowledge(knowledgeId, userId, unusualRating);

      expect(result.rating).toBe(expectedRating);
      expect(result.ratingCount).toBe(1);
    });

    it('should throw NotFoundException if knowledge not found', async () => {
      const userId = 'test-user-id';
      const knowledgeId = 'non-existent-id';
      const rating = 4;

      knowledgeRepository.findOne.mockResolvedValue(null);

      await expect(service.rateKnowledge(knowledgeId, userId, rating)).rejects.toThrow(NotFoundException);
    });
  });

  describe('searchKnowledgeByTags', () => {
    it('should return knowledge records matching tags', async () => {
      const tags = ['test', 'example'];
      const mockKnowledge = [
        MockDataFactory.createKnowledgeRecord({ tags }),
      ];

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        setParameters: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockKnowledge),
      };

      knowledgeRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.searchKnowledgeByTags(tags);

      expect(knowledgeRepository.createQueryBuilder).toHaveBeenCalledWith('knowledge');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'knowledge.visibility = :visibility',
        { visibility: 'public' }
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(knowledge.tags LIKE :tag0 OR knowledge.tags LIKE :tag1)'
      );
      expect(result).toEqual(mockKnowledge);
    });

    it('should return empty array for no matching tags', async () => {
      const tags = ['nonexistent'];

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        setParameters: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      knowledgeRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.searchKnowledgeByTags(tags);

      expect(result).toEqual([]);
    });
  });

  describe('getPopularKnowledge', () => {
    it('should return popular knowledge records', async () => {
      const limit = 5;
      const mockKnowledge = [
        MockDataFactory.createKnowledgeRecord({ rating: 5.0, useCount: 100 }),
        MockDataFactory.createKnowledgeRecord({ rating: 4.8, useCount: 80 }),
      ];

      knowledgeRepository.find.mockResolvedValue(mockKnowledge);

      const result = await service.getPopularKnowledge(limit);

      expect(knowledgeRepository.find).toHaveBeenCalledWith({
        where: { visibility: 'public' },
        order: { useCount: 'DESC', rating: 'DESC' },
        take: limit,
      });
      expect(result).toEqual(mockKnowledge);
    });
  });

  describe('edge cases', () => {
    it('should handle empty tags array', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      knowledgeRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.searchKnowledgeByTags([]);

      expect(result).toEqual([]);
    });

    it('should handle database errors during search', async () => {
      const userId = 'test-user-id';
      const search = 'test';

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockRejectedValue(new Error('Database error')),
      };

      knowledgeRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await expect(service.findAll(userId, 1, 10, undefined, search)).rejects.toThrow('Database error');
    });
  });
});