/**
 * Central export for all test fixtures
 * This file provides easy access to all test data and utilities
 */

// Import fixtures to use within this file
import { UserFixtures } from './user-fixtures';
import { ProjectFixtures } from './project-fixtures';
import { AgentFixtures } from './agent-fixtures';
import { TaskFixtures } from './task-fixtures';
import { KnowledgeFixtures } from './knowledge-fixtures';

// Re-export all fixtures
export { UserFixtures } from './user-fixtures';
export { ProjectFixtures } from './project-fixtures';
export { AgentFixtures } from './agent-fixtures';
export { TaskFixtures } from './task-fixtures';
export { KnowledgeFixtures } from './knowledge-fixtures';

/**
 * Complete test scenario builder
 * Creates related test data for complex scenarios
 */
export class TestScenarioBuilder {
  /**
   * Create a complete project scenario with user, project, agents, and tasks
   */
  static createCompleteProjectScenario() {
    const user = UserFixtures.generateUser();
    const project = ProjectFixtures.generateProject({ user: user as any });
    const agents = AgentFixtures.generateAgents(3, { user: user as any });
    const tasks = TaskFixtures.generateTasks(5, { 
      project: project as any,
      assigneeIds: agents.map(agent => agent.id!).filter(Boolean),
    });

    return {
      user,
      project,
      agents,
      tasks,
      // Helper methods
      getAgentIds: () => agents.map(agent => agent.id),
      getTaskIds: () => tasks.map(task => task.id),
      getProjectId: () => project.id,
      getUserId: () => user.id,
    };
  }

  /**
   * Create a team collaboration scenario
   */
  static createTeamScenario() {
    const teamLead = UserFixtures.TEAM_USERS[0];
    const developers = UserFixtures.TEAM_USERS.slice(1);
    
    const projects = ProjectFixtures.MULTIPLE_PROJECTS;
    const agents = AgentFixtures.TEAM_AGENTS;
    const tasks = TaskFixtures.WORKFLOW_TASKS;
    const knowledge = KnowledgeFixtures.SEARCH_KNOWLEDGE;

    return {
      teamLead,
      developers,
      projects,
      agents,
      tasks,
      knowledge,
      // Helper methods
      getAllUsers: () => [teamLead, ...developers],
      getProjectsByUser: (userId: string) => projects.filter(p => p.user?.id === userId),
      getAgentsByUser: (userId: string) => agents.filter(a => a.user?.id === userId),
    };
  }

  /**
   * Create an E2E testing scenario with authentication flow
   */
  static createE2EScenario() {
    const testUser = UserFixtures.generateUser();
    const loginDto = UserFixtures.getLoginDto(testUser);
    const signupDto = UserFixtures.getSignupDto(testUser);
    
    const project = ProjectFixtures.generateProject({ user: testUser as any });
    const projectDto = ProjectFixtures.getCreateProjectDto(project);
    
    const agent = AgentFixtures.generateAgent({ user: testUser as any });
    const agentDto = AgentFixtures.getCreateAgentDto(agent);
    
    const task = TaskFixtures.generateTask({ 
      project: project as any,
      assigneeIds: [agent.id!],
    });
    const taskDto = TaskFixtures.getCreateTaskDto(task);
    
    const knowledge = KnowledgeFixtures.generateKnowledge({ user: testUser as any });
    const knowledgeDto = KnowledgeFixtures.getCreateKnowledgeDto(knowledge);

    return {
      user: testUser,
      auth: { loginDto, signupDto },
      project: { entity: project, dto: projectDto },
      agent: { entity: agent, dto: agentDto },
      task: { entity: task, dto: taskDto },
      knowledge: { entity: knowledge, dto: knowledgeDto },
    };
  }

  /**
   * Create a performance testing scenario with large datasets
   */
  static createPerformanceScenario() {
    const users = UserFixtures.generateUsers(10);
    const projects = ProjectFixtures.generateProjects(25);
    const agents = AgentFixtures.generateAgents(50);
    const tasks = TaskFixtures.generateTasks(100);
    const knowledge = KnowledgeFixtures.generateKnowledgeRecords(75);

    return {
      users,
      projects,
      agents,
      tasks,
      knowledge,
      // Statistics
      stats: {
        totalUsers: users.length,
        totalProjects: projects.length,
        totalAgents: agents.length,
        totalTasks: tasks.length,
        totalKnowledge: knowledge.length,
        totalEntities: users.length + projects.length + agents.length + tasks.length + knowledge.length,
      },
    };
  }

