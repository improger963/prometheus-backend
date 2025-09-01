import { Agent } from '../../src/agents/entities/agent.entity';
import { UserFixtures } from './user-fixtures';

/**
 * Agent fixtures for testing with proper UUIDs
 */
export class AgentFixtures {
  /**
   * Standard test agent
   */
  static readonly STANDARD_AGENT: Partial<Agent> = {
    id: '550e8400-e29b-41d4-a716-446655440001',
    name: 'Standard Test Agent',
    role: 'A versatile AI agent for general testing purposes',
    personalityMatrix: {
      creativity: 0.7,
      analytical: 0.8,
      empathy: 0.6,
      systemPrompt: 'You are a helpful assistant specialized in software development and testing.',
    },
    llmConfig: {
      provider: 'openai',
      model: 'gpt-4',
      temperature: 0.7,
      maxTokens: 4000,
    },
    rating: 4.5,
    experience: 150,
    userId: UserFixtures.STANDARD_USER.id as string,
    user: UserFixtures.STANDARD_USER as any,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  };

  /**
   * Specialized frontend agent
   */
  static readonly FRONTEND_AGENT: Partial<Agent> = {
    id: '550e8400-e29b-41d4-a716-446655440002',
    name: 'Frontend Specialist Agent',
    role: 'Expert in React, TypeScript, and modern frontend technologies',
    personalityMatrix: {
      creativity: 0.9,
      analytical: 0.7,
      empathy: 0.8,
      systemPrompt: 'You are a frontend development expert specializing in React, TypeScript, CSS, and modern web technologies.',
      capabilities: ['react', 'typescript', 'css', 'html', 'ui-design'],
    },
    llmConfig: {
      provider: 'openai',
      model: 'gpt-4',
      temperature: 0.6,
      maxTokens: 4000,
    },
    rating: 4.8,
    experience: 200,
    userId: UserFixtures.STANDARD_USER.id as string,
    user: UserFixtures.STANDARD_USER as any,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  };

  /**
   * Backend specialist agent
   */
  static readonly BACKEND_AGENT: Partial<Agent> = {
    id: '550e8400-e29b-41d4-a716-446655440003',
    name: 'Backend Specialist Agent',
    role: 'Expert in Node.js, databases, and API development',
    personalityMatrix: {
      creativity: 0.6,
      analytical: 0.9,
      empathy: 0.7,
      systemPrompt: 'You are a backend development expert specializing in Node.js, Express, databases, and API design.',
      capabilities: ['nodejs', 'express', 'database', 'api-design', 'microservices'],
    },
    llmConfig: {
      provider: 'openai',
      model: 'gpt-4',
      temperature: 0.7,
      maxTokens: 4000,
    },
    rating: 4.7,
    experience: 180,
    userId: UserFixtures.STANDARD_USER.id as string,
    user: UserFixtures.STANDARD_USER as any,
    createdAt: new Date('2024-01-01T01:00:00Z'),
    updatedAt: new Date('2024-01-01T01:00:00Z'),
  };

  /**
   * QA and testing specialist
   */
  static readonly QA_AGENT: Partial<Agent> = {
    id: '550e8400-e29b-41d4-a716-446655440004',
    name: 'QA Testing Agent',
    role: 'Specialized in quality assurance, testing strategies, and bug detection',
    personalityMatrix: {
      creativity: 0.5,
      analytical: 0.9,
      empathy: 0.8,
      systemPrompt: 'You are a QA expert specializing in test planning, automation, and quality assurance processes.',
      capabilities: ['testing', 'qa', 'automation', 'debugging', 'test-planning'],
    },
    llmConfig: {
      provider: 'openai',
      model: 'gpt-3.5-turbo',
      temperature: 0.5,
      maxTokens: 3000,
    },
    rating: 4.3,
    experience: 120,
    userId: UserFixtures.STANDARD_USER.id as string,
    user: UserFixtures.STANDARD_USER as any,
    createdAt: new Date('2024-01-01T02:00:00Z'),
    updatedAt: new Date('2024-01-01T02:00:00Z'),
  };

