import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { PrismaService } from '../../database/prisma.service';

const MUTATION_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

/**
 * Audit-log interceptor — writes an immutable record for every authenticated
 * mutation. Idempotent: failures don't break the request path.
 */
@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(private prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const method = req.method;
    if (!MUTATION_METHODS.includes(method)) return next.handle();

    return next.handle().pipe(
      tap(async (response) => {
        try {
          const path = req.route?.path ?? req.url;
          const entityType = path.split('/').filter(Boolean)[1] ?? 'unknown';
          const action = method === 'POST' ? 'CREATE' : method === 'DELETE' ? 'DELETE' : 'UPDATE';

          await this.prisma.auditLog.create({
            data: {
              workspaceId: req.workspaceId ?? null,
              userId: req.user?.id ?? null,
              action: action as any,
              entityType,
              entityId: response?.id ?? response?.data?.id ?? req.params?.id ?? null,
              changes: req.body && Object.keys(req.body).length ? req.body : null,
              metadata: { method, path },
              ipAddress: req.ip,
              userAgent: req.headers?.['user-agent']?.slice(0, 500),
              requestId: req.headers?.['x-request-id']?.toString().slice(0, 50),
            },
          });
        } catch {
          // never break the request because of audit logging
        }
      }),
    );
  }
}