  /**
   * Create a security testing scenario with edge cases
   */
  static createSecurityScenario() {
    return {
      validUser: UserFixtures.STANDARD_USER,
      maliciousUsers: [
        UserFixtures.generateUser({ email: '<script>alert("xss")</script>@test.com' }),
        UserFixtures.generateUser({ email: 'sql-injection@test.com\'; DROP TABLE users; --' }),
      ],
      invalidData: {
        users: UserFixtures.INVALID_USERS,
        projects: ProjectFixtures.INVALID_PROJECTS,
        agents: AgentFixtures.INVALID_AGENTS,
        tasks: TaskFixtures.INVALID_TASKS,
        knowledge: KnowledgeFixtures.INVALID_KNOWLEDGE,
      },
      crossUserAccess: {
        user1: UserFixtures.TEAM_USERS[0],
        user2: UserFixtures.TEAM_USERS[1],
        user1Project: ProjectFixtures.generateProject({ user: UserFixtures.TEAM_USERS[0] as any }),
        user2Agent: AgentFixtures.generateAgent({ user: UserFixtures.TEAM_USERS[1] as any }),
      },
    };
  }

  /**
   * Create a workflow testing scenario
   */
  static createWorkflowScenario() {
    const project = ProjectFixtures.WORKFLOW_SCENARIOS.EMPTY_TO_FULL.initial;
    const agentsToAdd = AgentFixtures.CAPABILITY_GROUPS.FULLSTACK_TEAM;
    const tasks = TaskFixtures.WORKFLOW_TASKS;
    
    return {
      project,
      agentsToAdd,
      tasks,
      workflow: {
        steps: [
          'Create project',
          'Add agents to team',
          'Create tasks',
          'Assign tasks to agents',
          'Monitor progress',
          'Complete tasks',
        ],
        expectedOutcomes: {
          projectCreated: true,
          agentsAssigned: agentsToAdd.length,
          tasksCreated: tasks.length,
          teamSize: agentsToAdd.length,
        },
      },
    };
  }

  /**
   * Create a search and filtering scenario
   */
  static createSearchScenario() {
    const knowledge = KnowledgeFixtures.SEARCH_KNOWLEDGE;
    const agents = AgentFixtures.TEAM_AGENTS;
    const projects = ProjectFixtures.MULTIPLE_PROJECTS;
    
    return {
      knowledge,
      agents,
      projects,
      searchTerms: {
        knowledge: ['react', 'javascript', 'backend', 'docker'],
        agents: ['frontend', 'backend', 'qa', 'devops'],
        projects: ['web', 'api', 'mobile'],
      },
      filters: {
        knowledgeCategories: ['technical', 'business', 'educational'],
        agentModels: ['gpt-4', 'gpt-3.5-turbo'],
        taskStatuses: ['PENDING', 'IN_PROGRESS', 'COMPLETED'],
      },
    };
  }
}

/**
 * Quick access to common test data sets
 */
export const CommonTestData = {
  // Standard entities for simple tests
  user: UserFixtures.STANDARD_USER,
  project: ProjectFixtures.STANDARD_PROJECT,
  agent: AgentFixtures.STANDARD_AGENT,
  task: TaskFixtures.STANDARD_TASK,
  knowledge: KnowledgeFixtures.STANDARD_KNOWLEDGE,

  // Collections for list operations
  users: UserFixtures.TEAM_USERS,
  projects: ProjectFixtures.MULTIPLE_PROJECTS,
  agents: AgentFixtures.TEAM_AGENTS,
  tasks: TaskFixtures.WORKFLOW_TASKS,
  knowledgeRecords: KnowledgeFixtures.SEARCH_KNOWLEDGE,

  // Invalid data for validation tests
  invalidData: {
    user: UserFixtures.INVALID_USERS.INVALID_EMAIL,
    project: ProjectFixtures.INVALID_PROJECTS.EMPTY_NAME,
    agent: AgentFixtures.INVALID_AGENTS.EMPTY_NAME,
    task: TaskFixtures.INVALID_TASKS.EMPTY_TITLE,
    knowledge: KnowledgeFixtures.INVALID_KNOWLEDGE.EMPTY_CONTENT,
  },

  // Authentication data
  auth: {
    validLogin: UserFixtures.getLoginDto(UserFixtures.STANDARD_USER),
    validSignup: UserFixtures.getSignupDto(UserFixtures.generateUser()),
    invalidLogin: { email: 'nonexistent@test.com', password: 'wrongpassword' },
  },
};

/**
 * Test data generators for dynamic content
 */
export const TestDataGenerators = {
  user: UserFixtures.generateUser,
  users: UserFixtures.generateUsers,
  project: ProjectFixtures.generateProject,
  projects: ProjectFixtures.generateProjects,
  agent: AgentFixtures.generateAgent,
  agents: AgentFixtures.generateAgents,
  task: TaskFixtures.generateTask,
  tasks: TaskFixtures.generateTasks,
  knowledge: KnowledgeFixtures.generateKnowledge,
  knowledgeRecords: KnowledgeFixtures.generateKnowledgeRecords,
};