  /**
   * DevOps and infrastructure agent
   */
  static readonly DEVOPS_AGENT: Partial<Agent> = {
    id: '550e8400-e29b-41d4-a716-446655440005',
    name: 'DevOps Infrastructure Agent',
    role: 'Expert in CI/CD, containerization, and cloud infrastructure',
    personalityMatrix: {
      creativity: 0.7,
      analytical: 0.9,
      empathy: 0.6,
      systemPrompt: 'You are a DevOps expert specializing in CI/CD pipelines, Docker, Kubernetes, and cloud infrastructure.',
      capabilities: ['docker', 'kubernetes', 'ci-cd', 'aws', 'infrastructure'],
    },
    llmConfig: {
      provider: 'openai',
      model: 'gpt-4',
      temperature: 0.6,
      maxTokens: 4000,
    },
    rating: 4.6,
    experience: 160,
    userId: UserFixtures.ADMIN_USER.id as string,
    user: UserFixtures.ADMIN_USER as any,
    createdAt: new Date('2024-01-01T03:00:00Z'),
    updatedAt: new Date('2024-01-01T03:00:00Z'),
  };

  /**
   * Multiple agents for team scenarios
   */
  static readonly TEAM_AGENTS: Partial<Agent>[] = [
    AgentFixtures.FRONTEND_AGENT,
    AgentFixtures.BACKEND_AGENT,
    AgentFixtures.QA_AGENT,
    {
      id: 'agent-team-004',
      name: 'Database Specialist',
      role: 'Expert in database design and optimization',
      personalityMatrix: {
        creativity: 0.5,
        analytical: 0.9,
        empathy: 0.6,
        systemPrompt: 'You are a database expert specializing in PostgreSQL, MongoDB, and database optimization.',
        capabilities: ['postgresql', 'mongodb', 'database-design', 'optimization'],
      },
      llmConfig: {
        provider: 'openai',
        model: 'gpt-4',
        temperature: 0.5,
        maxTokens: 4000,
      },
      rating: 4.4,
      experience: 140,
      user: UserFixtures.TEAM_USERS[0] as any,
      createdAt: new Date('2024-01-01T04:00:00Z'),
      updatedAt: new Date('2024-01-01T04:00:00Z'),
    },
    {
      id: 'agent-team-005',
      name: 'Security Specialist',
      role: 'Expert in application security and penetration testing',
      personalityMatrix: {
        creativity: 0.6,
        analytical: 0.9,
        empathy: 0.5,
        systemPrompt: 'You are a security expert specializing in application security, penetration testing, and secure coding practices.',
        capabilities: ['security', 'penetration-testing', 'secure-coding', 'authentication'],
      },
      llmConfig: {
        provider: 'openai',
        model: 'gpt-4',
        temperature: 0.4,
        maxTokens: 4000,
      },
      rating: 4.9,
      experience: 220,
      user: UserFixtures.TEAM_USERS[1] as any,
      createdAt: new Date('2024-01-01T05:00:00Z'),
      updatedAt: new Date('2024-01-01T05:00:00Z'),
    },
  ];

