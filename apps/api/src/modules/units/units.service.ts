import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { OccupancyStatus } from '@prisma/client';

@Injectable()
export class UnitsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(workspaceId: string, filters?: { propertyId?: string; occupancyStatus?: OccupancyStatus; type?: string }) {
    return this.prisma.unit.findMany({
      where: {
        workspaceId,
        ...(filters?.propertyId && { propertyId: filters.propertyId }),
        ...(filters?.occupancyStatus && { occupancyStatus: filters.occupancyStatus }),
        ...(filters?.type && { type: filters.type }),
      },
      include: {
        property: { select: { id: true, name: true, area: true, city: true } },
        leases: {
          where: { status: 'ACTIVE' },
          include: { tenant: { select: { fullName: true, phone: true } } },
          take: 1,
        },
      },
      orderBy: [{ propertyId: 'asc' }, { unitNumber: 'asc' }],
    });
  }

  async findOne(workspaceId: string, id: string) {
    const unit = await this.prisma.unit.findFirst({
      where: { id, workspaceId },
      include: {
        property: true,
        leases: {
          orderBy: { startDate: 'desc' },
          take: 5,
          include: { tenant: { select: { fullName: true, phone: true, email: true } } },
        },
        tickets: {
          where: { status: { notIn: ['RESOLVED', 'CLOSED'] } },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });
    if (!unit) throw new NotFoundException('Unit not found');
    return unit;
  }

  async create(workspaceId: string, dto: {
    propertyId: string;
    unitNumber: string;
    floor?: number;
    type: string;
    areaSqft?: number;
    bedroomCount?: number;
    bathroomCount?: number;
    annualRent?: number;
    furnishingStatus?: string;
    securityDepositPct?: number;
    purchasePrice?: number;
    purchaseDate?: Date;
  }) {
    const property = await this.prisma.property.findFirst({ where: { id: dto.propertyId, workspaceId } });
    if (!property) throw new NotFoundException('Property not found');

    const existing = await this.prisma.unit.findUnique({
      where: { propertyId_unitNumber: { propertyId: dto.propertyId, unitNumber: dto.unitNumber } },
    });
    if (existing) throw new ConflictException(`Unit ${dto.unitNumber} already exists in this property`);

    const unit = await this.prisma.unit.create({
      data: { ...dto, workspaceId, occupancyStatus: OccupancyStatus.VACANT },
    });

    await this.prisma.property.update({
      where: { id: dto.propertyId },
      data: { totalUnits: { increment: 1 } },
    });

    return unit;
  }

  async update(workspaceId: string, id: string, dto: Partial<{ annualRent: number; furnishingStatus: string; areaSqft: number; bedroomCount: number; bathroomCount: number }>) {
    const unit = await this.prisma.unit.findFirst({ where: { id, workspaceId } });
    if (!unit) throw new NotFoundException('Unit not found');
    return this.prisma.unit.update({ where: { id }, data: dto });
  }

  async updateOccupancy(id: string, status: OccupancyStatus) {
    return this.prisma.unit.update({ where: { id }, data: { occupancyStatus: status } });
  }

  async getVacantUnits(workspaceId: string) {
    return this.prisma.unit.findMany({
      where: { workspaceId, occupancyStatus: OccupancyStatus.VACANT },
      include: { property: { select: { id: true, name: true, area: true, city: true } } },
      orderBy: { annualRent: 'desc' },
    });
  }
}
