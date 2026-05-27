import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { UserRole } from '@prisma/client';

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(workspaceId: string, filters?: { kycVerified?: boolean; search?: string }) {
    return this.prisma.tenant.findMany({
      where: {
        workspaceId,
        ...(filters?.kycVerified !== undefined && { kycVerified: filters.kycVerified }),
        ...(filters?.search && {
          OR: [
            { fullName: { contains: filters.search, mode: 'insensitive' } },
            { email: { contains: filters.search, mode: 'insensitive' } },
            { phone: { contains: filters.search } },
          ],
        }),
      },
      include: {
        leases: {
          where: { status: 'ACTIVE' },
          orderBy: { startDate: 'desc' },
          select: {
            id: true,
            status: true,
            startDate: true,
            endDate: true,
            annualRent: true,
            paymentFrequency: true,
            unit: { select: { id: true, unitNumber: true, property: { select: { id: true, name: true } } } },
          },
          take: 1,
        },
      },
      orderBy: { fullName: 'asc' },
    });
  }

  async findOne(workspaceId: string, id: string) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { id, workspaceId },
      include: {
        leases: {
          orderBy: { startDate: 'desc' },
          include: {
            unit: { include: { property: { select: { id: true, name: true, address: true } } } },
            pdcCheques: { orderBy: { dueDate: 'asc' } },
          },
        },
        tickets: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return tenant;
  }

  async create(workspaceId: string, dto: {
    phone: string;
    fullName: string;
    email?: string;
    nationality?: string;
    kycType?: string;
    passportNo?: string;
    emiratesId?: string;
    visaNumber?: string;
    visaExpiry?: Date;
  }) {
    // Find or create the user record by phone
    let user = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
    if (!user) {
      user = await this.prisma.user.create({
        data: { phone: dto.phone, fullName: dto.fullName, email: dto.email, phoneVerified: false, isActive: true },
      });
    }

    const existing = await this.prisma.tenant.findFirst({ where: { userId: user.id } });
    if (existing) throw new ConflictException('A tenant with this phone number already exists');

    // Add to workspace as TENANT role
    await this.prisma.workspaceUser.upsert({
      where: { workspaceId_userId: { workspaceId, userId: user.id } },
      update: {},
      create: { workspaceId, userId: user.id, role: UserRole.TENANT },
    });

    const { phone, ...rest } = dto;
    return this.prisma.tenant.create({
      data: { ...rest, phone, userId: user.id, workspaceId, kycVerified: false },
    });
  }

  async update(workspaceId: string, id: string, dto: any) {
    const tenant = await this.prisma.tenant.findFirst({ where: { id, workspaceId } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return this.prisma.tenant.update({ where: { id }, data: dto });
  }

  async verifyKyc(workspaceId: string, id: string) {
    const tenant = await this.prisma.tenant.findFirst({ where: { id, workspaceId } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return this.prisma.tenant.update({
      where: { id },
      data: { kycVerified: true, kycVerifiedAt: new Date() },
    });
  }

  async getLedger(workspaceId: string, tenantId: string) {
    const tenant = await this.prisma.tenant.findFirst({ where: { id: tenantId, workspaceId } });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const [collections, cheques] = await Promise.all([
      this.prisma.rentCollection.findMany({
        where: { lease: { tenantId, workspaceId } },
        orderBy: { collectedAt: 'desc' },
        take: 50,
      }),
      this.prisma.pdcCheque.findMany({
        where: { lease: { tenantId, workspaceId } },
        orderBy: { dueDate: 'asc' },
        take: 50,
      }),
    ]);

    return { collections, cheques };
  }

  async updateScreening(workspaceId: string, id: string, status: 'APPROVED' | 'REJECTED', approvedBy?: string) {
    const tenant = await this.prisma.tenant.findFirst({ where: { id, workspaceId } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return this.prisma.tenant.update({
      where: { id },
      data: {
        screeningStatus: status,
        ...(status === 'APPROVED' && { screeningApprovedAt: new Date(), screeningApprovedBy: approvedBy }),
      },
    });
  }

  async getStatement(workspaceId: string, tenantId: string, startDate: Date, endDate: Date) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { id: tenantId, workspaceId },
      include: {
        leases: {
          include: {
            unit: { include: { property: { select: { name: true } } } },
          },
          orderBy: { startDate: 'desc' },
        },
      },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const [collections, cheques] = await Promise.all([
      this.prisma.rentCollection.findMany({
        where: { lease: { tenantId, workspaceId }, collectedAt: { gte: startDate, lte: endDate } },
        orderBy: { collectedAt: 'asc' },
        include: { lease: { include: { unit: { include: { property: { select: { name: true } } } } } } },
      }),
      this.prisma.pdcCheque.findMany({
        where: { lease: { tenantId, workspaceId }, dueDate: { gte: startDate, lte: endDate } },
        orderBy: { dueDate: 'asc' },
        include: { lease: { include: { unit: { include: { property: { select: { name: true } } } } } } },
      }),
    ]);

    const totalPaid = collections.reduce((s, c) => s + Number(c.amount), 0);
    const totalChequeValue = cheques.reduce((s, c) => s + Number(c.amount), 0);
    const clearedCheques = cheques.filter(c => c.status === 'CLEARED').length;

    return {
      tenant: { fullName: tenant.fullName, email: tenant.email, phone: tenant.phone, nationality: tenant.nationality },
      period: { startDate, endDate },
      leases: tenant.leases,
      summary: { totalPaid, totalChequeValue, totalCheques: cheques.length, clearedCheques, pendingCheques: cheques.length - clearedCheques },
      collections,
      cheques,
    };
  }
}
