import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsController } from '../../../src/projects/projects.controller';
import { ProjectsService } from '../../../src/projects/projects.service';
import { UserFixtures, ProjectFixtures, TestCleanup } from '../../test-utils';

describe('ProjectsController', () => {
  let controller: ProjectsController;
  let projectsService: ProjectsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectsController],
      providers: [
        {
          provide: ProjectsService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ProjectsController>(ProjectsController);
    projectsService = module.get<ProjectsService>(ProjectsService);
  });

  afterEach(() => {
    TestCleanup.resetAllMocks();
  });

  describe('create', () => {
    it('should create a new project', async () => {
      const user = UserFixtures.generateUser();
      const createProjectDto = ProjectFixtures.getCreateProjectDto(ProjectFixtures.generateProject());
      const mockProject = ProjectFixtures.generateProject({ user: user as any });
      const req = { user };

      jest.spyOn(projectsService, 'create').mockResolvedValue(mockProject as any);

      const result = await controller.create(createProjectDto, req);

      expect(projectsService.create).toHaveBeenCalledWith(createProjectDto, user);
      expect(result).toEqual(mockProject);
    });

    it('should handle creation errors', async () => {
      const user = UserFixtures.generateUser();
      const createProjectDto = ProjectFixtures.getCreateProjectDto(ProjectFixtures.generateProject());
      const req = { user };
      const error = new Error('Database error');

      jest.spyOn(projectsService, 'create').mockRejectedValue(error);

      await expect(controller.create(createProjectDto, req)).rejects.toThrow(error);
      expect(projectsService.create).toHaveBeenCalledWith(createProjectDto, user);
    });
  });

  describe('findAll', () => {
    it('should return all projects for user', async () => {
      const user = UserFixtures.generateUser();
      const mockProjects = ProjectFixtures.generateProjects(3, { user: user as any });
      const req = { user };

      jest.spyOn(projectsService, 'findAll').mockResolvedValue(mockProjects as any);

      const result = await controller.findAll(req);

      expect(projectsService.findAll).toHaveBeenCalledWith(user);
      expect(result).toEqual(mockProjects);
    });

    it('should return empty array when user has no projects', async () => {
      const user = UserFixtures.generateUser();
      const req = { user };

      jest.spyOn(projectsService, 'findAll').mockResolvedValue([]);

      const result = await controller.findAll(req);

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a specific project', async () => {
      const user = UserFixtures.generateUser();
      const mockProject = ProjectFixtures.generateProject({ user: user as any });
      const req = { user };

      jest.spyOn(projectsService, 'findOne').mockResolvedValue(mockProject as any);

      const result = await controller.findOne(mockProject.id!, req);

      expect(projectsService.findOne).toHaveBeenCalledWith(mockProject.id, user);
      expect(result).toEqual(mockProject);
    });

    it('should handle not found errors', async () => {
      const user = UserFixtures.generateUser();
      const projectId = 'non-existent-id';
      const req = { user };
      const error = new Error('Project not found');

      jest.spyOn(projectsService, 'findOne').mockRejectedValue(error);

      await expect(controller.findOne(projectId, req)).rejects.toThrow(error);
    });
  });

  describe('update', () => {
    it('should update a project', async () => {
      const user = UserFixtures.generateUser();
      const mockProject = ProjectFixtures.generateProject({ user: user as any });
      const updateDto = { name: 'Updated Project Name' };
      const updatedProject = { ...mockProject, ...updateDto };
      const req = { user };

      jest.spyOn(projectsService, 'update').mockResolvedValue(updatedProject as any);

      const result = await controller.update(mockProject.id!, updateDto, req);

      expect(projectsService.update).toHaveBeenCalledWith(mockProject.id, updateDto, user);
      expect(result).toEqual(updatedProject);
    });

    it('should handle update errors', async () => {
      const user = UserFixtures.generateUser();
      const projectId = 'test-project-id';
      const updateDto = { name: 'Updated Name' };
      const req = { user };
      const error = new Error('Update failed');

      jest.spyOn(projectsService, 'update').mockRejectedValue(error);

      await expect(controller.update(projectId, updateDto, req)).rejects.toThrow(error);
    });
  });

  describe('remove', () => {
    it('should delete a project', async () => {
      const user = UserFixtures.generateUser();
      const projectId = 'test-project-id';
      const deleteResult = { deleted: true, id: projectId };
      const req = { user };

      jest.spyOn(projectsService, 'remove').mockResolvedValue(deleteResult);

      const result = await controller.remove(projectId, req);

      expect(projectsService.remove).toHaveBeenCalledWith(projectId, user);
      expect(result).toEqual(deleteResult);
    });

    it('should handle deletion errors', async () => {
      const user = UserFixtures.generateUser();
      const projectId = 'test-project-id';
      const req = { user };
      const error = new Error('Deletion failed');

      jest.spyOn(projectsService, 'remove').mockRejectedValue(error);

      await expect(controller.remove(projectId, req)).rejects.toThrow(error);
    });
  });

  describe('controller validation', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('should have all CRUD methods', () => {
      expect(controller.create).toBeDefined();
      expect(controller.findAll).toBeDefined();
      expect(controller.findOne).toBeDefined();
      expect(controller.update).toBeDefined();
      expect(controller.remove).toBeDefined();
    });
  });
});