  /**
   * Agents with different experience levels
   */
  static readonly EXPERIENCE_LEVELS = {
    JUNIOR: {
      id: 'agent-junior',
      name: 'Junior Developer Agent',
      role: 'Learning-focused agent for simple tasks',
      personalityMatrix: {
        creativity: 0.6,
        analytical: 0.5,
        empathy: 0.8,
        systemPrompt: 'You are a junior developer learning the basics of programming.',
        capabilities: ['basic-coding', 'learning'],
      },
      llmConfig: {
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        temperature: 0.8,
        maxTokens: 2000,
      },
      rating: 3.2,
      experience: 25,
      user: UserFixtures.STANDARD_USER as any,
    },
    SENIOR: {
      id: 'agent-senior',
      name: 'Senior Architect Agent',
      role: 'Highly experienced agent for complex architecture decisions',
      personalityMatrix: {
        creativity: 0.8,
        analytical: 0.9,
        empathy: 0.7,
        systemPrompt: 'You are a senior software architect with extensive experience in system design.',
        capabilities: ['architecture', 'system-design', 'mentoring', 'complex-problem-solving'],
      },
      llmConfig: {
        provider: 'openai',
        model: 'gpt-4',
        temperature: 0.6,
        maxTokens: 5000,
      },
      rating: 4.9,
      experience: 500,
      user: UserFixtures.ADMIN_USER as any,
    },
    EXPERT: {
      id: 'agent-expert',
      name: 'Expert Consultant Agent',
      role: 'Top-tier expert for the most challenging problems',
      personalityMatrix: {
        creativity: 0.9,
        analytical: 0.9,
        empathy: 0.8,
        systemPrompt: 'You are an expert consultant with world-class expertise in software engineering.',
        capabilities: ['expert-consultation', 'innovation', 'research', 'thought-leadership'],
      },
      llmConfig: {
        provider: 'openai',
        model: 'gpt-4',
        temperature: 0.7,
        maxTokens: 6000,
      },
      rating: 5.0,
      experience: 1000,
      user: UserFixtures.ADMIN_USER as any,
    },
  };

  /**
   * Invalid agent data for testing validation
   */
  static readonly INVALID_AGENTS = {
    EMPTY_NAME: {
      name: '',
      role: 'Agent with empty name',
      personalityMatrix: {
        systemPrompt: 'Test agent',
      },
      llmConfig: {
        provider: 'openai' as const,
        model: 'gpt-4',
      },
    },
    INVALID_MODEL: {
      name: 'Invalid Model Agent',
      role: 'Agent with invalid model',
      personalityMatrix: {
        systemPrompt: 'Test agent',
      },
      llmConfig: {
        provider: 'openai' as const,
        model: 'nonexistent-model',
      },
    },
    MISSING_LLM_CONFIG: {
      name: 'Missing LLM Config Agent',
      role: 'Agent without LLM config',
    },
    EMPTY_ROLE: {
      name: 'No Role Agent',
      role: '',
      personalityMatrix: {
        systemPrompt: 'Test agent',
      },
      llmConfig: {
        provider: 'openai' as const,
        model: 'gpt-4',
      },
    },
    NEGATIVE_RATING: {
      name: 'Negative Rating Agent',
      role: 'Agent with invalid negative rating',
      personalityMatrix: {
        systemPrompt: 'Test agent',
      },
      llmConfig: {
        provider: 'openai' as const,
        model: 'gpt-4',
      },
      rating: -1,
    },
    EXCESSIVE_RATING: {
      name: 'Excessive Rating Agent',
      role: 'Agent with rating above maximum',
      personalityMatrix: {
        systemPrompt: 'Test agent',
      },
      llmConfig: {
        provider: 'openai' as const,
        model: 'gpt-4',
      },
      rating: 6,
    },
  };

