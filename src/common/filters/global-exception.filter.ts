import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { QueryFailedError } from 'typeorm';

export interface ErrorResponse {
  statusCode: number;
  timestamp: string;
  path: string;
  message: string;
  details?: any;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    const errorResponse = this.buildErrorResponse(exception, request);
    
    // Log the error for debugging
    this.logError(exception, request, errorResponse);

    response.status(errorResponse.statusCode).json(errorResponse);
  }

  private buildErrorResponse(exception: unknown, request: any): ErrorResponse {
    const timestamp = new Date().toISOString();
    const path = request.url;

    if (exception instanceof HttpException) {
      return this.handleHttpException(exception, timestamp, path);
    }

    if (exception instanceof QueryFailedError) {
      return this.handleDatabaseError(exception, timestamp, path);
    }

    // Handle unknown errors
    return this.handleUnknownError(exception, timestamp, path);
  }

  private handleHttpException(
    exception: HttpException,
    timestamp: string,
    path: string,
  ): ErrorResponse {
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    let message = 'An error occurred';
    let details: any;

    if (typeof exceptionResponse === 'string') {
      message = exceptionResponse;
    } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      message = (exceptionResponse as any).message || message;
      details = (exceptionResponse as any).details;
    }

    return {
      statusCode: status,
      timestamp,
      path,
      message,
      details,
    };
  }

  private handleDatabaseError(
    exception: QueryFailedError,
    timestamp: string,
    path: string,
  ): ErrorResponse {
    this.logger.error('Database error:', exception);

    // Handle common database errors
    if (exception.message.includes('duplicate key')) {
      return {
        statusCode: HttpStatus.CONFLICT,
        timestamp,
        path,
        message: 'Resource already exists',
      };
    }

    if (exception.message.includes('foreign key')) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        timestamp,
        path,
        message: 'Invalid reference to related resource',
      };
    }

    if (exception.message.includes('not null')) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        timestamp,
        path,
        message: 'Required field is missing',
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      timestamp,
      path,
      message: 'Database operation failed',
    };
  }

  private handleUnknownError(
    exception: unknown,
    timestamp: string,
    path: string,
  ): ErrorResponse {
    let message = 'Internal server error';

    if (exception instanceof Error) {
      message = exception.message;
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      timestamp,
      path,
      message: process.env.NODE_ENV === 'production' 
        ? 'Internal server error' 
        : message,
      details: process.env.NODE_ENV === 'development' && exception instanceof Error 
        ? exception.stack 
        : undefined,
    };
  }

  private logError(exception: unknown, request: any, errorResponse: ErrorResponse): void {
    const { method, url, ip, headers } = request;
    const userAgent = headers['user-agent'] || '';

    const logMessage = `
      Error Details:
      - Method: ${method}
      - URL: ${url}
      - IP: ${ip}
      - User-Agent: ${userAgent}
      - Status: ${errorResponse.statusCode}
      - Message: ${errorResponse.message}
    `;

    if (errorResponse.statusCode >= 500) {
      this.logger.error(logMessage, exception instanceof Error ? exception.stack : exception);
    } else {
      this.logger.warn(logMessage);
    }
  }
}