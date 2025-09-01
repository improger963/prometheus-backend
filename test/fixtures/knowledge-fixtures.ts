import { KnowledgeRecord } from '../../src/knowledge/entities/knowledge-record.entity';
import { UserFixtures } from './user-fixtures';

/**
 * Knowledge fixtures for testing
 */
export class KnowledgeFixtures {
  /**
   * Standard test knowledge record
   */
  static readonly STANDARD_KNOWLEDGE: Partial<KnowledgeRecord> = {
    id: 'knowledge-001',
    title: 'Introduction to NestJS Testing',
    content: 'This is a comprehensive guide to testing NestJS applications. It covers unit tests, integration tests, and end-to-end testing strategies. Testing is crucial for maintaining code quality and ensuring reliable applications.',
    tags: ['nestjs', 'testing', 'javascript', 'backend'],
    visibility: 'public',
    category: 'technical',
    useCount: 25,
    rating: 4.5,
    ratingCount: 8,
    user: UserFixtures.STANDARD_USER as any,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  };

  /**
   * Advanced technical knowledge
   */
  static readonly ADVANCED_KNOWLEDGE: Partial<KnowledgeRecord> = {
    id: 'knowledge-advanced',
    title: 'Advanced Database Optimization Techniques',
    content: 'Deep dive into database optimization strategies including indexing, query optimization, connection pooling, and performance monitoring. Covers PostgreSQL, MongoDB, and Redis optimization patterns.',
    tags: ['database', 'optimization', 'postgresql', 'mongodb', 'performance'],
    visibility: 'public',
    category: 'technical',
    useCount: 45,
    rating: 4.8,
    ratingCount: 15,
    user: UserFixtures.ADMIN_USER as any,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  };

  /**
   * Private knowledge record
   */
  static readonly PRIVATE_KNOWLEDGE: Partial<KnowledgeRecord> = {
    id: 'knowledge-private',
    title: 'Internal Team Processes',
    content: 'Internal documentation about team workflows, code review processes, and deployment procedures. This information is confidential and should not be shared publicly.',
    tags: ['internal', 'processes', 'team', 'confidential'],
    visibility: 'private',
    category: 'general',
    useCount: 12,
    rating: 4.2,
    ratingCount: 5,
    user: UserFixtures.STANDARD_USER as any,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  };

  /**
   * Beginner-friendly knowledge
   */
  static readonly BEGINNER_KNOWLEDGE: Partial<KnowledgeRecord> = {
    id: 'knowledge-beginner',
    title: 'Getting Started with JavaScript',
    content: 'A beginner-friendly introduction to JavaScript programming. Covers basic syntax, variables, functions, and common programming patterns. Perfect for developers just starting their journey.',
    tags: ['javascript', 'beginner', 'programming', 'tutorial'],
    visibility: 'public',
    category: 'tutorial',
    useCount: 150,
    rating: 4.3,
    ratingCount: 32,
    user: UserFixtures.TEAM_USERS[0] as any,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  };

  /**
   * Business process knowledge
   */
  static readonly BUSINESS_KNOWLEDGE: Partial<KnowledgeRecord> = {
    id: 'knowledge-business',
    title: 'Agile Project Management Best Practices',
    content: 'Comprehensive guide to implementing Agile methodologies in software development teams. Covers Scrum, Kanban, sprint planning, and continuous improvement strategies.',
    tags: ['agile', 'scrum', 'project-management', 'methodology'],
    visibility: 'public',
    category: 'best-practice',
    useCount: 78,
    rating: 4.6,
    ratingCount: 22,
    user: UserFixtures.ADMIN_USER as any,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  };

  /**
   * Knowledge with no ratings
   */
  static readonly UNRATED_KNOWLEDGE: Partial<KnowledgeRecord> = {
    id: 'knowledge-unrated',
    title: 'New Framework Overview',
    content: 'Recently published overview of a new web development framework. Still gathering community feedback and usage data.',
    tags: ['framework', 'new', 'web-development'],
    visibility: 'public',
    category: 'technical',
    useCount: 3,
    rating: 0.0,
    ratingCount: 0,
    user: UserFixtures.TEAM_USERS[1] as any,
    createdAt: new Date('2024-01-15T00:00:00Z'),
    updatedAt: new Date('2024-01-15T00:00:00Z'),
  };

