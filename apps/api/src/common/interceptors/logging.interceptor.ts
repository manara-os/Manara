import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, headers } = request;
    const requestId = headers['x-request-id'] || uuidv4();
    request.requestId = requestId;
    const now = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse();
          this.logger.log(
            `${method} ${url} → ${response.statusCode} [${Date.now() - now}ms] [${requestId}]`,
          );
        },
        error: (error) => {
          this.logger.error(
            `${method} ${url} → ${error.status || 500} [${Date.now() - now}ms] [${requestId}] ${error.message}`,
          );
        },
      }),
    );
  }
}
