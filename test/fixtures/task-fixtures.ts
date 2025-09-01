import { Task, TaskStatus, TaskPriority } from '../../src/tasks/entities/task.entity';
import { ProjectFixtures } from './project-fixtures';
import { AgentFixtures } from './agent-fixtures';

/**
 * Task fixtures for testing
 */
export class TaskFixtures {
  /**
   * Standard test task
   */
  static readonly STANDARD_TASK: Partial<Task> = {
    id: 'task-001',
    title: 'Standard Test Task',
    description: 'A comprehensive task for testing standard functionality',
    status: TaskStatus.PENDING,
    priority: TaskPriority.MEDIUM,
    assigneeIds: ['agent-001'],
    project: ProjectFixtures.STANDARD_PROJECT as any,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  };

  /**
   * High priority urgent task
   */
  static readonly URGENT_TASK: Partial<Task> = {
    id: 'task-urgent',
    title: 'Critical Bug Fix',
    description: 'Urgent task to fix a critical bug in production system',
    status: TaskStatus.PENDING,
    priority: TaskPriority.URGENT,
    assigneeIds: ['agent-001', 'agent-002'],
    project: ProjectFixtures.STANDARD_PROJECT as any,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  };

  /**
   * Low priority maintenance task
   */
  static readonly MAINTENANCE_TASK: Partial<Task> = {
    id: 'task-maintenance',
    title: 'Code Refactoring',
    description: 'Low priority task to refactor legacy code for better maintainability',
    status: TaskStatus.PENDING,
    priority: TaskPriority.LOW,
    assigneeIds: ['agent-003'],
    project: ProjectFixtures.STANDARD_PROJECT as any,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  };

  /**
   * Task in progress
   */
  static readonly IN_PROGRESS_TASK: Partial<Task> = {
    id: 'task-in-progress',
    title: 'Feature Implementation',
    description: 'Currently being worked on by the assigned agent',
    status: TaskStatus.IN_PROGRESS,
    priority: TaskPriority.HIGH,
    assigneeIds: ['agent-001'],
    project: ProjectFixtures.STANDARD_PROJECT as any,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T01:00:00Z'),
  };

  /**
   * Completed task
   */
  static readonly COMPLETED_TASK: Partial<Task> = {
    id: 'task-completed',
    title: 'Database Schema Design',
    description: 'Successfully completed database schema design task',
    status: TaskStatus.COMPLETED,
    priority: TaskPriority.HIGH,
    assigneeIds: ['agent-002'],
    project: ProjectFixtures.STANDARD_PROJECT as any,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T02:00:00Z'),
  };

  /**
   * Failed task
   */
  static readonly FAILED_TASK: Partial<Task> = {
    id: 'task-failed',
    title: 'Integration Test Setup',
    description: 'Task that failed due to configuration issues',
    status: TaskStatus.FAILED,
    priority: TaskPriority.MEDIUM,
    assigneeIds: ['agent-003'],
    project: ProjectFixtures.STANDARD_PROJECT as any,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T03:00:00Z'),
  };

  /**
   * Task with multiple assignees
   */
  static readonly TEAM_TASK: Partial<Task> = {
    id: 'task-team',
    title: 'Full Stack Feature Development',
    description: 'Complex task requiring multiple agents with different specializations',
    status: TaskStatus.IN_PROGRESS,
    priority: TaskPriority.HIGH,
    assigneeIds: ['agent-frontend-001', 'agent-backend-001', 'agent-qa-001'],
    project: ProjectFixtures.PROJECT_WITH_AGENTS as any,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T01:00:00Z'),
  };

  /**
   * Unassigned task
   */
  static readonly UNASSIGNED_TASK: Partial<Task> = {
    id: 'task-unassigned',
    title: 'Research Task',
    description: 'Task without any assigned agents yet',
    status: TaskStatus.PENDING,
    priority: TaskPriority.LOW,
    assigneeIds: [],
    project: ProjectFixtures.STANDARD_PROJECT as any,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  };

  /**
   * Tasks for different workflow stages
   */
  static readonly WORKFLOW_TASKS: Partial<Task>[] = [
    {
      id: 'task-workflow-001',
      title: 'Project Planning',
      description: 'Initial project planning and requirements gathering',
      status: TaskStatus.COMPLETED,
      priority: TaskPriority.HIGH,
      assigneeIds: ['agent-001'],
      project: ProjectFixtures.MULTIPLE_PROJECTS[0] as any,
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-01T02:00:00Z'),
    },
    {
      id: 'task-workflow-002',
      title: 'UI/UX Design',
      description: 'Design user interface and user experience',
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.HIGH,
      assigneeIds: ['agent-frontend-001'],
      project: ProjectFixtures.MULTIPLE_PROJECTS[0] as any,
      createdAt: new Date('2024-01-01T01:00:00Z'),
      updatedAt: new Date('2024-01-01T03:00:00Z'),
    },
    {
      id: 'task-workflow-003',
      title: 'API Development',
      description: 'Develop RESTful API endpoints',
      status: TaskStatus.PENDING,
      priority: TaskPriority.HIGH,
      assigneeIds: ['agent-backend-001'],
      project: ProjectFixtures.MULTIPLE_PROJECTS[1] as any,
      createdAt: new Date('2024-01-01T02:00:00Z'),
      updatedAt: new Date('2024-01-01T02:00:00Z'),
    },
    {
      id: 'task-workflow-004',
      title: 'Testing & QA',
      description: 'Comprehensive testing of developed features',
      status: TaskStatus.PENDING,
      priority: TaskPriority.MEDIUM,
      assigneeIds: ['agent-qa-001'],
      project: ProjectFixtures.MULTIPLE_PROJECTS[0] as any,
      createdAt: new Date('2024-01-01T03:00:00Z'),
      updatedAt: new Date('2024-01-01T03:00:00Z'),
    },
  ];

