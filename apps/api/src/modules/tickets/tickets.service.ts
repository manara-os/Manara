import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { TicketStatus, TicketPriority, TicketCategory } from '@prisma/client';

@Injectable()
export class TicketsService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('notifications') private notificationsQueue: Queue,
  ) {}

  private async generateRef(workspaceId: string): Promise<string> {
    const count = await this.prisma.ticket.count({ where: { workspaceId } });
    const year = new Date().getFullYear();
    return `TKT-${year}-${String(count + 1).padStart(4, '0')}`;
  }

  async findAll(workspaceId: string, filters?: {
    status?: string;
    category?: TicketCategory;
    priority?: TicketPriority;
    unitId?: string;
    propertyId?: string;
    assignedVendorId?: string;
    search?: string;
    limit?: number;
  }) {
    const statuses = filters?.status
      ? filters.status.split(',').map(s => s.trim() as TicketStatus)
      : undefined;
    return this.prisma.ticket.findMany({
      where: {
        workspaceId,
        ...(statuses?.length === 1 && { status: statuses[0] }),
        ...(statuses && statuses.length > 1 && { status: { in: statuses } }),
        ...(filters?.category && { category: filters.category }),
        ...(filters?.priority && { priority: filters.priority }),
        ...(filters?.unitId && { unitId: filters.unitId }),
        ...(filters?.propertyId && { unit: { propertyId: filters.propertyId } }),
        ...(filters?.assignedVendorId && { assignedVendorId: filters.assignedVendorId }),
        ...(filters?.search && {
          OR: [
            { title: { contains: filters.search, mode: 'insensitive' } },
            { ticketRef: { contains: filters.search, mode: 'insensitive' } },
          ],
        }),
      },
      include: {
        unit: { select: { id: true, unitNumber: true, property: { select: { id: true, name: true } } } },
        tenant: { select: { id: true, fullName: true, phone: true } },
        vendor: { select: { id: true, companyName: true, contactName: true, phone: true } },
      },
      orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
      ...(filters?.limit && { take: filters.limit }),
    });
  }

  async findOne(workspaceId: string, id: string) {
    const ticket = await this.prisma.ticket.findFirst({
      where: { id, workspaceId },
      include: {
        unit: { include: { property: true } },
        tenant: true,
        vendor: true,
      },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    return ticket;
  }

  async create(workspaceId: string, dto: {
    unitId: string;
    category: TicketCategory;
    priority?: TicketPriority;
    title: string;
    description?: string;
    raisedByTenantId?: string;
    slaHours?: number;
  }) {
    const unit = await this.prisma.unit.findFirst({ where: { id: dto.unitId, workspaceId } });
    if (!unit) throw new NotFoundException('Unit not found');

    const slaHours = dto.slaHours ?? this.getDefaultSla(dto.priority ?? TicketPriority.MEDIUM);

    const ticket = await this.prisma.ticket.create({
      data: {
        workspaceId,
        ticketRef: await this.generateRef(workspaceId),
        unitId: dto.unitId,
        category: dto.category,
        priority: dto.priority ?? TicketPriority.MEDIUM,
        status: TicketStatus.OPEN,
        title: dto.title,
        description: dto.description,
        raisedByTenantId: dto.raisedByTenantId,
        slaHours,
        slaDueAt: new Date(Date.now() + slaHours * 3600 * 1000),
      },
    });

    await this.notificationsQueue.add('ticket-created', { ticketId: ticket.id, workspaceId });
    return ticket;
  }

  async assign(workspaceId: string, id: string, vendorId: string) {
    const ticket = await this.prisma.ticket.findFirst({ where: { id, workspaceId } });
    if (!ticket) throw new NotFoundException('Ticket not found');

    const vendor = await this.prisma.vendor.findFirst({ where: { id: vendorId, workspaceId } });
    if (!vendor) throw new NotFoundException('Vendor not found');

    const updated = await this.prisma.ticket.update({
      where: { id },
      data: { assignedVendorId: vendorId, status: TicketStatus.ASSIGNED, assignedAt: new Date() },
    });

    await this.notificationsQueue.add('ticket-assigned', { ticketId: id, vendorId, workspaceId });
    return updated;
  }

  async updateStatus(workspaceId: string, id: string, status: TicketStatus, note?: string) {
    const ticket = await this.prisma.ticket.findFirst({ where: { id, workspaceId } });
    if (!ticket) throw new NotFoundException('Ticket not found');

    const updateData: any = { status };
    if (status === TicketStatus.COMPLETED) updateData.completedAt = new Date();
    if (status === TicketStatus.CLOSED) updateData.closedAt = new Date();
    if (note) updateData.cancellationReason = note;

    return this.prisma.ticket.update({ where: { id }, data: updateData });
  }

  async update(workspaceId: string, id: string, dto: any) {
    const ticket = await this.prisma.ticket.findFirst({ where: { id, workspaceId } });
    if (!ticket) throw new NotFoundException('Ticket not found');
    return this.prisma.ticket.update({ where: { id }, data: dto });
  }

  async getKanbanBoard(workspaceId: string) {
    const tickets = await this.prisma.ticket.findMany({
      where: { workspaceId, status: { notIn: [TicketStatus.CLOSED] } },
      include: {
        unit: { select: { unitNumber: true, property: { select: { name: true } } } },
        vendor: { select: { companyName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      OPEN: tickets.filter(t => t.status === TicketStatus.OPEN),
      ASSIGNED: tickets.filter(t => t.status === TicketStatus.ASSIGNED),
      IN_PROGRESS: tickets.filter(t => t.status === TicketStatus.IN_PROGRESS),
      COMPLETED: tickets.filter(t => t.status === TicketStatus.COMPLETED),
    };
  }

  private getDefaultSla(priority: TicketPriority): number {
    const slaMap: Record<TicketPriority, number> = {
      EMERGENCY: 4,
      HIGH: 24,
      MEDIUM: 48,
      LOW: 72,
    };
    return slaMap[priority] ?? 48;
  }
}
