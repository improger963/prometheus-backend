import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, ip } = request;
    const userAgent = request.get('User-Agent') || '';
    const now = Date.now();

    const logMessage = `
      Incoming Request:
      - Method: ${method}
      - URL: ${url}
      - IP: ${ip}
      - User-Agent: ${userAgent}
    `;

    this.logger.log(logMessage);

    return next.handle().pipe(
      tap((data) => {
        const response = context.switchToHttp().getResponse();
        const { statusCode } = response;
        const responseTime = Date.now() - now;

        const responseMessage = `
          Response:
          - Status: ${statusCode}
          - Response Time: ${responseTime}ms
          - Data Size: ${JSON.stringify(data).length} bytes
        `;

        this.logger.log(responseMessage);
      }),
    );
  }
}