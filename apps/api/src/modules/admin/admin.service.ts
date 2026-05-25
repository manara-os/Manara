import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { WorkspaceStatus } from '@prisma/client';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getPlatformStats() {
    const [workspaces, users, properties, leases] = await Promise.all([
      this.prisma.workspace.count(),
      this.prisma.user.count(),
      this.prisma.property.count(),
      this.prisma.lease.count({ where: { status: 'ACTIVE' } }),
    ]);
    return { workspaces, users, properties, activeLeases: leases };
  }

  async listWorkspaces(filters?: { status?: WorkspaceStatus; search?: string }) {
    return this.prisma.workspace.findMany({
      where: {
        ...(filters?.status && { status: filters.status }),
        ...(filters?.search && {
          OR: [
            { name: { contains: filters.search, mode: 'insensitive' } },
            { slug: { contains: filters.search } },
          ],
        }),
      },
      include: {
        _count: { select: { workspaceUsers: true, properties: true, leases: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createWorkspace(dto: any) {
    return this.prisma.workspace.create({ data: dto });
  }

  async updateWorkspaceStatus(id: string, status: WorkspaceStatus) {
    const ws = await this.prisma.workspace.findUnique({ where: { id } });
    if (!ws) throw new NotFoundException('Workspace not found');
    return this.prisma.workspace.update({ where: { id }, data: { status } });
  }

  async listUsers(filters?: { search?: string }) {
    return this.prisma.user.findMany({
      where: {
        ...(filters?.search && {
          OR: [
            { fullName: { contains: filters.search, mode: 'insensitive' } },
            { phone: { contains: filters.search } },
            { email: { contains: filters.search, mode: 'insensitive' } },
          ],
        }),
      },
      include: {
        workspaceUsers: { include: { workspace: { select: { id: true, name: true, slug: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async getAuditLog(workspaceId?: string, limit = 50) {
    return this.prisma.auditLog.findMany({
      where: { ...(workspaceId && { workspaceId }) },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { user: { select: { fullName: true, phone: true } } },
    });
  }
}
