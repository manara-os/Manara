import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { UserRole } from '@prisma/client';

@Injectable()
export class WorkspaceGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) throw new ForbiddenException();

    // Platform admins bypass workspace checks
    if (user.role === UserRole.PLATFORM_ADMIN) return true;

    // Get workspace from params, query, or header
    const workspaceId =
      request.params?.workspaceId ||
      request.headers['x-workspace-id'] ||
      user.workspaceId;

    if (!workspaceId) throw new ForbiddenException('Workspace context required');

    // Verify user belongs to this workspace
    const membership = await this.prisma.workspaceUser.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: user.sub } },
      include: { workspace: { select: { status: true } } },
    });

    if (!membership || !membership.isActive) {
      throw new ForbiddenException('You do not have access to this workspace');
    }

    if (membership.workspace.status === 'SUSPENDED') {
      throw new ForbiddenException('This workspace has been suspended');
    }

    // Inject workspace context into request
    request.workspaceId = workspaceId;
    request.user.workspaceId = workspaceId;
    request.user.role = membership.role;
    request.user.permissions = membership.permissions;

    return true;
  }
}
