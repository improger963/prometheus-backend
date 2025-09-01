import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';

import { AgentsService } from '../../../src/agents/agents.service';
import { Agent } from '../../../src/agents/entities/agent.entity';
import { User } from '../../../src/auth/entities/user.entity';
import { TestUtils, MockDataFactory, TestCleanup } from '../../test-utils';

describe('AgentsService', () => {
  let service: AgentsService;
  let agentRepository: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgentsService,
        {
          provide: getRepositoryToken(Agent),
          useValue: TestUtils.createMockRepository<Agent>(),
        },
      ],
    }).compile();

    service = module.get<AgentsService>(AgentsService);
    agentRepository = module.get(getRepositoryToken(Agent));
  });

  afterEach(() => {
    TestCleanup.resetAllMocks();
  });

  describe('create', () => {
    it('should successfully create an agent', async () => {
      const user = MockDataFactory.createUser();
      const createAgentDto = {
        name: 'Test Agent',
        role: 'A helpful AI agent for testing purposes',
        personalityMatrix: {
          creativity: 0.7,
          analytical: 0.8,
          empathy: 0.6,
          systemPrompt: 'You are a helpful assistant.',
          capabilities: ['coding', 'analysis'],
        },
        llmConfig: {
          provider: 'openai' as const,
          model: 'gpt-4',
          temperature: 0.7,
          maxTokens: 4000,
        },
      };
      const mockAgent = MockDataFactory.createAgent({
        ...createAgentDto,
        user,
      });

      agentRepository.create.mockReturnValue(mockAgent);
      agentRepository.save.mockResolvedValue(mockAgent);

      const result = await service.createGlobalAgent(user.id, createAgentDto);

      expect(agentRepository.create).toHaveBeenCalledWith({
        ...createAgentDto,
        user: { id: user.id },
        rating: 0.0,
        experience: 0,
      });
      expect(agentRepository.save).toHaveBeenCalledWith(mockAgent);
      expect(result).toEqual(mockAgent);
    });

    it('should handle repository errors during creation', async () => {
      const user = MockDataFactory.createUser();
      const createAgentDto = {
        name: 'Test Agent',
        role: 'A test agent for error handling',
        personalityMatrix: {
          creativity: 0.5,
          analytical: 0.7,
          empathy: 0.6,
          systemPrompt: 'You are a test agent.',
        },
        llmConfig: {
          provider: 'openai' as const,
          model: 'gpt-4',
          temperature: 0.7,
        },
      };

      agentRepository.create.mockReturnValue({});
      agentRepository.save.mockRejectedValue(new Error('Database error'));

      await expect(service.createGlobalAgent(user.id, createAgentDto)).rejects.toThrow('Database error');
    });
  });

  describe('findAll', () => {
    it('should return all agents for a user', async () => {
      const user = MockDataFactory.createUser();
      const mockAgents = [
        MockDataFactory.createAgent({ user }),
        MockDataFactory.createAgent({ user, name: 'Agent 2' }),
      ];

      agentRepository.find.mockResolvedValue(mockAgents);

      const result = await service.getUserAgents(user.id);

      expect(agentRepository.find).toHaveBeenCalledWith({
        where: { user: { id: user.id } },
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual(mockAgents);
    });

    it('should return empty array if user has no agents', async () => {
      const user = MockDataFactory.createUser();
      agentRepository.find.mockResolvedValue([]);

      const result = await service.getUserAgents(user.id);

      expect(result).toEqual([]);
    });
  });

  describe('getAgentById', () => {
    it('should return agent if user owns it', async () => {
      const user = MockDataFactory.createUser();
      const mockAgent = MockDataFactory.createAgent({ user });

      agentRepository.findOne.mockResolvedValue(mockAgent);

      const result = await service.getAgentById(mockAgent.id, user.id);

      expect(agentRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockAgent.id, user: { id: user.id } },
      });
      expect(result).toEqual(mockAgent);
    });

    it('should throw NotFoundException if agent not found', async () => {
      const userId = 'test-user-id';
      const agentId = 'non-existent-id';

      agentRepository.findOne.mockResolvedValue(null);

      await expect(service.getAgentById(agentId, userId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateAgent', () => {
    it('should successfully update agent', async () => {
      const user = MockDataFactory.createUser();
      const mockAgent = MockDataFactory.createAgent({ user });
      const updateDto = { name: 'Updated Agent Name' };
      const updatedAgent = { ...mockAgent, ...updateDto };

      agentRepository.findOne.mockResolvedValue(mockAgent);
      agentRepository.save.mockResolvedValue(updatedAgent);

      const result = await service.updateAgent(mockAgent.id, user.id, updateDto);

      expect(agentRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockAgent.id, user: { id: user.id } },
      });
      expect(agentRepository.save).toHaveBeenCalledWith(updatedAgent);
      expect(result).toEqual(updatedAgent);
    });

    it('should throw NotFoundException if agent not found for update', async () => {
      const userId = 'test-user-id';
      const agentId = 'non-existent-id';
      const updateDto = { name: 'Updated Name' };

      agentRepository.findOne.mockResolvedValue(null);

      await expect(service.updateAgent(agentId, userId, updateDto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteAgent', () => {
    it('should successfully delete agent', async () => {
      const user = MockDataFactory.createUser();
      const mockAgent = MockDataFactory.createAgent({ user });

      agentRepository.findOne.mockResolvedValue(mockAgent);
      agentRepository.remove.mockResolvedValue(mockAgent);

      const result = await service.deleteAgent(mockAgent.id, user.id);

      expect(agentRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockAgent.id, user: { id: user.id } },
      });
      expect(agentRepository.remove).toHaveBeenCalledWith(mockAgent);
      expect(result).toEqual({ deleted: true, id: mockAgent.id });
    });

    it('should throw NotFoundException if agent not found for deletion', async () => {
      const userId = 'test-user-id';
      const agentId = 'non-existent-id';

      agentRepository.findOne.mockResolvedValue(null);

      await expect(service.deleteAgent(agentId, userId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateAgentRating', () => {
    it('should update agent rating', async () => {
      const agentId = 'test-agent-id';
      const newRating = 4.5;

      agentRepository.update.mockResolvedValue({ affected: 1 });

      await service.updateAgentRating(agentId, newRating);

      expect(agentRepository.update).toHaveBeenCalledWith(agentId, { rating: newRating });
    });
  });

  describe('addExperience', () => {
    it('should add experience to agent', async () => {
      const mockAgent = MockDataFactory.createAgent({ experience: 100 });
      const xpToAdd = 50;
      const updatedAgent = { ...mockAgent, experience: 150 };

      agentRepository.findOne.mockResolvedValue(mockAgent);
      agentRepository.save.mockResolvedValue(updatedAgent);

      await service.addExperience(mockAgent.id, xpToAdd);

      expect(agentRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockAgent.id },
      });
      expect(agentRepository.save).toHaveBeenCalledWith(updatedAgent);
    });

    it('should handle non-existent agent when adding experience', async () => {
      const agentId = 'non-existent-id';
      const xpToAdd = 50;

      agentRepository.findOne.mockResolvedValue(null);

      // Should not throw error, just silently return
      await service.addExperience(agentId, xpToAdd);

      expect(agentRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('getAgentLeaderboard', () => {
    it('should return agents sorted by rating and experience', async () => {
      const mockAgents = [
        MockDataFactory.createAgent({ rating: 5.0, experience: 200 }),
        MockDataFactory.createAgent({ rating: 4.8, experience: 150 }),
        MockDataFactory.createAgent({ rating: 4.5, experience: 100 }),
      ];

      agentRepository.find.mockResolvedValue(mockAgents);

      const result = await service.getAgentLeaderboard(10);

      expect(agentRepository.find).toHaveBeenCalledWith({
        order: { rating: 'DESC', experience: 'DESC' },
        take: 10,
      });
      expect(result).toEqual(mockAgents);
    });

    it('should use default limit if not provided', async () => {
      agentRepository.find.mockResolvedValue([]);

      await service.getAgentLeaderboard();

      expect(agentRepository.find).toHaveBeenCalledWith({
        order: { rating: 'DESC', experience: 'DESC' },
        take: 10,
      });
    });
  });

  describe('validateAgentOwnership', () => {
    it('should return true if user owns agent', async () => {
      const user = MockDataFactory.createUser();
      const mockAgent = MockDataFactory.createAgent({ user });

      agentRepository.findOne.mockResolvedValue(mockAgent);

      const result = await service.validateAgentOwnership(mockAgent.id, user.id);

      expect(agentRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockAgent.id, user: { id: user.id } },
      });
      expect(result).toBe(true);
    });

    it('should return false if user does not own agent', async () => {
      const userId = 'test-user-id';
      const agentId = 'test-agent-id';

      agentRepository.findOne.mockResolvedValue(null);

      const result = await service.validateAgentOwnership(agentId, userId);

      expect(result).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle database errors during findAll', async () => {
      const user = MockDataFactory.createUser();
      agentRepository.find.mockRejectedValue(new Error('Database connection failed'));

      await expect(service.getUserAgents(user.id)).rejects.toThrow('Database connection failed');
    });

    it('should handle agent with invalid model', async () => {
      const user = MockDataFactory.createUser();
      const createAgentDto = {
        name: 'Test Agent',
        role: 'A test agent with invalid model',
        personalityMatrix: {
          creativity: 0.5,
          analytical: 0.7,
          empathy: 0.6,
          systemPrompt: 'You are a test agent.',
        },
        llmConfig: {
          provider: 'openai' as const,
          model: 'invalid-model',
          temperature: 0.7,
        },
      };

      agentRepository.create.mockReturnValue({});
      agentRepository.save.mockResolvedValue({});

      // Should not throw error - validation is handled by DTOs
      const result = await service.createGlobalAgent(user.id, createAgentDto);
      expect(result).toBeDefined();
    });
  });
});