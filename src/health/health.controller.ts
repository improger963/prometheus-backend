import { Controller, Get, Version } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiExcludeEndpoint
} from '@nestjs/swagger';
import { HealthService } from './health.service';
import { SkipThrottle } from '../common/decorators/throttler.decorator';
import {
  HealthCheck,
  HealthCheckResult,
} from '@nestjs/terminus';

@ApiTags('Health')
@Controller('health')
@SkipThrottle() // Skip rate limiting for health checks
export class HealthController {
  constructor(private healthService: HealthService) {}

  @Get()
  @HealthCheck()
  @ApiOperation({ 
    summary: 'Overall health check',
    description: 'Performs a comprehensive health check of all system components' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Health check completed successfully',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['ok', 'error', 'shutting_down'] },
        info: {
          type: 'object',
          additionalProperties: {
            type: 'object',
            properties: {
              status: { type: 'string' },
              message: { type: 'string' }
            }
          }
        },
        error: {
          type: 'object',
          additionalProperties: {
            type: 'object',
            properties: {
              status: { type: 'string' },
              message: { type: 'string' }
            }
          }
        },
        details: {
          type: 'object',
          additionalProperties: {
            type: 'object',
            properties: {
              status: { type: 'string' },
              message: { type: 'string' }
            }
          }
        }
      }
    }
  })
  @ApiResponse({ 
    status: 503, 
    description: 'Service unavailable - one or more health checks failed' 
  })
  async check(): Promise<HealthCheckResult> {
    return this.healthService.check();
  }

  @Get('ready')
  @HealthCheck()
  @ApiOperation({ 
    summary: 'Readiness check',
    description: 'Checks if the application is ready to serve traffic' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Application is ready',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        info: { type: 'object' },
        error: { type: 'object' },
        details: { type: 'object' }
      }
    }
  })
  @ApiResponse({ 
    status: 503, 
    description: 'Application is not ready' 
  })
  async readiness(): Promise<HealthCheckResult> {
    return this.healthService.readiness();
  }

  @Get('live')
  @HealthCheck()
  @ApiOperation({ 
    summary: 'Liveness check',
    description: 'Checks if the application is alive and responsive' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Application is alive',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        info: { type: 'object' },
        error: { type: 'object' },
        details: { type: 'object' }
      }
    }
  })
  async liveness(): Promise<HealthCheckResult> {
    return this.healthService.liveness();
  }

  @Get('info')
  @ApiOperation({ 
    summary: 'System information',
    description: 'Provides detailed system information and metrics' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'System information retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        system: {
          type: 'object',
          properties: {
            platform: { type: 'string' },
            arch: { type: 'string' },
            nodeVersion: { type: 'string' },
            uptime: { type: 'number' }
          }
        },
        memory: {
          type: 'object',
          properties: {
            used: { type: 'number' },
            total: { type: 'number' },
            free: { type: 'number' },
            percentage: { type: 'number' }
          }
        },
        database: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            connections: { type: 'number' }
          }
        },
        timestamp: { type: 'string', format: 'date-time' }
      }
    }
  })
  async getSystemInfo() {
    return this.healthService.getSystemInfo();
  }
}