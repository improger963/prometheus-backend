import { User } from '../../src/auth/entities/user.entity';
import * as bcrypt from 'bcrypt';

/**
 * User fixtures for testing
 */
export class UserFixtures {
  static readonly DEFAULT_PASSWORD = 'password123';
  static readonly HASHED_PASSWORD = bcrypt.hashSync(UserFixtures.DEFAULT_PASSWORD, 10);

  /**
   * Standard test user
   */
  static readonly STANDARD_USER: Partial<User> = {
    id: '550e8400-e29b-41d4-a716-446655440010',
    email: 'test.user@example.com',
    password: UserFixtures.HASHED_PASSWORD,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  };

  /**
   * Admin test user
   */
  static readonly ADMIN_USER: Partial<User> = {
    id: '550e8400-e29b-41d4-a716-446655440011',
    email: 'admin@example.com',
    password: UserFixtures.HASHED_PASSWORD,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  };

  /**
   * Multiple test users for team scenarios
   */
  static readonly TEAM_USERS: Partial<User>[] = [
    {
      id: '550e8400-e29b-41d4-a716-446655440012',
      email: 'team.lead@example.com',
      password: UserFixtures.HASHED_PASSWORD,
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-01T00:00:00Z'),
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440013',
      email: 'developer1@example.com',
      password: UserFixtures.HASHED_PASSWORD,
      createdAt: new Date('2024-01-01T01:00:00Z'),
      updatedAt: new Date('2024-01-01T01:00:00Z'),
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440014',
      email: 'developer2@example.com',
      password: UserFixtures.HASHED_PASSWORD,
      createdAt: new Date('2024-01-01T02:00:00Z'),
      updatedAt: new Date('2024-01-01T02:00:00Z'),
    },
  ];

  /**
   * Invalid user data for testing validation
   */
  static readonly INVALID_USERS = {
    EMPTY_EMAIL: {
      email: '',
      password: UserFixtures.DEFAULT_PASSWORD,
    },
    INVALID_EMAIL: {
      email: 'not-an-email',
      password: UserFixtures.DEFAULT_PASSWORD,
    },
    WEAK_PASSWORD: {
      email: 'weak.password@example.com',
      password: '123',
    },
    MISSING_PASSWORD: {
      email: 'missing.password@example.com',
    },
    MISSING_EMAIL: {
      password: UserFixtures.DEFAULT_PASSWORD,
    },
  };

  /**
   * Generate a unique test user
   */
  static generateUser(overrides: Partial<User> = {}): Partial<User> {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    
    return {
      id: `user-${timestamp}-${random}`,
      email: `test.${timestamp}.${random}@example.com`,
      password: UserFixtures.HASHED_PASSWORD,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  /**
   * Generate multiple unique test users
   */
  static generateUsers(count: number, baseOverrides: Partial<User> = {}): Partial<User>[] {
    return Array.from({ length: count }, (_, index) => 
      UserFixtures.generateUser({
        ...baseOverrides,
        id: `${baseOverrides.id || 'user'}-${index + 1}`,
        email: `test.user.${index + 1}@example.com`,
      })
    );
  }

  /**
   * Create login DTOs from user fixtures
   */
  static getLoginDto(user: Partial<User>) {
    return {
      email: user.email,
      password: UserFixtures.DEFAULT_PASSWORD, // Always use plain password for login
    };
  }

  /**
   * Create signup DTOs from user fixtures
   */
  static getSignupDto(user: Partial<User>) {
    return {
      email: user.email,
      password: UserFixtures.DEFAULT_PASSWORD, // Always use plain password for signup
    };
  }
}