  /**
   * Multiple knowledge records for search testing
   */
  static readonly SEARCH_KNOWLEDGE: Partial<KnowledgeRecord>[] = [
    {
      id: 'knowledge-search-001',
      title: 'React Hooks Guide',
      content: 'Complete guide to React Hooks including useState, useEffect, useContext, and custom hooks. Learn how to build modern React applications.',
      tags: ['react', 'hooks', 'frontend', 'javascript'],
      visibility: 'public',
      category: 'technical',
      useCount: 89,
      rating: 4.7,
      ratingCount: 18,
      user: UserFixtures.STANDARD_USER as any,
    },
    {
      id: 'knowledge-search-002',
      title: 'Node.js Best Practices',
      content: 'Essential Node.js best practices for building scalable backend applications. Covers error handling, security, performance, and deployment.',
      tags: ['nodejs', 'backend', 'javascript', 'best-practices'],
      visibility: 'public',
      category: 'technical',
      useCount: 67,
      rating: 4.4,
      ratingCount: 12,
      user: UserFixtures.TEAM_USERS[0] as any,
    },
    {
      id: 'knowledge-search-003',
      title: 'TypeScript for Beginners',
      content: 'Introduction to TypeScript for JavaScript developers. Learn about type annotations, interfaces, generics, and how to migrate existing projects.',
      tags: ['typescript', 'javascript', 'beginner', 'programming'],
      visibility: 'public',
      category: 'tutorial',
      useCount: 134,
      rating: 4.5,
      ratingCount: 28,
      user: UserFixtures.TEAM_USERS[1] as any,
    },
    {
      id: 'knowledge-search-004',
      title: 'Docker Containerization Guide',
      content: 'Learn how to containerize applications using Docker. Covers Dockerfile creation, image optimization, and deployment strategies.',
      tags: ['docker', 'containerization', 'devops', 'deployment'],
      visibility: 'public',
      category: 'technical',
      useCount: 56,
      rating: 4.6,
      ratingCount: 14,
      user: UserFixtures.ADMIN_USER as any,
    },
    {
      id: 'knowledge-search-005',
      title: 'API Design Principles',
      content: 'Best practices for designing RESTful APIs. Covers resource naming, HTTP methods, status codes, versioning, and documentation.',
      tags: ['api', 'rest', 'design', 'backend'],
      visibility: 'public',
      category: 'technical',
      useCount: 43,
      rating: 4.3,
      ratingCount: 9,
      user: UserFixtures.TEAM_USERS[2] as any,
    },
  ];

  /**
   * Invalid knowledge data for testing validation
   */
  static readonly INVALID_KNOWLEDGE = {
    EMPTY_TITLE: {
      title: '',
      content: 'Knowledge with empty title',
      visibility: 'public',
    },
    EMPTY_CONTENT: {
      title: 'Empty Content Knowledge',
      content: '',
      visibility: 'public',
    },
    INVALID_VISIBILITY: {
      title: 'Invalid Visibility Knowledge',
      content: 'Knowledge with invalid visibility setting',
      visibility: 'restricted' as any, // Invalid visibility
    },
    MISSING_TITLE: {
      content: 'Knowledge missing title field',
      visibility: 'public',
    },
    MISSING_CONTENT: {
      title: 'Missing Content Knowledge',
      visibility: 'public',
    },
    NEGATIVE_RATING: {
      title: 'Negative Rating Knowledge',
      content: 'Knowledge with invalid negative rating',
      rating: -1,
      visibility: 'public',
    },
    EXCESSIVE_RATING: {
      title: 'Excessive Rating Knowledge',
      content: 'Knowledge with rating above maximum',
      rating: 6,
      visibility: 'public',
    },
    INVALID_TAGS: {
      title: 'Invalid Tags Knowledge',
      content: 'Knowledge with invalid tags format',
      tags: 'not-an-array' as any, // Should be array
      visibility: 'public',
    },
  };

