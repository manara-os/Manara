import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { PropertyQueryDto } from './dto/property-query.dto';
import { PropertyType, PropertyStatus, OccupancyStatus, Prisma } from '@prisma/client';

@Injectable()
export class PropertiesService {
  private readonly logger = new Logger(PropertiesService.name);

  constructor(private prisma: PrismaService) {}

  async findAll(workspaceId: string, query: PropertyQueryDto) {
    const { page = 1, limit = 20, type, status, search, ownerId, city, area } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.PropertyWhereInput = {
      workspaceId,
      deletedAt: null,
      ...(type && { type: type as PropertyType }),
      ...(status && { status: status as PropertyStatus }),
      ...(ownerId && { ownerId }),
      ...(city && { city: { contains: city, mode: 'insensitive' } }),
      ...(area && { area: { contains: area, mode: 'insensitive' } }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { address: { contains: search, mode: 'insensitive' } },
          { titleDeedNo: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [total, properties] = await Promise.all([
      this.prisma.property.count({ where }),
      this.prisma.property.findMany({
        where,
        skip,
        take: limit,
        include: {
          owner: { select: { id: true, fullName: true, phone: true } },
          units: {
            select: {
              id: true,
              unitNumber: true,
              type: true,
              occupancyStatus: true,
              annualRent: true,
              furnishingStatus: true,
            },
          },
          _count: { select: { units: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    // Add computed fields
    const enriched = properties.map((p) => {
      const occupiedUnits = p.units.filter((u) => u.occupancyStatus === 'OCCUPIED').length;
      return {
        ...p,
        totalUnits: p._count.units,
        _count: { ...p._count, activeLeases: occupiedUnits },
        occupiedUnits,
        vacantUnits: p.units.filter((u) => u.occupancyStatus === 'VACANT').length,
        occupancyRate: p._count.units > 0 ? Math.round((occupiedUnits / p._count.units) * 100) : 0,
      };
    });

    return {
      data: enriched,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(workspaceId: string, id: string) {
    const property = await this.prisma.property.findFirst({
      where: { id, workspaceId, deletedAt: null },
      include: {
        owner: true,
        units: {
          where: { deletedAt: null },
          include: {
            leases: {
              where: { status: 'ACTIVE' },
              include: { tenant: { select: { id: true, fullName: true, phone: true } } },
              take: 1,
              orderBy: { startDate: 'desc' },
            },
          },
          orderBy: { unitNumber: 'asc' },
        },
        _count: {
          select: {
            units: true,
          },
        },
      },
    });

    if (!property) throw new NotFoundException('Property not found');

    // Fetch related documents separately (polymorphic via entityType/entityId)
    const documents = await this.prisma.document.findMany({
      where: { workspaceId, entityType: 'PROPERTY', entityId: id },
      orderBy: { createdAt: 'desc' },
    });

    return { ...property, documents };
  }

  async create(workspaceId: string, dto: CreatePropertyDto, createdBy: string) {
    const property = await this.prisma.property.create({
      data: {
        workspaceId,
        ...dto,
      },
      include: {
        owner: { select: { id: true, fullName: true } },
      },
    });

    this.logger.log(`Property created: ${property.id} in workspace ${workspaceId}`);
    return property;
  }

  async update(workspaceId: string, id: string, dto: UpdatePropertyDto) {
    await this.ensureExists(workspaceId, id);

    const property = await this.prisma.property.update({
      where: { id },
      data: { ...dto, updatedAt: new Date() },
      include: { owner: { select: { id: true, fullName: true } } },
    });

    return property;
  }

  async delete(workspaceId: string, id: string) {
    await this.ensureExists(workspaceId, id);

    // Check for active leases
    const activeLeases = await this.prisma.lease.count({
      where: { unit: { propertyId: id }, status: 'ACTIVE', workspaceId },
    });

    if (activeLeases > 0) {
      throw new ForbiddenException('Cannot delete property with active leases');
    }

    await this.prisma.property.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async getVacancyReport(workspaceId: string, propertyId?: string) {
    const where: Prisma.UnitWhereInput = {
      workspaceId,
      deletedAt: null,
      occupancyStatus: OccupancyStatus.VACANT,
      ...(propertyId && { propertyId }),
    };

    const vacantUnits = await this.prisma.unit.findMany({
      where,
      include: {
        property: { select: { id: true, name: true, area: true, city: true } },
      },
      orderBy: { property: { name: 'asc' } },
    });

    return {
      totalVacant: vacantUnits.length,
      units: vacantUnits,
    };
  }

  private async ensureExists(workspaceId: string, id: string) {
    const property = await this.prisma.property.findFirst({
      where: { id, workspaceId, deletedAt: null },
      select: { id: true },
    });
    if (!property) throw new NotFoundException('Property not found');
    return property;
  }
}
