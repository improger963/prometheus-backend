import { Test, TestingModule } from '@nestjs/testing';

import { AppController } from '../../../src/app.controller';
import { AppService } from '../../../src/app.service';
import { TestCleanup } from '../../test-utils';

describe('AppController', () => {
  let controller: AppController;
  let appService: jest.Mocked<AppService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: AppService,
          useValue: {
            getHello: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AppController>(AppController);
    appService = module.get(AppService);
  });

  afterEach(() => {
    TestCleanup.resetAllMocks();
  });

  describe('getHello', () => {
    it('should return hello message', () => {
      const expectedMessage = 'Hello World!';
      appService.getHello.mockReturnValue(expectedMessage);

      const result = controller.getHello();

      expect(appService.getHello).toHaveBeenCalled();
      expect(result).toBe(expectedMessage);
    });

    it('should handle different hello messages', () => {
      const customMessage = 'Hello Prometheus Backend!';
      appService.getHello.mockReturnValue(customMessage);

      const result = controller.getHello();

      expect(appService.getHello).toHaveBeenCalled();
      expect(result).toBe(customMessage);
    });

    it('should handle service errors', () => {
      appService.getHello.mockImplementation(() => {
        throw new Error('Service error');
      });

      expect(() => controller.getHello()).toThrow('Service error');
      expect(appService.getHello).toHaveBeenCalled();
    });

    it('should handle empty string response', () => {
      appService.getHello.mockReturnValue('');

      const result = controller.getHello();

      expect(appService.getHello).toHaveBeenCalled();
      expect(result).toBe('');
    });

    it('should handle null response', () => {
      appService.getHello.mockReturnValue(null as any);

      const result = controller.getHello();

      expect(appService.getHello).toHaveBeenCalled();
      expect(result).toBeNull();
    });
  });

  describe('controller integration', () => {
    it('should be defined and instantiated correctly', () => {
      expect(controller).toBeDefined();
      expect(controller.getHello).toBeDefined();
      expect(typeof controller.getHello).toBe('function');
    });

    it('should have proper dependency injection', () => {
      expect(appService).toBeDefined();
      expect(appService.getHello).toBeDefined();
    });

    it('should call service method when controller method is invoked', () => {
      appService.getHello.mockReturnValue('Test Message');
      
      controller.getHello();
      
      expect(appService.getHello).toHaveBeenCalledTimes(1);
    });

    it('should return service response directly', () => {
      const testMessage = 'Direct service response';
      appService.getHello.mockReturnValue(testMessage);

      const result = controller.getHello();

      expect(result).toEqual(testMessage);
      expect(result).toBe(testMessage); // Strict equality check
    });
  });
});