import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { AuthService } from '../../../src/auth/auth.service';
import { User } from '../../../src/auth/entities/user.entity';
import { TestUtils, MockDataFactory, TestCleanup } from '../../test-utils';

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: any;
  let jwtService: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: TestUtils.createMockRepository<User>(),
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get(getRepositoryToken(User));
    jwtService = module.get(JwtService);
  });

  afterEach(() => {
    TestCleanup.resetAllMocks();
  });

  describe('signUp', () => {
    const signUpDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should successfully create a new user and return token', async () => {
      const hashedPassword = 'hashed-password';
      const mockUser = MockDataFactory.createUser({
        email: signUpDto.email,
        password: hashedPassword,
      });
      const mockToken = 'mock-jwt-token';

      userRepository.findOne.mockResolvedValue(null); // User doesn't exist
      const bcryptHashSpy = jest.spyOn(bcrypt, 'hash').mockResolvedValue(hashedPassword as never);
      userRepository.create.mockReturnValue(mockUser);
      userRepository.save.mockResolvedValue(mockUser);
      jwtService.sign.mockReturnValue(mockToken);

      const result = await service.signUp(signUpDto);

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: signUpDto.email },
      });
      expect(bcrypt.hash).toHaveBeenCalledWith(signUpDto.password, expect.any(Number));
      expect(userRepository.create).toHaveBeenCalledWith({
        email: signUpDto.email,
        password: hashedPassword,
      });
      expect(userRepository.save).toHaveBeenCalledWith(mockUser);
      expect(jwtService.sign).toHaveBeenCalledWith({
        id: mockUser.id,
        email: mockUser.email,
      });
      expect(result).toEqual({ token: mockToken });
      
      bcryptHashSpy.mockRestore();
    });

    it('should throw ConflictException if user already exists', async () => {
      const existingUser = MockDataFactory.createUser({ email: signUpDto.email });
      userRepository.findOne.mockResolvedValue(existingUser);

      await expect(service.signUp(signUpDto)).rejects.toThrow(ConflictException);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: signUpDto.email },
      });
      expect(userRepository.create).not.toHaveBeenCalled();
    });

    it('should handle bcrypt hashing errors', async () => {
      userRepository.findOne.mockResolvedValue(null);
      const bcryptHashSpy = jest.spyOn(bcrypt, 'hash').mockRejectedValue(new Error('Hashing failed') as never);

      await expect(service.signUp(signUpDto)).rejects.toThrow('Hashing failed');
      
      bcryptHashSpy.mockRestore();
    });
  });

  describe('login', () => {
    const loginDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should successfully login and return token', async () => {
      const hashedPassword = await bcrypt.hash(loginDto.password, 10);
      const mockUser = MockDataFactory.createUser({
        email: loginDto.email,
        password: hashedPassword,
      });
      const mockToken = 'mock-jwt-token';

      userRepository.findOne.mockResolvedValue(mockUser);
      const bcryptCompareSpy = jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      jwtService.sign.mockReturnValue(mockToken);

      const result = await service.login(loginDto);

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: loginDto.email },
      });
      expect(bcrypt.compare).toHaveBeenCalledWith(loginDto.password, mockUser.password);
      expect(jwtService.sign).toHaveBeenCalledWith({
        id: mockUser.id,
        email: mockUser.email,
      });
      expect(result).toEqual({ token: mockToken });
      
      bcryptCompareSpy.mockRestore();
    });

    it('should throw UnauthorizedException if user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: loginDto.email },
      });
    });

    it('should throw UnauthorizedException if password is invalid', async () => {
      const mockUser = MockDataFactory.createUser({ email: loginDto.email });
      userRepository.findOne.mockResolvedValue(mockUser);
      const bcryptCompareSpy = jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      expect(bcrypt.compare).toHaveBeenCalledWith(loginDto.password, mockUser.password);
      
      bcryptCompareSpy.mockRestore();
    });
  });

  describe('edge cases', () => {
    it('should handle database connection errors during signup', async () => {
      const signUpDto = { email: 'test@example.com', password: 'password123' };
      userRepository.findOne.mockRejectedValue(new Error('Database connection failed'));

      await expect(service.signUp(signUpDto)).rejects.toThrow('Database connection failed');
    });

    it('should handle database connection errors during login', async () => {
      const loginDto = { email: 'test@example.com', password: 'password123' };
      userRepository.findOne.mockRejectedValue(new Error('Database connection failed'));

      await expect(service.login(loginDto)).rejects.toThrow('Database connection failed');
    });

    it('should handle JWT signing errors', async () => {
      const signUpDto = { email: 'test@example.com', password: 'password123' };
      const mockUser = MockDataFactory.createUser();

      userRepository.findOne.mockResolvedValue(null);
      const bcryptHashSpy = jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashed-password' as never);
      userRepository.create.mockReturnValue(mockUser);
      userRepository.save.mockResolvedValue(mockUser);
      jwtService.sign.mockImplementation(() => {
        throw new Error('JWT signing failed');
      });

      await expect(service.signUp(signUpDto)).rejects.toThrow('JWT signing failed');
      
      bcryptHashSpy.mockRestore();
    });
  });
});