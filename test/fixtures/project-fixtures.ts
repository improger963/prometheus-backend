import { Project } from '../../src/projects/entities/project.entity';
import { UserFixtures } from './user-fixtures';

/**
 * Project fixtures for testing
 */
export class ProjectFixtures {
  /**
   * Standard test project
   */
  static readonly STANDARD_PROJECT: Partial<Project> = {
    id: 'project-001',
    name: 'Standard Test Project',
    description: 'A comprehensive project for testing standard functionality',
    gitRepositoryURL: 'https://github.com/test/standard-project.git',
    agentIds: [],
    user: UserFixtures.STANDARD_USER as any,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  };

  /**
   * Project with agents assigned
   */
  static readonly PROJECT_WITH_AGENTS: Partial<Project> = {
    id: 'project-002',
    name: 'Project with AI Agents',
    description: 'Test project with multiple AI agents assigned',
    gitRepositoryURL: 'https://github.com/test/agents-project.git',
    agentIds: ['agent-001', 'agent-002', 'agent-003'],
    user: UserFixtures.STANDARD_USER as any,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  };

  /**
   * Large enterprise project
   */
  static readonly ENTERPRISE_PROJECT: Partial<Project> = {
    id: 'project-enterprise',
    name: 'Enterprise Scale Project',
    description: 'Large-scale enterprise project with complex requirements and multiple teams',
    gitRepositoryURL: 'https://github.com/enterprise/large-scale-system.git',
    agentIds: ['agent-001', 'agent-002', 'agent-003', 'agent-004', 'agent-005'],
    user: UserFixtures.ADMIN_USER as any,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  };

  /**
   * Multiple projects for different scenarios
   */
  static readonly MULTIPLE_PROJECTS: Partial<Project>[] = [
    {
      id: 'project-multi-001',
      name: 'Frontend Web Application',
      description: 'React-based frontend application with modern UI/UX',
      gitRepositoryURL: 'https://github.com/test/frontend-app.git',
      agentIds: ['agent-frontend-001', 'agent-ui-002'],
      user: UserFixtures.TEAM_USERS[0] as any,
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-01T00:00:00Z'),
    },
    {
      id: 'project-multi-002',
      name: 'Backend API Service',
      description: 'RESTful API service with microservices architecture',
      gitRepositoryURL: 'https://github.com/test/backend-api.git',
      agentIds: ['agent-backend-001', 'agent-database-002'],
      user: UserFixtures.TEAM_USERS[1] as any,
      createdAt: new Date('2024-01-01T01:00:00Z'),
      updatedAt: new Date('2024-01-01T01:00:00Z'),
    },
    {
      id: 'project-multi-003',
      name: 'Mobile Application',
      description: 'Cross-platform mobile app using React Native',
      gitRepositoryURL: 'https://github.com/test/mobile-app.git',
      agentIds: ['agent-mobile-001'],
      user: UserFixtures.TEAM_USERS[2] as any,
      createdAt: new Date('2024-01-01T02:00:00Z'),
      updatedAt: new Date('2024-01-01T02:00:00Z'),
    },
  ];

  /**
   * Invalid project data for testing validation
   */
  static readonly INVALID_PROJECTS = {
    EMPTY_NAME: {
      name: '',
      description: 'Project with empty name',
      gitRepositoryURL: 'https://github.com/test/empty-name.git',
    },
    INVALID_GIT_URL: {
      name: 'Invalid Git URL Project',
      description: 'Project with invalid git repository URL',
      gitRepositoryURL: 'not-a-valid-url',
    },
    MISSING_NAME: {
      description: 'Project missing name field',
      gitRepositoryURL: 'https://github.com/test/missing-name.git',
    },
    VERY_LONG_NAME: {
      name: 'A'.repeat(300), // Extremely long name
      description: 'Project with very long name',
      gitRepositoryURL: 'https://github.com/test/long-name.git',
    },
    SPECIAL_CHARACTERS: {
      name: 'Project <script>alert("xss")</script>',
      description: 'Project with XSS attempt in name',
      gitRepositoryURL: 'https://github.com/test/xss-test.git',
    },
  };

  /**
   * Generate a unique test project
   */
  static generateProject(overrides: Partial<Project> = {}): Partial<Project> {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    
    return {
      id: `project-${timestamp}-${random}`,
      name: `Test Project ${timestamp}`,
      description: `Generated test project for automated testing - ${random}`,
      gitRepositoryURL: `https://github.com/test/project-${timestamp}-${random}.git`,
      agentIds: [],
      user: UserFixtures.STANDARD_USER as any,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  /**
   * Generate multiple unique test projects
   */
  static generateProjects(count: number, baseOverrides: Partial<Project> = {}): Partial<Project>[] {
    return Array.from({ length: count }, (_, index) => 
      ProjectFixtures.generateProject({
        ...baseOverrides,
        id: `${baseOverrides.id || 'project'}-${index + 1}`,
        name: `${baseOverrides.name || 'Test Project'} ${index + 1}`,
      })
    );
  }

  /**
   * Create project DTOs from project fixtures
   */
  static getCreateProjectDto(project: Partial<Project>) {
    return {
      name: project.name,
      description: project.description,
      gitRepositoryURL: project.gitRepositoryURL,
    };
  }

  /**
   * Create update project DTOs
   */
  static getUpdateProjectDto(updates: Partial<Project>) {
    const dto: any = {};
    if (updates.name !== undefined) dto.name = updates.name;
    if (updates.description !== undefined) dto.description = updates.description;
    if (updates.gitRepositoryURL !== undefined) dto.gitRepositoryURL = updates.gitRepositoryURL;
    return dto;
  }

  /**
   * Project scenarios for workflow testing
   */
  static readonly WORKFLOW_SCENARIOS = {
    EMPTY_TO_FULL: {
      initial: ProjectFixtures.generateProject({ agentIds: [] }),
      agentsToAdd: ['agent-001', 'agent-002', 'agent-003'],
      expectedFinalAgentCount: 3,
    },
    TEAM_RESTRUCTURE: {
      initial: ProjectFixtures.generateProject({ agentIds: ['agent-001', 'agent-002'] }),
      agentsToRemove: ['agent-001'],
      agentsToAdd: ['agent-003', 'agent-004'],
      expectedFinalAgentCount: 3,
    },
    SCALE_UP: {
      initial: ProjectFixtures.generateProject({ agentIds: ['agent-001'] }),
      agentsToAdd: ['agent-002', 'agent-003', 'agent-004', 'agent-005'],
      expectedFinalAgentCount: 5,
    },
    SCALE_DOWN: {
      initial: ProjectFixtures.generateProject({ 
        agentIds: ['agent-001', 'agent-002', 'agent-003', 'agent-004', 'agent-005'] 
      }),
      agentsToRemove: ['agent-002', 'agent-003', 'agent-004'],
      expectedFinalAgentCount: 2,
    },
  };
}