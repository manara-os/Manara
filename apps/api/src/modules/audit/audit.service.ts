import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AuditService {
  constructor(private db: PrismaService) {}

  async log(params: {
    workspaceId: string;
    userId: string;
    action: string;
    entity: string;
    entityId?: string;
    oldValues?: Record<string, any>;
    newValues?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
  }) {
    return this.db.auditLog.create({
      data: {
        workspaceId: params.workspaceId,
        userId: params.userId,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        oldValues: params.oldValues ?? {},
        newValues: params.newValues ?? {},
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      },
    });
  }
}
