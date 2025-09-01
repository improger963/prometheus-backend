import { HttpException, HttpStatus } from '@nestjs/common';

export class ValidationException extends HttpException {
  constructor(message: string, details?: any) {
    super(
      {
        message,
        details,
        error: 'Validation Error',
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class BusinessLogicException extends HttpException {
  constructor(message: string, details?: any) {
    super(
      {
        message,
        details,
        error: 'Business Logic Error',
      },
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
}

export class ResourceNotFoundException extends HttpException {
  constructor(resource: string, identifier?: string) {
    const message = identifier 
      ? `${resource} with ID '${identifier}' not found`
      : `${resource} not found`;
    
    super(
      {
        message,
        error: 'Resource Not Found',
      },
      HttpStatus.NOT_FOUND,
    );
  }
}

export class UnauthorizedException extends HttpException {
  constructor(message: string = 'Authentication required') {
    super(
      {
        message,
        error: 'Unauthorized',
      },
      HttpStatus.UNAUTHORIZED,
    );
  }
}

export class ForbiddenException extends HttpException {
  constructor(message: string = 'Access denied') {
    super(
      {
        message,
        error: 'Forbidden',
      },
      HttpStatus.FORBIDDEN,
    );
  }
}

export class ConflictException extends HttpException {
  constructor(message: string, details?: any) {
    super(
      {
        message,
        details,
        error: 'Conflict',
      },
      HttpStatus.CONFLICT,
    );
  }
}

export class RateLimitException extends HttpException {
  constructor(message: string = 'Too many requests') {
    super(
      {
        message,
        error: 'Rate Limit Exceeded',
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}