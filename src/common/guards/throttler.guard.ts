import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { THROTTLER_SKIP } from '../decorators/throttler.decorator';

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  constructor(options: any, storageService: any, reflector: Reflector) {
    super(options, storageService, reflector);
  }

  protected async getTracker(req: Record<string, any>): Promise<string> {
    // Use IP address as the primary tracker
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    
    // If user is authenticated, also include user ID for more specific limiting
    if (req.user?.id) {
      return `${ip}-${req.user.id}`;
    }
    
    return ip;
  }

  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    const handler = context.getHandler();
    const classRef = context.getClass();
    
    // Check if the route is marked to skip throttling
    const skipThrottling = this.reflector.getAllAndOverride<boolean>(
      THROTTLER_SKIP,
      [handler, classRef],
    );
    
    if (skipThrottling) {
      return true;
    }

    // Skip throttling for health check endpoints
    const request = context.switchToHttp().getRequest();
    if (request.url?.includes('/health')) {
      return true;
    }

    return false;
  }
}