  /**
   * Generate a unique test agent
   */
  static generateAgent(overrides: Partial<Agent> = {}): Partial<Agent> {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    
    return {
      id: `agent-${timestamp}-${random}`,
      name: `Test Agent ${timestamp}`,
      role: `Generated test agent for automated testing - ${random}`,
      personalityMatrix: {
        creativity: 0.7,
        analytical: 0.7,
        empathy: 0.7,
        systemPrompt: 'You are a helpful assistant for testing purposes.',
        capabilities: ['testing', 'automation'],
      },
      llmConfig: {
        provider: 'openai',
        model: 'gpt-4',
        temperature: 0.7,
        maxTokens: 4000,
      },
      rating: Math.round((Math.random() * 4 + 1) * 10) / 10, // Random rating 1-5, rounded to 1 decimal
      experience: Math.floor(Math.random() * 500), // Random experience 0-499
      user: UserFixtures.STANDARD_USER as any,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  /**
   * Generate multiple unique test agents
   */
  static generateAgents(count: number, baseOverrides: Partial<Agent> = {}): Partial<Agent>[] {
    return Array.from({ length: count }, (_, index) => 
      AgentFixtures.generateAgent({
        ...baseOverrides,
        id: `${baseOverrides.id || 'agent'}-${index + 1}`,
        name: `${baseOverrides.name || 'Test Agent'} ${index + 1}`,
      })
    );
  }

  /**
   * Create agent DTOs from agent fixtures
   */
  static getCreateAgentDto(agent: Partial<Agent>) {
    return {
      name: agent.name,
      role: agent.role,
      personalityMatrix: agent.personalityMatrix,
      llmConfig: agent.llmConfig,
    };
  }

  /**
   * Create update agent DTOs
   */
  static getUpdateAgentDto(updates: Partial<Agent>) {
    const dto: any = {};
    if (updates.name !== undefined) dto.name = updates.name;
    if (updates.role !== undefined) dto.role = updates.role;
    if (updates.personalityMatrix !== undefined) dto.personalityMatrix = updates.personalityMatrix;
    if (updates.llmConfig !== undefined) dto.llmConfig = updates.llmConfig;
    return dto;
  }

  /**
   * Rating scenarios for testing
   */
  static readonly RATING_SCENARIOS = {
    PERFECT_AGENT: { ...AgentFixtures.EXPERIENCE_LEVELS.EXPERT, rating: 5.0 },
    AVERAGE_AGENT: { ...AgentFixtures.STANDARD_AGENT, rating: 3.0 },
    POOR_AGENT: { ...AgentFixtures.EXPERIENCE_LEVELS.JUNIOR, rating: 1.5 },
    UNRATED_AGENT: { ...AgentFixtures.generateAgent(), rating: 0.0, experience: 0 },
  };

  /**
   * Model type scenarios
   */
  static readonly MODEL_SCENARIOS = {
    GPT4_AGENTS: AgentFixtures.TEAM_AGENTS.filter(agent => agent.llmConfig?.model === 'gpt-4'),
    GPT35_AGENTS: AgentFixtures.TEAM_AGENTS.filter(agent => agent.llmConfig?.model === 'gpt-3.5-turbo'),
    MIXED_MODELS: [
      { ...AgentFixtures.STANDARD_AGENT, llmConfig: { ...AgentFixtures.STANDARD_AGENT.llmConfig, model: 'gpt-4' } },
      { ...AgentFixtures.QA_AGENT, llmConfig: { ...AgentFixtures.QA_AGENT.llmConfig, model: 'gpt-3.5-turbo' } },
      { ...AgentFixtures.generateAgent(), llmConfig: { provider: 'openai' as const, model: 'claude-3' } },
    ],
  };

  /**
   * Capability-based agent groups
   */
  static readonly CAPABILITY_GROUPS = {
    FRONTEND_TEAM: AgentFixtures.generateAgents(3, {
      personalityMatrix: {
        creativity: 0.8,
        analytical: 0.7,
        empathy: 0.8,
        capabilities: ['react', 'typescript', 'css', 'html'],
      },
      llmConfig: {
        provider: 'openai',
        model: 'gpt-4',
      },
    }),
    BACKEND_TEAM: AgentFixtures.generateAgents(3, {
      personalityMatrix: {
        creativity: 0.6,
        analytical: 0.9,
        empathy: 0.7,
        capabilities: ['nodejs', 'express', 'database', 'api-design'],
      },
      llmConfig: {
        provider: 'openai',
        model: 'gpt-4',
      },
    }),
    FULLSTACK_TEAM: AgentFixtures.generateAgents(2, {
      personalityMatrix: {
        creativity: 0.7,
        analytical: 0.8,
        empathy: 0.7,
        capabilities: ['react', 'nodejs', 'typescript', 'database'],
      },
      llmConfig: {
        provider: 'openai',
        model: 'gpt-4',
      },
    }),
  };
}