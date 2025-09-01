import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';

import { AgentsController } from '../../../src/agents/agents.controller';
import { AgentsService } from '../../../src/agents/agents.service';
import { ReputationService } from '../../../src/agents/services/reputation.service';
import { MockDataFactory, TestCleanup } from '../../test-utils';

describe('AgentsController', () => {
  let controller: AgentsController;
  let agentsService: jest.Mocked<AgentsService>;
  let reputationService: jest.Mocked<ReputationService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AgentsController],
      providers: [
        {
          provide: AgentsService,
          useValue: {
            createGlobalAgent: jest.fn(),
            getUserAgents: jest.fn(),
            getAgentById: jest.fn(),
            updateAgent: jest.fn(),
            deleteAgent: jest.fn(),
          },
        },
        {
          provide: ReputationService,
          useValue: {
            updateAgentRating: jest.fn(),
            getAgentStats: jest.fn(),
            promoteAgent: jest.fn(),
            getTopPerformers: jest.fn(),
            getAgentLeaderboard: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AgentsController>(AgentsController);
    agentsService = module.get(AgentsService);
    reputationService = module.get(ReputationService);
  });

  afterEach(() => {
    TestCleanup.resetAllMocks();
  });

  describe('create', () => {
    it('should create a new agent', async () => {
      const mockUser = MockDataFactory.createUser();
      const createAgentDto = {
        name: 'Test Agent',
        role: 'A comprehensive AI agent for testing purposes',
        personalityMatrix: {
          creativity: 0.7,
          analytical: 0.8,
          empathy: 0.6,
          systemPrompt: 'You are a helpful assistant.',
          capabilities: ['testing'],
        },
        llmConfig: {
          provider: 'openai' as const,
          model: 'gpt-4',
          temperature: 0.7,
          maxTokens: 4000,
        },
      };
      const mockAgent = MockDataFactory.createAgent(createAgentDto);

      agentsService.createGlobalAgent.mockResolvedValue(mockAgent);

      const result = await controller.create(createAgentDto, { user: mockUser });

      expect(agentsService.createGlobalAgent).toHaveBeenCalledWith(mockUser.id, createAgentDto);
      expect(result).toEqual(mockAgent);
    });

    it('should handle service errors during creation', async () => {
      const mockUser = MockDataFactory.createUser();
      const createAgentDto = {
        name: 'Test Agent',
        role: 'A test agent for error handling',
        personalityMatrix: {
          creativity: 0.7,
          analytical: 0.8,
          empathy: 0.6,
          systemPrompt: 'You are a helpful assistant.',
        },
        llmConfig: {
          provider: 'openai' as const,
          model: 'gpt-4',
          temperature: 0.7,
          maxTokens: 4000,
        },
      };

      agentsService.createGlobalAgent.mockRejectedValue(new Error('Service error'));

      await expect(controller.create(createAgentDto, { user: mockUser }))
        .rejects.toThrow('Service error');
    });
  });

  describe('findAll', () => {
    it('should return all user agents', async () => {
      const mockUser = MockDataFactory.createUser();
      const mockAgents = [
        MockDataFactory.createAgent(),
        MockDataFactory.createAgent({ name: 'Agent 2' }),
      ];

      agentsService.getUserAgents.mockResolvedValue(mockAgents);

      const result = await controller.findAll({ user: mockUser });

      expect(agentsService.getUserAgents).toHaveBeenCalledWith(mockUser.id);
      expect(result).toEqual(mockAgents);
    });

    it('should return empty array when no agents exist', async () => {
      const mockUser = MockDataFactory.createUser();

      agentsService.getUserAgents.mockResolvedValue([]);

      const result = await controller.findAll({ user: mockUser });

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a specific agent', async () => {
      const mockUser = MockDataFactory.createUser();
      const agentId = 'test-agent-id';
      const mockAgent = MockDataFactory.createAgent();

      agentsService.getAgentById.mockResolvedValue(mockAgent);

      const result = await controller.findOne(agentId, { user: mockUser });

      expect(agentsService.getAgentById).toHaveBeenCalledWith(agentId, mockUser.id);
      expect(result).toEqual(mockAgent);
    });

    it('should handle agent not found', async () => {
      const mockUser = MockDataFactory.createUser();
      const agentId = 'non-existent-id';

      agentsService.getAgentById.mockRejectedValue(new NotFoundException('Agent not found'));

      await expect(controller.findOne(agentId, { user: mockUser }))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update an agent', async () => {
      const mockUser = MockDataFactory.createUser();
      const agentId = 'test-agent-id';
      const updateDto = { name: 'Updated Agent Name' };
      const mockUpdatedAgent = MockDataFactory.createAgent({ name: 'Updated Agent Name' });

      agentsService.updateAgent.mockResolvedValue(mockUpdatedAgent);

      const result = await controller.update(agentId, updateDto, { user: mockUser });

      expect(agentsService.updateAgent).toHaveBeenCalledWith(agentId, mockUser.id, updateDto);
      expect(result).toEqual(mockUpdatedAgent);
    });

    it('should handle update errors', async () => {
      const mockUser = MockDataFactory.createUser();
      const agentId = 'test-agent-id';
      const updateDto = { name: 'Updated Name' };

      agentsService.updateAgent.mockRejectedValue(new NotFoundException('Agent not found'));

      await expect(controller.update(agentId, updateDto, { user: mockUser }))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete an agent', async () => {
      const mockUser = MockDataFactory.createUser();
      const agentId = 'test-agent-id';
      const deleteResult = { deleted: true, id: agentId };

      agentsService.deleteAgent.mockResolvedValue(deleteResult);

      const result = await controller.remove(agentId, { user: mockUser });

      expect(agentsService.deleteAgent).toHaveBeenCalledWith(agentId, mockUser.id);
      expect(result).toEqual(deleteResult);
    });

    it('should handle deletion errors', async () => {
      const mockUser = MockDataFactory.createUser();
      const agentId = 'non-existent-id';

      agentsService.deleteAgent.mockRejectedValue(new NotFoundException('Agent not found'));

      await expect(controller.remove(agentId, { user: mockUser }))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('rateAgent', () => {
    it('should rate an agent successfully', async () => {
      const mockUser = MockDataFactory.createUser();
      const agentId = 'test-agent-id';
      const rateDto = { rating: 4, feedback: 'Great work!' };
      const mockAgent = MockDataFactory.createAgent();

      agentsService.getAgentById.mockResolvedValue(mockAgent);
      reputationService.updateAgentRating.mockResolvedValue(undefined);

      const result = await controller.rateAgent(agentId, rateDto, { user: mockUser });

      expect(agentsService.getAgentById).toHaveBeenCalledWith(agentId, mockUser.id);
      expect(reputationService.updateAgentRating).toHaveBeenCalledWith(
        agentId,
        rateDto.rating,
        rateDto.feedback
      );
      expect(result).toEqual({ success: true, message: 'Agent rated successfully' });
    });

    it('should validate rating range', async () => {
      const mockUser = MockDataFactory.createUser();
      const agentId = 'test-agent-id';
      const invalidRateDto = { rating: 6 }; // Invalid rating

      await expect(controller.rateAgent(agentId, invalidRateDto, { user: mockUser }))
        .rejects.toThrow(BadRequestException);

      expect(agentsService.getAgentById).not.toHaveBeenCalled();
      expect(reputationService.updateAgentRating).not.toHaveBeenCalled();
    });

    it('should handle agent not found during rating', async () => {
      const mockUser = MockDataFactory.createUser();
      const agentId = 'non-existent-id';
      const rateDto = { rating: 4 };

      agentsService.getAgentById.mockRejectedValue(new NotFoundException('Agent not found'));

      await expect(controller.rateAgent(agentId, rateDto, { user: mockUser }))
        .rejects.toThrow(NotFoundException);

      expect(reputationService.updateAgentRating).not.toHaveBeenCalled();
    });
  });

  describe('getAgentStats', () => {
    it('should return agent statistics', async () => {
      const mockUser = MockDataFactory.createUser();
      const agentId = 'test-agent-id';
      const mockAgent = MockDataFactory.createAgent();
      const mockStats = {
        rating: 4.5,
        experience: 150,
        level: 3,
        nextLevelXP: 250,
        rank: 5,
        totalAgents: 20,
        percentile: 75,
      };

      agentsService.getAgentById.mockResolvedValue(mockAgent);
      reputationService.getAgentStats.mockResolvedValue(mockStats);

      const result = await controller.getAgentStats(agentId, { user: mockUser });

      expect(agentsService.getAgentById).toHaveBeenCalledWith(agentId, mockUser.id);
      expect(reputationService.getAgentStats).toHaveBeenCalledWith(agentId);
      expect(result).toEqual(mockStats);
    });

    it('should handle agent not found for stats', async () => {
      const mockUser = MockDataFactory.createUser();
      const agentId = 'non-existent-id';

      agentsService.getAgentById.mockRejectedValue(new NotFoundException('Agent not found'));

      await expect(controller.getAgentStats(agentId, { user: mockUser }))
        .rejects.toThrow(NotFoundException);

      expect(reputationService.getAgentStats).not.toHaveBeenCalled();
    });
  });

  describe('promoteAgent', () => {
    it('should promote an agent successfully', async () => {
      const mockUser = MockDataFactory.createUser();
      const agentId = 'test-agent-id';
      const promoteDto = { bonusXP: 50, reason: 'Excellent performance' };
      const mockAgent = MockDataFactory.createAgent();

      agentsService.getAgentById.mockResolvedValue(mockAgent);
      reputationService.promoteAgent.mockResolvedValue(undefined);

      const result = await controller.promoteAgent(agentId, promoteDto, { user: mockUser });

      expect(agentsService.getAgentById).toHaveBeenCalledWith(agentId, mockUser.id);
      expect(reputationService.promoteAgent).toHaveBeenCalledWith(
        agentId,
        promoteDto.bonusXP,
        promoteDto.reason
      );
      expect(result).toEqual({ success: true, message: 'Agent promoted successfully' });
    });

    it('should handle agent not found during promotion', async () => {
      const mockUser = MockDataFactory.createUser();
      const agentId = 'non-existent-id';
      const promoteDto = { bonusXP: 50, reason: 'Good work' };

      agentsService.getAgentById.mockRejectedValue(new NotFoundException('Agent not found'));

      await expect(controller.promoteAgent(agentId, promoteDto, { user: mockUser }))
        .rejects.toThrow(NotFoundException);

      expect(reputationService.promoteAgent).not.toHaveBeenCalled();
    });
  });

  describe('getLeaderboard', () => {
    it('should return agent leaderboard with default parameters', async () => {
      const mockLeaderboard = [
        MockDataFactory.createAgent({ name: 'Agent 1', rating: 4.8 }),
        MockDataFactory.createAgent({ name: 'Agent 2', rating: 4.6 }),
      ];

      reputationService.getAgentLeaderboard.mockResolvedValue(mockLeaderboard);

      const result = await controller.getLeaderboard();

      expect(reputationService.getAgentLeaderboard).toHaveBeenCalledWith(10);
      expect(result).toEqual(mockLeaderboard);
    });

    it('should return leaderboard with custom limit', async () => {
      const limit = '5';
      const mockLeaderboard = [
        MockDataFactory.createAgent({ name: 'Agent 1', rating: 4.8 }),
      ];

      reputationService.getAgentLeaderboard.mockResolvedValue(mockLeaderboard);

      const result = await controller.getLeaderboard(limit);

      expect(reputationService.getAgentLeaderboard).toHaveBeenCalledWith(5);
      expect(result).toEqual(mockLeaderboard);
    });

    it('should return top performers with timeframe', async () => {
      const limit = '3';
      const timeframe = 'week';
      const mockTopPerformers = [
        MockDataFactory.createAgent({ name: 'Agent 1', rating: 4.9 }),
      ];

      reputationService.getTopPerformers.mockResolvedValue(mockTopPerformers);

      const result = await controller.getLeaderboard(limit, timeframe);

      expect(reputationService.getTopPerformers).toHaveBeenCalledWith(timeframe, 3);
      expect(result).toEqual(mockTopPerformers);
    });

    it('should handle different timeframes', async () => {
      const timeframes: Array<'day' | 'week' | 'month'> = ['day', 'week', 'month'];
      
      for (const timeframe of timeframes) {
        reputationService.getTopPerformers.mockResolvedValue([]);

        await controller.getLeaderboard('10', timeframe);

        expect(reputationService.getTopPerformers).toHaveBeenCalledWith(timeframe, 10);
      }
    });
  });

  describe('edge cases', () => {
    it('should handle minimum rating boundary', async () => {
      const mockUser = MockDataFactory.createUser();
      const agentId = 'test-agent-id';
      const rateDto = { rating: 1 }; // Minimum valid rating

      const mockAgent = MockDataFactory.createAgent();
      agentsService.getAgentById.mockResolvedValue(mockAgent);
      reputationService.updateAgentRating.mockResolvedValue(undefined);

      const result = await controller.rateAgent(agentId, rateDto, { user: mockUser });

      expect(result).toEqual({ success: true, message: 'Agent rated successfully' });
    });

    it('should handle maximum rating boundary', async () => {
      const mockUser = MockDataFactory.createUser();
      const agentId = 'test-agent-id';
      const rateDto = { rating: 5 }; // Maximum valid rating

      const mockAgent = MockDataFactory.createAgent();
      agentsService.getAgentById.mockResolvedValue(mockAgent);
      reputationService.updateAgentRating.mockResolvedValue(undefined);

      const result = await controller.rateAgent(agentId, rateDto, { user: mockUser });

      expect(result).toEqual({ success: true, message: 'Agent rated successfully' });
    });

    it('should handle below minimum rating', async () => {
      const mockUser = MockDataFactory.createUser();
      const agentId = 'test-agent-id';
      const rateDto = { rating: 0 }; // Below minimum

      await expect(controller.rateAgent(agentId, rateDto, { user: mockUser }))
        .rejects.toThrow(BadRequestException);
    });

    it('should handle above maximum rating', async () => {
      const mockUser = MockDataFactory.createUser();
      const agentId = 'test-agent-id';
      const rateDto = { rating: 6 }; // Above maximum

      await expect(controller.rateAgent(agentId, rateDto, { user: mockUser }))
        .rejects.toThrow(BadRequestException);
    });
  });
});