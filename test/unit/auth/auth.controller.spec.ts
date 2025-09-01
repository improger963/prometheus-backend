import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from '../../../src/auth/auth.controller';
import { AuthService } from '../../../src/auth/auth.service';
import { LoginDto } from '../../../src/auth/dto/login.dto';
import { SignUpDto } from '../../../src/auth/dto/signup.dto';
import { UserFixtures, TestCleanup } from '../../test-utils';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            signUp: jest.fn(),
            login: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    TestCleanup.resetAllMocks();
  });

  describe('signUp', () => {
    it('should successfully register a new user', async () => {
      const signUpDto = UserFixtures.getSignupDto(UserFixtures.generateUser()) as SignUpDto;
      const mockResponse = { token: 'mock-jwt-token' };

      jest.spyOn(authService, 'signUp').mockResolvedValue(mockResponse);

      const result = await controller.signUp(signUpDto);

      expect(authService.signUp).toHaveBeenCalledWith(signUpDto);
      expect(result).toEqual(mockResponse);
    });

    it('should handle signup errors', async () => {
      const signUpDto = UserFixtures.getSignupDto(UserFixtures.generateUser()) as SignUpDto;
      const error = new Error('Email already exists');

      jest.spyOn(authService, 'signUp').mockRejectedValue(error);

      await expect(controller.signUp(signUpDto)).rejects.toThrow(error);
      expect(authService.signUp).toHaveBeenCalledWith(signUpDto);
    });

    it('should handle invalid signup data', async () => {
      const invalidSignUpDto = UserFixtures.INVALID_USERS.INVALID_EMAIL;

      jest.spyOn(authService, 'signUp').mockRejectedValue(new Error('Invalid email'));

      await expect(controller.signUp(invalidSignUpDto)).rejects.toThrow('Invalid email');
    });
  });

  describe('login', () => {
    it('should successfully authenticate user', async () => {
      const loginDto = UserFixtures.getLoginDto(UserFixtures.STANDARD_USER) as LoginDto;
      const mockResponse = { token: 'mock-jwt-token' };

      jest.spyOn(authService, 'login').mockResolvedValue(mockResponse);

      const result = await controller.login(loginDto);

      expect(authService.login).toHaveBeenCalledWith(loginDto);
      expect(result).toEqual(mockResponse);
    });

    it('should handle login with invalid credentials', async () => {
      const loginDto = { email: 'wrong@email.com', password: 'wrongpassword' };
      const error = new Error('Invalid credentials');

      jest.spyOn(authService, 'login').mockRejectedValue(error);

      await expect(controller.login(loginDto)).rejects.toThrow(error);
      expect(authService.login).toHaveBeenCalledWith(loginDto);
    });

    it('should handle service errors during login', async () => {
      const loginDto = UserFixtures.getLoginDto(UserFixtures.STANDARD_USER) as LoginDto;
      const error = new Error('Database connection failed');

      jest.spyOn(authService, 'login').mockRejectedValue(error);

      await expect(controller.login(loginDto)).rejects.toThrow(error);
    });
  });

  describe('controller validation', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('should have signUp method', () => {
      expect(controller.signUp).toBeDefined();
      expect(typeof controller.signUp).toBe('function');
    });

    it('should have login method', () => {
      expect(controller.login).toBeDefined();
      expect(typeof controller.login).toBe('function');
    });
  });
});