import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { VendorStatus, TicketCategory } from '@prisma/client';

@Injectable()
export class VendorsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(workspaceId: string, filters?: {
    status?: VendorStatus;
    category?: TicketCategory;
    search?: string;
  }) {
    return this.prisma.vendor.findMany({
      where: {
        workspaceId,
        ...(filters?.status && { status: filters.status }),
        ...(filters?.category && { serviceCategories: { has: filters.category } }),
        ...(filters?.search && {
          OR: [
            { companyName: { contains: filters.search, mode: 'insensitive' } },
            { contactName: { contains: filters.search, mode: 'insensitive' } },
            { phone: { contains: filters.search } },
          ],
        }),
      },
      include: {
        _count: { select: { tickets: true } },
      },
      orderBy: { companyName: 'asc' },
    });
  }

  async findOne(workspaceId: string, id: string) {
    const vendor = await this.prisma.vendor.findFirst({
      where: { id, workspaceId },
      include: {
        user: { select: { id: true, phone: true, email: true } },
        tickets: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: {
            unit: { select: { unitNumber: true, property: { select: { name: true } } } },
          },
        },
      },
    });
    if (!vendor) throw new NotFoundException('Vendor not found');
    return vendor;
  }

  async create(workspaceId: string, dto: {
    userId?: string;
    companyName: string;
    contactName: string;
    phone: string;
    email?: string;
    tradeLicenseNo?: string;
    tradeLicenseExpiry?: Date;
    serviceCategories: TicketCategory[];
    coverageAreas?: string[];
  }) {
    return this.prisma.vendor.create({
      data: {
        workspaceId,
        ...dto,
        status: VendorStatus.ACTIVE,
        isApproved: false,
      },
    });
  }

  async update(workspaceId: string, id: string, dto: any) {
    const vendor = await this.prisma.vendor.findFirst({ where: { id, workspaceId } });
    if (!vendor) throw new NotFoundException('Vendor not found');
    return this.prisma.vendor.update({ where: { id }, data: dto });
  }

  async approve(workspaceId: string, id: string) {
    const vendor = await this.prisma.vendor.findFirst({ where: { id, workspaceId } });
    if (!vendor) throw new NotFoundException('Vendor not found');
    return this.prisma.vendor.update({ where: { id }, data: { isApproved: true } });
  }

  async getPerformance(workspaceId: string, vendorId: string) {
    const vendor = await this.prisma.vendor.findFirst({ where: { id: vendorId, workspaceId } });
    if (!vendor) throw new NotFoundException('Vendor not found');

    const [total, resolved, overSla] = await Promise.all([
      this.prisma.ticket.count({ where: { workspaceId, assignedVendorId: vendorId } }),
      this.prisma.ticket.count({ where: { workspaceId, assignedVendorId: vendorId, status: 'COMPLETED' } }),
      this.prisma.ticket.count({
        where: {
          workspaceId,
          assignedVendorId: vendorId,
          status: 'COMPLETED',
          resolvedAt: { not: null },
        },
      }),
    ]);

    return {
      vendorId,
      companyName: vendor.companyName,
      totalTickets: total,
      resolvedTickets: resolved,
      resolutionRate: total > 0 ? Math.round((resolved / total) * 100) : 0,
    };
  }
}
