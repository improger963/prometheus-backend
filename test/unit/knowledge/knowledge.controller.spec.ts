import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';

import { KnowledgeController } from '../../../src/knowledge/knowledge.controller';
import { KnowledgeService } from '../../../src/knowledge/knowledge.service';
import { MockDataFactory, TestCleanup } from '../../test-utils';

describe('KnowledgeController', () => {
  let controller: KnowledgeController;
  let knowledgeService: jest.Mocked<KnowledgeService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [KnowledgeController],
      providers: [
        {
          provide: KnowledgeService,
          useValue: {
            createKnowledgeRecord: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            rateKnowledge: jest.fn(),
            getPopularKnowledge: jest.fn(),
            getUserKnowledge: jest.fn(),
            searchKnowledgeByTags: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<KnowledgeController>(KnowledgeController);
    knowledgeService = module.get(KnowledgeService);
  });

  afterEach(() => {
    TestCleanup.resetAllMocks();
  });

  describe('create', () => {
    it('should create a new knowledge record', async () => {
      const mockUser = MockDataFactory.createUser();
      const createKnowledgeDto = {
        title: 'Test Knowledge',
        content: 'Test knowledge content',
        tags: ['test', 'example'],
        visibility: 'public' as const,
        category: 'technical',
      };
      const mockKnowledge = MockDataFactory.createKnowledgeRecord(createKnowledgeDto);

      knowledgeService.createKnowledgeRecord.mockResolvedValue(mockKnowledge);

      const result = await controller.create(createKnowledgeDto, { user: mockUser });

      expect(knowledgeService.createKnowledgeRecord).toHaveBeenCalledWith(
        mockUser.id,
        createKnowledgeDto
      );
      expect(result).toEqual(mockKnowledge);
    });

    it('should handle service errors during creation', async () => {
      const mockUser = MockDataFactory.createUser();
      const createKnowledgeDto = {
        title: 'Test Knowledge',
        content: 'Test content',
      };

      knowledgeService.createKnowledgeRecord.mockRejectedValue(new Error('Service error'));

      await expect(controller.create(createKnowledgeDto, { user: mockUser }))
        .rejects.toThrow('Service error');
    });
  });

  describe('findAll', () => {
    it('should return paginated knowledge records with default parameters', async () => {
      const mockUser = MockDataFactory.createUser();
      const mockResult = {
        records: [MockDataFactory.createKnowledgeRecord()],
        total: 1,
        page: 1,
        limit: 10,
      };

      knowledgeService.findAll.mockResolvedValue(mockResult);

      const result = await controller.findAll({ user: mockUser });

      expect(knowledgeService.findAll).toHaveBeenCalledWith(
        mockUser.id,
        1,
        10,
        undefined,
        undefined
      );
      expect(result).toEqual(mockResult);
    });

    it('should return paginated knowledge records with custom parameters', async () => {
      const mockUser = MockDataFactory.createUser();
      const mockResult = {
        records: [MockDataFactory.createKnowledgeRecord()],
        total: 1,
        page: 2,
        limit: 5,
      };

      knowledgeService.findAll.mockResolvedValue(mockResult);

      const result = await controller.findAll(
        { user: mockUser },
        '2',
        '5',
        'technical',
        'search term'
      );

      expect(knowledgeService.findAll).toHaveBeenCalledWith(
        mockUser.id,
        2,
        5,
        'technical',
        'search term'
      );
      expect(result).toEqual(mockResult);
    });

    it('should validate pagination parameters', async () => {
      const mockUser = MockDataFactory.createUser();

      // Test invalid page
      await expect(controller.findAll({ user: mockUser }, '0'))
        .rejects.toThrow(BadRequestException);

      // Test invalid limit
      await expect(controller.findAll({ user: mockUser }, '1', '0'))
        .rejects.toThrow(BadRequestException);

      // Test limit too high
      await expect(controller.findAll({ user: mockUser }, '1', '101'))
        .rejects.toThrow(BadRequestException);

      expect(knowledgeService.findAll).not.toHaveBeenCalled();
    });

    it('should handle non-numeric pagination parameters', async () => {
      const mockUser = MockDataFactory.createUser();
      const mockResult = {
        records: [MockDataFactory.createKnowledgeRecord()],
        total: 1,
        page: 1,
        limit: 10,
      };

      knowledgeService.findAll.mockResolvedValue(mockResult);

      const result = await controller.findAll(
        { user: mockUser },
        'invalid',
        'invalid'
      );

      // Should use defaults for invalid numbers
      expect(knowledgeService.findAll).toHaveBeenCalledWith(
        mockUser.id,
        1,
        10,
        undefined,
        undefined
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe('getPopular', () => {
    it('should return popular knowledge with default limit', async () => {
      const mockPopular = [
        MockDataFactory.createKnowledgeRecord({ rating: 4.8 }),
        MockDataFactory.createKnowledgeRecord({ rating: 4.5 }),
      ];

      knowledgeService.getPopularKnowledge.mockResolvedValue(mockPopular);

      const result = await controller.getPopular();

      expect(knowledgeService.getPopularKnowledge).toHaveBeenCalledWith(10);
      expect(result).toEqual(mockPopular);
    });

    it('should return popular knowledge with custom limit', async () => {
      const mockPopular = [MockDataFactory.createKnowledgeRecord({ rating: 4.8 })];

      knowledgeService.getPopularKnowledge.mockResolvedValue(mockPopular);

      const result = await controller.getPopular('5');

      expect(knowledgeService.getPopularKnowledge).toHaveBeenCalledWith(5);
      expect(result).toEqual(mockPopular);
    });
  });

  describe('getUserKnowledge', () => {
    it('should return user knowledge records', async () => {
      const mockUser = MockDataFactory.createUser();
      const mockKnowledge = [
        MockDataFactory.createKnowledgeRecord(),
        MockDataFactory.createKnowledgeRecord({ title: 'Knowledge 2' }),
      ];

      knowledgeService.getUserKnowledge.mockResolvedValue(mockKnowledge);

      const result = await controller.getUserKnowledge({ user: mockUser });

      expect(knowledgeService.getUserKnowledge).toHaveBeenCalledWith(mockUser.id);
      expect(result).toEqual(mockKnowledge);
    });
  });

  describe('searchByTags', () => {
    it('should search knowledge by tags', async () => {
      const mockUser = MockDataFactory.createUser();
      const tags = 'javascript,programming';
      const mockResults = [MockDataFactory.createKnowledgeRecord()];

      knowledgeService.searchKnowledgeByTags.mockResolvedValue(mockResults);

      const result = await controller.searchByTags(tags, { user: mockUser });

      expect(knowledgeService.searchKnowledgeByTags).toHaveBeenCalledWith(
        ['javascript', 'programming'],
        mockUser.id
      );
      expect(result).toEqual(mockResults);
    });

    it('should handle tags with spaces', async () => {
      const mockUser = MockDataFactory.createUser();
      const tags = ' javascript , programming , web dev ';
      const mockResults = [MockDataFactory.createKnowledgeRecord()];

      knowledgeService.searchKnowledgeByTags.mockResolvedValue(mockResults);

      const result = await controller.searchByTags(tags, { user: mockUser });

      expect(knowledgeService.searchKnowledgeByTags).toHaveBeenCalledWith(
        ['javascript', 'programming', 'web dev'],
        mockUser.id
      );
      expect(result).toEqual(mockResults);
    });

    it('should throw BadRequestException when tags parameter is missing', async () => {
      const mockUser = MockDataFactory.createUser();

      await expect(controller.searchByTags('', { user: mockUser }))
        .rejects.toThrow(BadRequestException);

      await expect(controller.searchByTags(undefined as any, { user: mockUser }))
        .rejects.toThrow(BadRequestException);

      expect(knowledgeService.searchKnowledgeByTags).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a specific knowledge record', async () => {
      const mockUser = MockDataFactory.createUser();
      const knowledgeId = 'test-knowledge-id';
      const mockKnowledge = MockDataFactory.createKnowledgeRecord();

      knowledgeService.findOne.mockResolvedValue(mockKnowledge);

      const result = await controller.findOne(knowledgeId, { user: mockUser });

      expect(knowledgeService.findOne).toHaveBeenCalledWith(knowledgeId, mockUser.id);
      expect(result).toEqual(mockKnowledge);
    });

    it('should handle knowledge not found', async () => {
      const mockUser = MockDataFactory.createUser();
      const knowledgeId = 'non-existent-id';

      knowledgeService.findOne.mockRejectedValue(new NotFoundException('Knowledge not found'));

      await expect(controller.findOne(knowledgeId, { user: mockUser }))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a knowledge record', async () => {
      const mockUser = MockDataFactory.createUser();
      const knowledgeId = 'test-knowledge-id';
      const updateDto = { title: 'Updated Title' };
      const mockUpdatedKnowledge = MockDataFactory.createKnowledgeRecord({ 
        title: 'Updated Title' 
      });

      knowledgeService.update.mockResolvedValue(mockUpdatedKnowledge);

      const result = await controller.update(knowledgeId, updateDto, { user: mockUser });

      expect(knowledgeService.update).toHaveBeenCalledWith(
        knowledgeId,
        mockUser.id,
        updateDto
      );
      expect(result).toEqual(mockUpdatedKnowledge);
    });

    it('should handle knowledge not found during update', async () => {
      const mockUser = MockDataFactory.createUser();
      const knowledgeId = 'non-existent-id';
      const updateDto = { title: 'Updated Title' };

      knowledgeService.update.mockRejectedValue(new NotFoundException('Knowledge not found'));

      await expect(controller.update(knowledgeId, updateDto, { user: mockUser }))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete a knowledge record', async () => {
      const mockUser = MockDataFactory.createUser();
      const knowledgeId = 'test-knowledge-id';
      const deleteResult = { deleted: true, id: knowledgeId };

      knowledgeService.remove.mockResolvedValue(deleteResult);

      const result = await controller.remove(knowledgeId, { user: mockUser });

      expect(knowledgeService.remove).toHaveBeenCalledWith(knowledgeId, mockUser.id);
      expect(result).toEqual(deleteResult);
    });

    it('should handle knowledge not found during deletion', async () => {
      const mockUser = MockDataFactory.createUser();
      const knowledgeId = 'non-existent-id';

      knowledgeService.remove.mockRejectedValue(new NotFoundException('Knowledge not found'));

      await expect(controller.remove(knowledgeId, { user: mockUser }))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('rateKnowledge', () => {
    it('should rate a knowledge record successfully', async () => {
      const mockUser = MockDataFactory.createUser();
      const knowledgeId = 'test-knowledge-id';
      const rateDto = { rating: 4 };
      const mockRatedKnowledge = MockDataFactory.createKnowledgeRecord({ 
        rating: 4.2,
        ratingCount: 5 
      });

      knowledgeService.rateKnowledge.mockResolvedValue(mockRatedKnowledge);

      const result = await controller.rateKnowledge(knowledgeId, rateDto, { user: mockUser });

      expect(knowledgeService.rateKnowledge).toHaveBeenCalledWith(
        knowledgeId,
        mockUser.id,
        rateDto.rating
      );
      expect(result).toEqual(mockRatedKnowledge);
    });

    it('should validate rating range', async () => {
      const mockUser = MockDataFactory.createUser();
      const knowledgeId = 'test-knowledge-id';

      // Test rating below minimum
      await expect(controller.rateKnowledge(
        knowledgeId,
        { rating: 0 },
        { user: mockUser }
      )).rejects.toThrow(BadRequestException);

      // Test rating above maximum
      await expect(controller.rateKnowledge(
        knowledgeId,
        { rating: 6 },
        { user: mockUser }
      )).rejects.toThrow(BadRequestException);

      expect(knowledgeService.rateKnowledge).not.toHaveBeenCalled();
    });

    it('should handle knowledge not found during rating', async () => {
      const mockUser = MockDataFactory.createUser();
      const knowledgeId = 'non-existent-id';
      const rateDto = { rating: 4 };

      knowledgeService.rateKnowledge.mockRejectedValue(
        new NotFoundException('Knowledge not found')
      );

      await expect(controller.rateKnowledge(knowledgeId, rateDto, { user: mockUser }))
        .rejects.toThrow(NotFoundException);
    });

    it('should handle minimum and maximum valid ratings', async () => {
      const mockUser = MockDataFactory.createUser();
      const knowledgeId = 'test-knowledge-id';
      const mockKnowledge = MockDataFactory.createKnowledgeRecord();

      knowledgeService.rateKnowledge.mockResolvedValue(mockKnowledge);

      // Test minimum valid rating
      await controller.rateKnowledge(knowledgeId, { rating: 1 }, { user: mockUser });
      expect(knowledgeService.rateKnowledge).toHaveBeenCalledWith(knowledgeId, mockUser.id, 1);

      // Test maximum valid rating
      await controller.rateKnowledge(knowledgeId, { rating: 5 }, { user: mockUser });
      expect(knowledgeService.rateKnowledge).toHaveBeenCalledWith(knowledgeId, mockUser.id, 5);
    });
  });

  describe('edge cases', () => {
    it('should handle different visibility levels', async () => {
      const mockUser = MockDataFactory.createUser();
      const visibilityLevels: Array<'public' | 'private'> = ['public', 'private'];

      for (const visibility of visibilityLevels) {
        const createKnowledgeDto = {
          title: `${visibility} Knowledge`,
          content: 'Test content',
          visibility,
        };
        const mockKnowledge = MockDataFactory.createKnowledgeRecord({ visibility });

        knowledgeService.createKnowledgeRecord.mockResolvedValue(mockKnowledge);

        const result = await controller.create(createKnowledgeDto, { user: mockUser });

        expect(result.visibility).toBe(visibility);
      }
    });

    it('should handle empty tags array', async () => {
      const mockUser = MockDataFactory.createUser();
      const createKnowledgeDto = {
        title: 'No Tags Knowledge',
        content: 'Content without tags',
        tags: [],
      };
      const mockKnowledge = MockDataFactory.createKnowledgeRecord({ tags: [] });

      knowledgeService.createKnowledgeRecord.mockResolvedValue(mockKnowledge);

      const result = await controller.create(createKnowledgeDto, { user: mockUser });

      expect(result.tags).toEqual([]);
    });

    it('should handle single tag search', async () => {
      const mockUser = MockDataFactory.createUser();
      const tags = 'javascript';
      const mockResults = [MockDataFactory.createKnowledgeRecord()];

      knowledgeService.searchKnowledgeByTags.mockResolvedValue(mockResults);

      const result = await controller.searchByTags(tags, { user: mockUser });

      expect(knowledgeService.searchKnowledgeByTags).toHaveBeenCalledWith(
        ['javascript'],
        mockUser.id
      );
      expect(result).toEqual(mockResults);
    });

    it('should handle partial updates', async () => {
      const mockUser = MockDataFactory.createUser();
      const knowledgeId = 'test-knowledge-id';
      const updateDto = { category: 'updated-category' };
      const mockUpdatedKnowledge = MockDataFactory.createKnowledgeRecord({ 
        category: 'updated-category' 
      });

      knowledgeService.update.mockResolvedValue(mockUpdatedKnowledge);

      const result = await controller.update(knowledgeId, updateDto, { user: mockUser });

      expect(knowledgeService.update).toHaveBeenCalledWith(
        knowledgeId,
        mockUser.id,
        updateDto
      );
      expect(result).toEqual(mockUpdatedKnowledge);
    });

    it('should handle empty search results', async () => {
      const mockUser = MockDataFactory.createUser();
      const tags = 'nonexistent';

      knowledgeService.searchKnowledgeByTags.mockResolvedValue([]);

      const result = await controller.searchByTags(tags, { user: mockUser });

      expect(result).toEqual([]);
    });
  });
});