  /**
   * Generate a unique test knowledge record
   */
  static generateKnowledge(overrides: Partial<KnowledgeRecord> = {}): Partial<KnowledgeRecord> {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    
    return {
      id: `knowledge-${timestamp}-${random}`,
      title: `Test Knowledge ${timestamp}`,
      content: `Generated test knowledge content for automated testing - ${random}. This is a comprehensive guide that covers various aspects of the topic.`,
      tags: ['test', 'generated', 'automation'],
      visibility: 'public',
      category: 'general',
      useCount: Math.floor(Math.random() * 100),
      rating: Math.round((Math.random() * 4 + 1) * 10) / 10, // Random rating 1-5
      ratingCount: Math.floor(Math.random() * 20),
      user: UserFixtures.STANDARD_USER as any,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  /**
   * Generate multiple unique test knowledge records
   */
  static generateKnowledgeRecords(count: number, baseOverrides: Partial<KnowledgeRecord> = {}): Partial<KnowledgeRecord>[] {
    return Array.from({ length: count }, (_, index) => 
      KnowledgeFixtures.generateKnowledge({
        ...baseOverrides,
        id: `${baseOverrides.id || 'knowledge'}-${index + 1}`,
        title: `${baseOverrides.title || 'Test Knowledge'} ${index + 1}`,
      })
    );
  }

  /**
   * Create knowledge DTOs from knowledge fixtures
   */
  static getCreateKnowledgeDto(knowledge: Partial<KnowledgeRecord>) {
    return {
      title: knowledge.title,
      content: knowledge.content,
      tags: knowledge.tags,
      visibility: knowledge.visibility,
      category: knowledge.category,
    };
  }

  /**
   * Create update knowledge DTOs
   */
  static getUpdateKnowledgeDto(updates: Partial<KnowledgeRecord>) {
    const dto: any = {};
    if (updates.title !== undefined) dto.title = updates.title;
    if (updates.content !== undefined) dto.content = updates.content;
    if (updates.tags !== undefined) dto.tags = updates.tags;
    if (updates.visibility !== undefined) dto.visibility = updates.visibility;
    if (updates.category !== undefined) dto.category = updates.category;
    return dto;
  }

  /**
   * Category-based knowledge groups
   */
  static readonly CATEGORY_GROUPS = {
    TECHNICAL: KnowledgeFixtures.generateKnowledgeRecords(5, { category: 'technical' }),
    BUSINESS: KnowledgeFixtures.generateKnowledgeRecords(3, { category: 'best-practice' }),
    EDUCATIONAL: KnowledgeFixtures.generateKnowledgeRecords(4, { category: 'tutorial' }),
    DOCUMENTATION: KnowledgeFixtures.generateKnowledgeRecords(2, { category: 'general' }),
  };

  /**
   * Visibility-based knowledge groups
   */
  static readonly VISIBILITY_GROUPS = {
    PUBLIC: KnowledgeFixtures.generateKnowledgeRecords(8, { visibility: 'public' }),
    PRIVATE: KnowledgeFixtures.generateKnowledgeRecords(3, { visibility: 'private' }),
  };

  /**
   * Rating scenarios for testing
   */
  static readonly RATING_SCENARIOS = {
    HIGH_RATED: KnowledgeFixtures.generateKnowledge({ rating: 4.8, ratingCount: 25 }),
    AVERAGE_RATED: KnowledgeFixtures.generateKnowledge({ rating: 3.2, ratingCount: 12 }),
    LOW_RATED: KnowledgeFixtures.generateKnowledge({ rating: 1.5, ratingCount: 8 }),
    UNRATED: KnowledgeFixtures.generateKnowledge({ rating: 0.0, ratingCount: 0 }),
  };

  /**
   * Popular knowledge scenarios
   */
  static readonly POPULARITY_SCENARIOS = {
    VIRAL: KnowledgeFixtures.generateKnowledge({ useCount: 500, rating: 4.9, ratingCount: 45 }),
    POPULAR: KnowledgeFixtures.generateKnowledge({ useCount: 150, rating: 4.5, ratingCount: 28 }),
    MODERATE: KnowledgeFixtures.generateKnowledge({ useCount: 50, rating: 4.0, ratingCount: 12 }),
    NICHE: KnowledgeFixtures.generateKnowledge({ useCount: 5, rating: 4.2, ratingCount: 3 }),
    UNUSED: KnowledgeFixtures.generateKnowledge({ useCount: 0, rating: 0.0, ratingCount: 0 }),
  };

  /**
   * Tag-based search scenarios
   */
  static readonly TAG_SCENARIOS = {
    FRONTEND_TAGS: ['react', 'vue', 'angular', 'javascript', 'typescript', 'css', 'html'],
    BACKEND_TAGS: ['nodejs', 'express', 'nestjs', 'database', 'api', 'microservices'],
    DEVOPS_TAGS: ['docker', 'kubernetes', 'ci-cd', 'aws', 'deployment', 'monitoring'],
    TESTING_TAGS: ['jest', 'testing', 'automation', 'e2e', 'unit-test', 'integration'],
    MIXED_TAGS: ['javascript', 'docker', 'testing', 'api', 'react', 'database'],
  };
}