  /**
   * Invalid task data for testing validation
   */
  static readonly INVALID_TASKS = {
    EMPTY_TITLE: {
      title: '',
      description: 'Task with empty title',
      priority: TaskPriority.MEDIUM,
    },
    INVALID_PRIORITY: {
      title: 'Invalid Priority Task',
      description: 'Task with invalid priority value',
      priority: 'SUPER_URGENT' as any, // Invalid priority
    },
    INVALID_STATUS: {
      title: 'Invalid Status Task',
      description: 'Task with invalid status value',
      status: 'ALMOST_DONE' as any, // Invalid status
    },
    MISSING_TITLE: {
      description: 'Task missing title field',
      priority: TaskPriority.MEDIUM,
    },
    VERY_LONG_TITLE: {
      title: 'A'.repeat(500), // Extremely long title
      description: 'Task with very long title',
      priority: TaskPriority.MEDIUM,
    },
    INVALID_ASSIGNEES: {
      title: 'Invalid Assignees Task',
      description: 'Task with invalid assignee IDs',
      assigneeIds: ['not-a-uuid', 'another-invalid-id'],
      priority: TaskPriority.MEDIUM,
    },
  };

  /**
   * Generate a unique test task
   */
  static generateTask(overrides: Partial<Task> = {}): Partial<Task> {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    
    return {
      id: `task-${timestamp}-${random}`,
      title: `Test Task ${timestamp}`,
      description: `Generated test task for automated testing - ${random}`,
      status: TaskStatus.PENDING,
      priority: TaskPriority.MEDIUM,
      assigneeIds: ['agent-001'],
      project: ProjectFixtures.STANDARD_PROJECT as any,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  /**
   * Generate multiple unique test tasks
   */
  static generateTasks(count: number, baseOverrides: Partial<Task> = {}): Partial<Task>[] {
    return Array.from({ length: count }, (_, index) => 
      TaskFixtures.generateTask({
        ...baseOverrides,
        id: `${baseOverrides.id || 'task'}-${index + 1}`,
        title: `${baseOverrides.title || 'Test Task'} ${index + 1}`,
      })
    );
  }

  /**
   * Create task DTOs from task fixtures
   */
  static getCreateTaskDto(task: Partial<Task>) {
    return {
      title: task.title,
      description: task.description,
      priority: task.priority,
      assigneeIds: task.assigneeIds,
    };
  }

  /**
   * Create update task DTOs
   */
  static getUpdateTaskDto(updates: Partial<Task>) {
    const dto: any = {};
    if (updates.title !== undefined) dto.title = updates.title;
    if (updates.description !== undefined) dto.description = updates.description;
    if (updates.status !== undefined) dto.status = updates.status;
    if (updates.priority !== undefined) dto.priority = updates.priority;
    if (updates.assigneeIds !== undefined) dto.assigneeIds = updates.assigneeIds;
    return dto;
  }

  /**
   * Task status progression scenarios
   */
  static readonly STATUS_PROGRESSIONS = {
    NORMAL_FLOW: [
      TaskStatus.PENDING,
      TaskStatus.IN_PROGRESS,
      TaskStatus.COMPLETED,
    ],
    FAILED_FLOW: [
      TaskStatus.PENDING,
      TaskStatus.IN_PROGRESS,
      TaskStatus.FAILED,
    ],
    RETRY_FLOW: [
      TaskStatus.PENDING,
      TaskStatus.IN_PROGRESS,
      TaskStatus.FAILED,
      TaskStatus.PENDING,
      TaskStatus.IN_PROGRESS,
      TaskStatus.COMPLETED,
    ],
  };

  /**
   * Priority-based task groups
   */
  static readonly PRIORITY_GROUPS = {
    URGENT_TASKS: TaskFixtures.generateTasks(3, { priority: TaskPriority.URGENT }),
    HIGH_TASKS: TaskFixtures.generateTasks(5, { priority: TaskPriority.HIGH }),
    MEDIUM_TASKS: TaskFixtures.generateTasks(8, { priority: TaskPriority.MEDIUM }),
    LOW_TASKS: TaskFixtures.generateTasks(4, { priority: TaskPriority.LOW }),
  };

  /**
   * Assignment scenarios
   */
  static readonly ASSIGNMENT_SCENARIOS = {
    SINGLE_AGENT: TaskFixtures.generateTask({ assigneeIds: ['agent-001'] }),
    MULTIPLE_AGENTS: TaskFixtures.generateTask({ 
      assigneeIds: ['agent-001', 'agent-002', 'agent-003']
    }),
    NO_AGENTS: TaskFixtures.generateTask({ assigneeIds: [] }),
    LARGE_TEAM: TaskFixtures.generateTask({ 
      assigneeIds: Array.from({ length: 10 }, (_, i) => `agent-${i + 1}`)
    }),
  };

  /**
   * Sprint/timeline scenarios
   */
  static readonly SPRINT_SCENARIOS = {
    SPRINT_1_TASKS: TaskFixtures.generateTasks(5, {
      createdAt: new Date('2024-01-01T00:00:00Z'),
      priority: TaskPriority.HIGH,
    }),
    SPRINT_2_TASKS: TaskFixtures.generateTasks(7, {
      createdAt: new Date('2024-01-15T00:00:00Z'),
      priority: TaskPriority.MEDIUM,
    }),
    BACKLOG_TASKS: TaskFixtures.generateTasks(15, {
      createdAt: new Date('2024-01-01T00:00:00Z'),
      priority: TaskPriority.LOW,
      status: TaskStatus.PENDING,
    }),
  };
}