import { Test, TestingModule } from '@nestjs/testing';
import { ProjectTeamController } from '../../../src/projects/project-team.controller';
import { ProjectTeamService } from '../../../src/projects/project-team.service';
import { UserFixtures, AgentFixtures, ProjectFixtures, TestCleanup } from '../../test-utils';

describe('ProjectTeamController', () => {
  let controller: ProjectTeamController;
  let projectTeamService: ProjectTeamService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectTeamController],
      providers: [
        {
          provide: ProjectTeamService,
          useValue: {
            getProjectTeam: jest.fn(),
            inviteAgentToProject: jest.fn(),
            removeAgentFromProject: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ProjectTeamController>(ProjectTeamController);
    projectTeamService = module.get<ProjectTeamService>(ProjectTeamService);
  });

  afterEach(() => {
    TestCleanup.resetAllMocks();
  });

  describe('getProjectTeam', () => {
    it('should return project team members', async () => {
      const user = UserFixtures.generateUser();
      const projectId = 'test-project-id';
      const mockAgents = AgentFixtures.generateAgents(3, { user: user as any });
      const req = { user };

      jest.spyOn(projectTeamService, 'getProjectTeam').mockResolvedValue(mockAgents as any);

      const result = await controller.getProjectTeam(projectId, req);

      expect(projectTeamService.getProjectTeam).toHaveBeenCalledWith(projectId, user.id);
      expect(result).toEqual(mockAgents);
    });

    it('should return empty array for project with no team members', async () => {
      const user = UserFixtures.generateUser();
      const projectId = 'test-project-id';
      const req = { user };

      jest.spyOn(projectTeamService, 'getProjectTeam').mockResolvedValue([]);

      const result = await controller.getProjectTeam(projectId, req);

      expect(result).toEqual([]);
    });

    it('should handle errors when project not found', async () => {
      const user = UserFixtures.generateUser();
      const projectId = 'non-existent-project';
      const req = { user };
      const error = new Error('Project not found');

      jest.spyOn(projectTeamService, 'getProjectTeam').mockRejectedValue(error);

      await expect(controller.getProjectTeam(projectId, req)).rejects.toThrow(error);
    });
  });

  describe('inviteAgent', () => {
    it('should successfully invite agent to project', async () => {
      const user = UserFixtures.generateUser();
      const projectId = 'test-project-id';
      const agentId = 'test-agent-id';
      const inviteDto = { agentId };
      const req = { user };
      const mockResponse = {
        success: true,
        message: 'Agent successfully added to project team.',
      };

      jest.spyOn(projectTeamService, 'inviteAgentToProject').mockResolvedValue(mockResponse);

      const result = await controller.inviteAgent(projectId, inviteDto, req);

      expect(projectTeamService.inviteAgentToProject).toHaveBeenCalledWith(
        projectId,
        agentId,
        user.id,
      );
      expect(result).toEqual(mockResponse);
    });

    it('should handle duplicate invitation error', async () => {
      const user = UserFixtures.generateUser();
      const projectId = 'test-project-id';
      const agentId = 'test-agent-id';
      const inviteDto = { agentId };
      const req = { user };
      const error = new Error('Agent already in project team');

      jest.spyOn(projectTeamService, 'inviteAgentToProject').mockRejectedValue(error);

      await expect(controller.inviteAgent(projectId, inviteDto, req)).rejects.toThrow(error);
    });

    it('should handle agent not found error', async () => {
      const user = UserFixtures.generateUser();
      const projectId = 'test-project-id';
      const agentId = 'non-existent-agent';
      const inviteDto = { agentId };
      const req = { user };
      const error = new Error('Agent not found');

      jest.spyOn(projectTeamService, 'inviteAgentToProject').mockRejectedValue(error);

      await expect(controller.inviteAgent(projectId, inviteDto, req)).rejects.toThrow(error);
    });
  });

  describe('removeAgent', () => {
    it('should successfully remove agent from project', async () => {
      const user = UserFixtures.generateUser();
      const projectId = 'test-project-id';
      const agentId = 'test-agent-id';
      const req = { user };
      const mockResponse = {
        success: true,
        message: 'Agent successfully removed from project team.',
      };

      jest.spyOn(projectTeamService, 'removeAgentFromProject').mockResolvedValue(mockResponse);

      const result = await controller.removeAgent(projectId, agentId, req);

      expect(projectTeamService.removeAgentFromProject).toHaveBeenCalledWith(
        projectId,
        agentId,
        user.id,
      );
      expect(result).toEqual(mockResponse);
    });

    it('should handle agent not in team error', async () => {
      const user = UserFixtures.generateUser();
      const projectId = 'test-project-id';
      const agentId = 'test-agent-id';
      const req = { user };
      const error = new Error('Agent not found in project team');

      jest.spyOn(projectTeamService, 'removeAgentFromProject').mockRejectedValue(error);

      await expect(controller.removeAgent(projectId, agentId, req)).rejects.toThrow(error);
    });

    it('should handle project access denied error', async () => {
      const user = UserFixtures.generateUser();
      const projectId = 'unauthorized-project';
      const agentId = 'test-agent-id';
      const req = { user };
      const error = new Error('Access denied to project');

      jest.spyOn(projectTeamService, 'removeAgentFromProject').mockRejectedValue(error);

      await expect(controller.removeAgent(projectId, agentId, req)).rejects.toThrow(error);
    });
  });

  describe('controller validation', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('should have all team management methods', () => {
      expect(controller.getProjectTeam).toBeDefined();
      expect(controller.inviteAgent).toBeDefined();
      expect(controller.removeAgent).toBeDefined();
    });

    it('should handle invalid project IDs', async () => {
      const user = UserFixtures.generateUser();
      const invalidProjectId = 'invalid-uuid';
      const req = { user };
      const error = new Error('Invalid project ID format');

      jest.spyOn(projectTeamService, 'getProjectTeam').mockRejectedValue(error);

      await expect(controller.getProjectTeam(invalidProjectId, req)).rejects.toThrow(error);
    });

    it('should handle invalid agent IDs in invite', async () => {
      const user = UserFixtures.generateUser();
      const projectId = 'test-project-id';
      const invalidAgentId = 'invalid-uuid';
      const inviteDto = { agentId: invalidAgentId };
      const req = { user };
      const error = new Error('Invalid agent ID format');

      jest.spyOn(projectTeamService, 'inviteAgentToProject').mockRejectedValue(error);

      await expect(controller.inviteAgent(projectId, inviteDto, req)).rejects.toThrow(error);
    });
  });
});