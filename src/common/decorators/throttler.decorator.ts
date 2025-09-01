import { SetMetadata } from '@nestjs/common';

export const THROTTLER_SKIP = 'throttler:skip';
export const THROTTLER_LIMIT = 'throttler:limit';
export const THROTTLER_TTL = 'throttler:ttl';

/**
 * Decorator to skip rate limiting for specific routes
 */
export const SkipThrottle = () => SetMetadata(THROTTLER_SKIP, true);

/**
 * Decorator to set custom rate limiting for specific routes
 * @param limit - Number of requests allowed
 * @param ttl - Time window in seconds
 */
export const CustomThrottle = (limit: number, ttl: number) => {
  return (target: any, propertyKey?: string | symbol, descriptor?: PropertyDescriptor) => {
    if (propertyKey && descriptor) {
      SetMetadata(THROTTLER_LIMIT, limit)(target, propertyKey, descriptor);
      SetMetadata(THROTTLER_TTL, ttl)(target, propertyKey, descriptor);
    }
  };
};