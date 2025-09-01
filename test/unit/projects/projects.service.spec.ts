import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

import { ProjectsService } from '../../../src/projects/projects.service';
import { Project } from '../../../src/projects/entities/project.entity';
import { User } from '../../../src/auth/entities/user.entity';
import { TestUtils, MockDataFactory, TestCleanup } from '../../test-utils';

describe('ProjectsService', () => {
  let service: ProjectsService;
  let projectRepository: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        {
          provide: getRepositoryToken(Project),
          useValue: TestUtils.createMockRepository<Project>(),
        },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
    projectRepository = module.get(getRepositoryToken(Project));
  });

  afterEach(() => {
    TestCleanup.resetAllMocks();
  });

  describe('create', () => {
    it('should successfully create a project', async () => {
      const user = MockDataFactory.createUser();
      const createProjectDto = {
        name: 'Test Project',
        description: 'Test description',
        gitRepositoryURL: 'https://github.com/test/repo.git',
      };
      const mockProject = MockDataFactory.createProject({
        ...createProjectDto,
        user,
      });

      projectRepository.create.mockReturnValue(mockProject);
      projectRepository.save.mockResolvedValue(mockProject);

      const result = await service.create(createProjectDto, user);

      expect(projectRepository.create).toHaveBeenCalledWith({
        ...createProjectDto,
        user,
      });
      expect(projectRepository.save).toHaveBeenCalledWith(mockProject);
      expect(result).toEqual(mockProject);
    });

    it('should handle repository errors during creation', async () => {
      const user = MockDataFactory.createUser();
      const createProjectDto = {
        name: 'Test Project',
        gitRepositoryURL: 'https://github.com/test/repo.git',
      };

      projectRepository.create.mockReturnValue({});
      projectRepository.save.mockRejectedValue(new Error('Database error'));

      await expect(service.create(createProjectDto, user)).rejects.toThrow('Database error');
    });
  });

  describe('findAll', () => {
    it('should return all projects for a user', async () => {
      const user = MockDataFactory.createUser();
      const mockProjects = [
        MockDataFactory.createProject({ user }),
        MockDataFactory.createProject({ user, name: 'Project 2' }),
      ];

      projectRepository.find.mockResolvedValue(mockProjects);

      const result = await service.findAll(user);

      expect(projectRepository.find).toHaveBeenCalledWith({
        where: { user: { id: user.id } },
      });
      expect(result).toEqual(mockProjects);
    });

    it('should return empty array if user has no projects', async () => {
      const user = MockDataFactory.createUser();
      projectRepository.find.mockResolvedValue([]);

      const result = await service.findAll(user);

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return project if user owns it', async () => {
      const user = MockDataFactory.createUser();
      const mockProject = MockDataFactory.createProject({ user });

      projectRepository.findOne.mockResolvedValue(mockProject);

      const result = await service.findOne(mockProject.id, user);

      expect(projectRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockProject.id, user: { id: user.id } },
      });
      expect(result).toEqual(mockProject);
    });

    it('should throw NotFoundException if project not found', async () => {
      const user = MockDataFactory.createUser();
      const projectId = 'non-existent-id';

      projectRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(projectId, user)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if user does not own project', async () => {
      const user = MockDataFactory.createUser();
      const otherUser = MockDataFactory.createUser({ id: 'other-user-id' });
      const projectId = 'test-project-id';

      projectRepository.findOne.mockResolvedValue(null); // No project found for this user

      await expect(service.findOne(projectId, user)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should successfully update project', async () => {
      const user = MockDataFactory.createUser();
      const mockProject = MockDataFactory.createProject({ user });
      const updateDto = { name: 'Updated Project Name' };
      const updatedProject = { ...mockProject, ...updateDto };

      projectRepository.findOne.mockResolvedValue(mockProject);
      projectRepository.save.mockResolvedValue(updatedProject);

      const result = await service.update(mockProject.id, updateDto, user);

      expect(projectRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockProject.id, user: { id: user.id } },
      });
      expect(projectRepository.save).toHaveBeenCalledWith(updatedProject);
      expect(result).toEqual(updatedProject);
    });

    it('should throw NotFoundException if project not found for update', async () => {
      const user = MockDataFactory.createUser();
      const projectId = 'non-existent-id';
      const updateDto = { name: 'Updated Name' };

      projectRepository.findOne.mockResolvedValue(null);

      await expect(service.update(projectId, updateDto, user)).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should successfully remove project', async () => {
      const user = MockDataFactory.createUser();
      const mockProject = MockDataFactory.createProject({ user });

      projectRepository.findOne.mockResolvedValue(mockProject);
      projectRepository.remove.mockResolvedValue(mockProject);

      const result = await service.remove(mockProject.id, user);

      expect(projectRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockProject.id, user: { id: user.id } },
      });
      expect(projectRepository.remove).toHaveBeenCalledWith(mockProject);
      expect(result).toEqual({ deleted: true, id: mockProject.id });
    });

    it('should throw NotFoundException if project not found for removal', async () => {
      const user = MockDataFactory.createUser();
      const projectId = 'non-existent-id';

      projectRepository.findOne.mockResolvedValue(null);

      await expect(service.remove(projectId, user)).rejects.toThrow(NotFoundException);
    });
  });

  describe('edge cases', () => {
    it('should handle database errors during findAll', async () => {
      const user = MockDataFactory.createUser();
      projectRepository.find.mockRejectedValue(new Error('Database connection failed'));

      await expect(service.findAll(user)).rejects.toThrow('Database connection failed');
    });

    it('should handle partial updates', async () => {
      const user = MockDataFactory.createUser();
      const mockProject = MockDataFactory.createProject({ user });
      const partialUpdate = { description: 'New description only' };
      const updatedProject = { ...mockProject, ...partialUpdate };

      projectRepository.findOne.mockResolvedValue(mockProject);
      projectRepository.save.mockResolvedValue(updatedProject);

      const result = await service.update(mockProject.id, partialUpdate, user);

      expect(result.description).toBe(partialUpdate.description);
      expect(result.name).toBe(mockProject.name); // Should remain unchanged
    });
  });
});