import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';

import { TasksController } from '../../../src/tasks/tasks.controller';
import { TasksService } from '../../../src/tasks/tasks.service';
import { MockDataFactory, TestCleanup } from '../../test-utils';

describe('TasksController', () => {
  let controller: TasksController;
  let tasksService: jest.Mocked<TasksService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TasksController],
      providers: [
        {
          provide: TasksService,
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

    controller = module.get<TasksController>(TasksController);
    tasksService = module.get(TasksService);
  });

  afterEach(() => {
    TestCleanup.resetAllMocks();
  });

  describe('create', () => {
    it('should create a new task', async () => {
      const mockUser = MockDataFactory.createUser();
      const projectId = 'test-project-id';
      const createTaskDto = {
        title: 'Test Task',
        description: 'Test task description',
        priority: 'HIGH' as const,
        assigneeIds: ['agent-id-1'],
      };
      const mockTask = MockDataFactory.createTask(createTaskDto);

      tasksService.create.mockResolvedValue(mockTask);

      const result = await controller.create(projectId, createTaskDto, { user: mockUser });

      expect(tasksService.create).toHaveBeenCalledWith(projectId, createTaskDto, mockUser);
      expect(result).toEqual(mockTask);
    });

    it('should handle service errors during creation', async () => {
      const mockUser = MockDataFactory.createUser();
      const projectId = 'test-project-id';
      const createTaskDto = {
        title: 'Test Task',
        description: 'Test description',
      };

      tasksService.create.mockRejectedValue(new Error('Service error'));

      await expect(controller.create(projectId, createTaskDto, { user: mockUser }))
        .rejects.toThrow('Service error');
    });

    it('should handle project not found during creation', async () => {
      const mockUser = MockDataFactory.createUser();
      const projectId = 'non-existent-project';
      const createTaskDto = {
        title: 'Test Task',
        description: 'Test description',
      };

      tasksService.create.mockRejectedValue(new NotFoundException('Project not found'));

      await expect(controller.create(projectId, createTaskDto, { user: mockUser }))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return all tasks for a project', async () => {
      const mockUser = MockDataFactory.createUser();
      const projectId = 'test-project-id';
      const mockTasks = [
        MockDataFactory.createTask(),
        MockDataFactory.createTask({ title: 'Task 2' }),
      ];

      tasksService.findAll.mockResolvedValue(mockTasks);

      const result = await controller.findAll(projectId, { user: mockUser });

      expect(tasksService.findAll).toHaveBeenCalledWith(projectId, mockUser);
      expect(result).toEqual(mockTasks);
    });

    it('should return empty array when no tasks exist', async () => {
      const mockUser = MockDataFactory.createUser();
      const projectId = 'test-project-id';

      tasksService.findAll.mockResolvedValue([]);

      const result = await controller.findAll(projectId, { user: mockUser });

      expect(result).toEqual([]);
    });

    it('should handle project not found', async () => {
      const mockUser = MockDataFactory.createUser();
      const projectId = 'non-existent-project';

      tasksService.findAll.mockRejectedValue(new NotFoundException('Project not found'));

      await expect(controller.findAll(projectId, { user: mockUser }))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('findOne', () => {
    it('should return a specific task', async () => {
      const mockUser = MockDataFactory.createUser();
      const projectId = 'test-project-id';
      const taskId = 'test-task-id';
      const mockTask = MockDataFactory.createTask();

      tasksService.findOne.mockResolvedValue(mockTask);

      const result = await controller.findOne(projectId, taskId, { user: mockUser });

      expect(tasksService.findOne).toHaveBeenCalledWith(projectId, taskId, mockUser);
      expect(result).toEqual(mockTask);
    });

    it('should handle task not found', async () => {
      const mockUser = MockDataFactory.createUser();
      const projectId = 'test-project-id';
      const taskId = 'non-existent-task';

      tasksService.findOne.mockRejectedValue(new NotFoundException('Task not found'));

      await expect(controller.findOne(projectId, taskId, { user: mockUser }))
        .rejects.toThrow(NotFoundException);
    });

    it('should handle project not found', async () => {
      const mockUser = MockDataFactory.createUser();
      const projectId = 'non-existent-project';
      const taskId = 'test-task-id';

      tasksService.findOne.mockRejectedValue(new NotFoundException('Project not found'));

      await expect(controller.findOne(projectId, taskId, { user: mockUser }))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a task', async () => {
      const mockUser = MockDataFactory.createUser();
      const projectId = 'test-project-id';
      const taskId = 'test-task-id';
      const updateDto = { 
        title: 'Updated Task Title',
        status: 'IN_PROGRESS' as const 
      };
      const mockUpdatedTask = MockDataFactory.createTask({ 
        title: 'Updated Task Title',
        status: 'IN_PROGRESS' 
      });

      tasksService.update.mockResolvedValue(mockUpdatedTask);

      const result = await controller.update(projectId, taskId, updateDto, { user: mockUser });

      expect(tasksService.update).toHaveBeenCalledWith(projectId, taskId, updateDto, mockUser);
      expect(result).toEqual(mockUpdatedTask);
    });

    it('should handle partial updates', async () => {
      const mockUser = MockDataFactory.createUser();
      const projectId = 'test-project-id';
      const taskId = 'test-task-id';
      const updateDto = { priority: 'LOW' as const };
      const mockUpdatedTask = MockDataFactory.createTask({ priority: 'LOW' });

      tasksService.update.mockResolvedValue(mockUpdatedTask);

      const result = await controller.update(projectId, taskId, updateDto, { user: mockUser });

      expect(tasksService.update).toHaveBeenCalledWith(projectId, taskId, updateDto, mockUser);
      expect(result).toEqual(mockUpdatedTask);
    });

    it('should handle task not found during update', async () => {
      const mockUser = MockDataFactory.createUser();
      const projectId = 'test-project-id';
      const taskId = 'non-existent-task';
      const updateDto = { title: 'Updated Title' };

      tasksService.update.mockRejectedValue(new NotFoundException('Task not found'));

      await expect(controller.update(projectId, taskId, updateDto, { user: mockUser }))
        .rejects.toThrow(NotFoundException);
    });

    it('should handle project not found during update', async () => {
      const mockUser = MockDataFactory.createUser();
      const projectId = 'non-existent-project';
      const taskId = 'test-task-id';
      const updateDto = { title: 'Updated Title' };

      tasksService.update.mockRejectedValue(new NotFoundException('Project not found'));

      await expect(controller.update(projectId, taskId, updateDto, { user: mockUser }))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete a task', async () => {
      const mockUser = MockDataFactory.createUser();
      const projectId = 'test-project-id';
      const taskId = 'test-task-id';
      const deleteResult = { deleted: true, id: taskId };

      tasksService.remove.mockResolvedValue(deleteResult);

      const result = await controller.remove(projectId, taskId, { user: mockUser });

      expect(tasksService.remove).toHaveBeenCalledWith(projectId, taskId, mockUser);
      expect(result).toEqual(deleteResult);
    });

    it('should handle task not found during deletion', async () => {
      const mockUser = MockDataFactory.createUser();
      const projectId = 'test-project-id';
      const taskId = 'non-existent-task';

      tasksService.remove.mockRejectedValue(new NotFoundException('Task not found'));

      await expect(controller.remove(projectId, taskId, { user: mockUser }))
        .rejects.toThrow(NotFoundException);
    });

    it('should handle project not found during deletion', async () => {
      const mockUser = MockDataFactory.createUser();
      const projectId = 'non-existent-project';
      const taskId = 'test-task-id';

      tasksService.remove.mockRejectedValue(new NotFoundException('Project not found'));

      await expect(controller.remove(projectId, taskId, { user: mockUser }))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('edge cases', () => {
    it('should handle different task priorities', async () => {
      const mockUser = MockDataFactory.createUser();
      const projectId = 'test-project-id';
      const priorities: Array<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'> = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

      for (const priority of priorities) {
        const createTaskDto = {
          title: `${priority} Priority Task`,
          description: 'Test description',
          priority,
        };
        const mockTask = MockDataFactory.createTask({ priority });

        tasksService.create.mockResolvedValue(mockTask);

        const result = await controller.create(projectId, createTaskDto, { user: mockUser });

        expect(result.priority).toBe(priority);
      }
    });

    it('should handle different task statuses', async () => {
      const mockUser = MockDataFactory.createUser();
      const projectId = 'test-project-id';
      const taskId = 'test-task-id';
      const statuses: Array<'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'COMPLETED' | 'CANCELLED'> = 
        ['TODO', 'IN_PROGRESS', 'REVIEW', 'COMPLETED', 'CANCELLED'];

      for (const status of statuses) {
        const updateDto = { status };
        const mockUpdatedTask = MockDataFactory.createTask({ status });

        tasksService.update.mockResolvedValue(mockUpdatedTask);

        const result = await controller.update(projectId, taskId, updateDto, { user: mockUser });

        expect(result.status).toBe(status);
      }
    });

    it('should handle empty assignee list', async () => {
      const mockUser = MockDataFactory.createUser();
      const projectId = 'test-project-id';
      const createTaskDto = {
        title: 'Unassigned Task',
        description: 'Task with no assignees',
        assigneeIds: [],
      };
      const mockTask = MockDataFactory.createTask({ assignees: [] });

      tasksService.create.mockResolvedValue(mockTask);

      const result = await controller.create(projectId, createTaskDto, { user: mockUser });

      expect(tasksService.create).toHaveBeenCalledWith(projectId, createTaskDto, mockUser);
      expect(result).toEqual(mockTask);
    });

    it('should handle multiple assignees', async () => {
      const mockUser = MockDataFactory.createUser();
      const projectId = 'test-project-id';
      const createTaskDto = {
        title: 'Multi-assigned Task',
        description: 'Task with multiple assignees',
        assigneeIds: ['agent-1', 'agent-2', 'agent-3'],
      };
      const mockTask = MockDataFactory.createTask({ assignees: [] });

      tasksService.create.mockResolvedValue(mockTask);

      const result = await controller.create(projectId, createTaskDto, { user: mockUser });

      expect(tasksService.create).toHaveBeenCalledWith(projectId, createTaskDto, mockUser);
      expect(result).toEqual(mockTask);
    });

    it('should handle empty update objects', async () => {
      const mockUser = MockDataFactory.createUser();
      const projectId = 'test-project-id';
      const taskId = 'test-task-id';
      const updateDto = {}; // Empty update
      const mockTask = MockDataFactory.createTask();

      tasksService.update.mockResolvedValue(mockTask);

      const result = await controller.update(projectId, taskId, updateDto, { user: mockUser });

      expect(tasksService.update).toHaveBeenCalledWith(projectId, taskId, updateDto, mockUser);
      expect(result).toEqual(mockTask);
    });
  });
});