import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CountryCode, WorkspaceStatus } from '@prisma/client';

@Injectable()
export class WorkspacesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.workspace.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { workspaceUsers: true, properties: true } } },
    });
  }

  async findBySlug(slug: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { slug },
      include: { _count: { select: { workspaceUsers: true, properties: true } } },
    });
    if (!workspace) throw new NotFoundException(`Workspace '${slug}' not found`);
    return workspace;
  }

  async findById(id: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id },
      include: { _count: { select: { workspaceUsers: true, properties: true, leases: true } } },
    });
    if (!workspace) throw new NotFoundException('Workspace not found');
    return workspace;
  }

  async create(dto: {
    name: string;
    slug: string;
    countryCode: CountryCode;
    currencyCode: string;
    contactEmail: string;
    contactPhone: string;
    city?: string;
  }) {
    const existing = await this.prisma.workspace.findUnique({ where: { slug: dto.slug } });
    if (existing) throw new ConflictException(`Slug '${dto.slug}' already taken`);

    return this.prisma.workspace.create({
      data: {
        ...dto,
        status: WorkspaceStatus.ACTIVE,
        subscriptionPlan: 'STARTER',
        timezone: dto.countryCode === CountryCode.AE ? 'Asia/Dubai' : 'UTC',
        countryConfig: {},
        features: {},
      },
    });
  }

  async update(id: string, dto: Partial<{ name: string; contactEmail: string; contactPhone: string; city: string; vatRate: number; reraCode: string; trnNumber: string }>) {
    await this.findById(id);
    return this.prisma.workspace.update({ where: { id }, data: dto });
  }

  async updateStatus(id: string, status: WorkspaceStatus) {
    await this.findById(id);
    return this.prisma.workspace.update({ where: { id }, data: { status } });
  }

  async getMembers(workspaceId: string) {
    return this.prisma.workspaceUser.findMany({
      where: { workspaceId },
      include: { user: { select: { id: true, fullName: true, phone: true, email: true, avatar: true } } },
      orderBy: { joinedAt: 'asc' },
    });
  }

  async removeMember(workspaceId: string, userId: string) {
    await this.prisma.workspaceUser.delete({
      where: { workspaceId_userId: { workspaceId, userId } },
    });
  }

  async getStats(workspaceId: string) {
    const [properties, units, leases, tickets] = await Promise.all([
      this.prisma.property.count({ where: { workspaceId } }),
      this.prisma.unit.count({ where: { workspaceId } }),
      this.prisma.lease.count({ where: { workspaceId, status: 'ACTIVE' } }),
      this.prisma.ticket.count({ where: { workspaceId, status: { in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS'] } } }),
    ]);
    return { properties, units, activeLeases: leases, openTickets: tickets };
  }
}
