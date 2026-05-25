import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { UserRole } from '@prisma/client';

@Injectable()
export class OwnersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(workspaceId: string, filters?: { kycVerified?: boolean; search?: string }) {
    return this.prisma.owner.findMany({
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
        _count: { select: { properties: true } },
        properties: {
          include: {
            units: { select: { id: true, occupancyStatus: true } },
          },
        },
      },
      orderBy: { fullName: 'asc' },
    });
  }

  async findMe(workspaceId: string, userId: string) {
    const owner = await this.prisma.owner.findFirst({
      where: { workspaceId, user: { id: userId } },
      select: {
        id: true, fullName: true, email: true, phone: true,
        pmaStatus: true, pmaRenewalAlertSentAt: true,
        kycVerified: true, mgmtFeePct: true,
      },
    });
    if (!owner) throw new NotFoundException('Owner profile not found');
    return owner;
  }

  async findOne(workspaceId: string, id: string) {
    const owner = await this.prisma.owner.findFirst({
      where: { id, workspaceId },
      include: {
        properties: {
          include: {
            units: {
              select: {
                id: true, unitNumber: true, type: true, occupancyStatus: true, annualRent: true,
              },
            },
          },
        },
      },
    });
    if (!owner) throw new NotFoundException('Owner not found');
    return owner;
  }

  async create(workspaceId: string, dto: {
    phone: string;
    fullName: string;
    email?: string;
    nationality?: string;
    kycType?: string;
    emiratesId?: string;
    passportNo?: string;
    mgmtFeePct?: number;
    pmaSignedDate?: Date;
    pmaExpiryDate?: Date;
  }) {
    // Find or create the user record by phone
    let user = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
    if (!user) {
      user = await this.prisma.user.create({
        data: { phone: dto.phone, fullName: dto.fullName, email: dto.email, phoneVerified: false, isActive: true },
      });
    }

    const existing = await this.prisma.owner.findFirst({ where: { userId: user.id } });
    if (existing) throw new ConflictException('An owner with this phone number already exists');

    // Add to workspace as OWNER role
    await this.prisma.workspaceUser.upsert({
      where: { workspaceId_userId: { workspaceId, userId: user.id } },
      update: {},
      create: { workspaceId, userId: user.id, role: UserRole.OWNER },
    });

    const { phone, ...rest } = dto;
    return this.prisma.owner.create({
      data: { ...rest, phone, userId: user.id, workspaceId, kycVerified: false },
    });
  }

  async update(workspaceId: string, id: string, dto: any) {
    const owner = await this.prisma.owner.findFirst({ where: { id, workspaceId } });
    if (!owner) throw new NotFoundException('Owner not found');
    return this.prisma.owner.update({ where: { id }, data: dto });
  }

  async verifyKyc(workspaceId: string, id: string) {
    const owner = await this.prisma.owner.findFirst({ where: { id, workspaceId } });
    if (!owner) throw new NotFoundException('Owner not found');
    return this.prisma.owner.update({
      where: { id },
      data: { kycVerified: true, kycVerifiedAt: new Date() },
    });
  }

  async updatePmaStatus(workspaceId: string, id: string, status: 'ACTIVE' | 'PENDING_RENEWAL' | 'TERMINATED') {
    const owner = await this.prisma.owner.findFirst({ where: { id, workspaceId } });
    if (!owner) throw new NotFoundException('Owner not found');
    return this.prisma.owner.update({
      where: { id },
      data: { pmaStatus: status },
    });
  }

  async triggerPmaRenewal(workspaceId: string, id: string) {
    const owner = await this.prisma.owner.findFirst({ where: { id, workspaceId } });
    if (!owner) throw new NotFoundException('Owner not found');
    return this.prisma.owner.update({
      where: { id },
      data: { pmaStatus: 'PENDING_RENEWAL', pmaRenewalAlertSentAt: new Date() },
    });
  }

  async getStatement(workspaceId: string, ownerId: string, startDate: Date, endDate: Date) {
    const owner = await this.prisma.owner.findFirst({
      where: { id: ownerId, workspaceId },
      include: {
        properties: {
          include: {
            units: {
              include: {
                leases: {
                  include: {
                    tenant: { select: { fullName: true } },
                    rentCollections: {
                      where: { collectedAt: { gte: startDate, lte: endDate } },
                      orderBy: { collectedAt: 'asc' },
                    },
                    pdcCheques: {
                      where: { dueDate: { gte: startDate, lte: endDate } },
                      orderBy: { dueDate: 'asc' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!owner) throw new NotFoundException('Owner not found');

    const collections: any[] = [];
    const cheques: any[] = [];
    for (const prop of owner.properties) {
      for (const unit of prop.units) {
        for (const lease of unit.leases) {
          for (const c of lease.rentCollections) {
            collections.push({ ...c, unitNumber: unit.unitNumber, propertyName: prop.name, tenantName: lease.tenant.fullName });
          }
          for (const ch of lease.pdcCheques) {
            cheques.push({ ...ch, unitNumber: unit.unitNumber, propertyName: prop.name, tenantName: lease.tenant.fullName });
          }
        }
      }
    }

    const totalCollected = collections.reduce((s, c) => s + Number(c.amount), 0);
    const mgmtFee = totalCollected * (Number(owner.mgmtFeePct) / 100);

    return {
      owner: { fullName: owner.fullName, email: owner.email, phone: owner.phone, mgmtFeePct: owner.mgmtFeePct },
      period: { startDate, endDate },
      summary: { totalCollected, managementFee: mgmtFee, netOwnerPayout: totalCollected - mgmtFee, totalCheques: cheques.length },
      collections,
      cheques,
    };
  }

  async getPortfolio(workspaceId: string, ownerId: string) {
    const owner = await this.prisma.owner.findFirst({
      where: { id: ownerId, workspaceId },
      include: {
        properties: {
          include: {
            units: {
              include: {
                leases: {
                  where: { status: 'ACTIVE' },
                  include: { tenant: { select: { fullName: true, phone: true } } },
                  take: 1,
                },
              },
            },
          },
        },
      },
    });
    if (!owner) throw new NotFoundException('Owner not found');

    const totalUnits = owner.properties.reduce((sum, p) => sum + p.units.length, 0);
    const occupiedUnits = owner.properties.reduce(
      (sum, p) => sum + p.units.filter(u => u.occupancyStatus === 'OCCUPIED').length, 0,
    );
    const totalAnnualRent = owner.properties.reduce(
      (sum, p) => sum + p.units.reduce((us, u) => us + Number(u.annualRent ?? 0), 0), 0,
    );

    return {
      owner,
      summary: {
        totalProperties: owner.properties.length,
        totalUnits,
        occupiedUnits,
        vacantUnits: totalUnits - occupiedUnits,
        occupancyRate: totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 1000) / 10 : 0,
        totalAnnualRent,
        totalMonthlyRent: Math.round(totalAnnualRent / 12),
      },
    };
  }
}
