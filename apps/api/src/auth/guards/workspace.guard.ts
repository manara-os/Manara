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

    // Get workspace from params, query, header, or token
    const workspaceId =
      request.params?.workspaceId ||
      request.headers['x-workspace-id'] ||
      user.workspaceId;

    // Platform admins bypass workspace MEMBERSHIP check, but still need
    // workspaceId in the request so services can scope their queries.
    if (user.role === UserRole.PLATFORM_ADMIN) {
      if (!workspaceId) throw new ForbiddenException('Workspace context required (X-Workspace-ID header)');
      request.workspaceId = workspaceId;
      request.user.workspaceId = workspaceId;
      return true;
    }

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
