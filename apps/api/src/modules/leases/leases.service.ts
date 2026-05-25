import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { CreateLeaseDto } from './dto/create-lease.dto';
import { UpdateLeaseDto } from './dto/update-lease.dto';
import { LeaseQueryDto } from './dto/lease-query.dto';
import { Prisma, LeaseStatus, OccupancyStatus } from '@prisma/client';
import Decimal from 'decimal.js';

@Injectable()
export class LeasesService {
  private readonly logger = new Logger(LeasesService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    @InjectQueue('ejari') private ejariQueue: Queue,
    @InjectQueue('notifications') private notificationsQueue: Queue,
  ) {}

  async findAll(workspaceId: string, query: LeaseQueryDto) {
    const { page = 1, limit = 20, status, tenantId, unitId, search } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.LeaseWhereInput = {
      workspaceId,
      ...(status && { status: status as LeaseStatus }),
      ...(tenantId && { tenantId }),
      ...(unitId && { unitId }),
      ...(search && {
        OR: [
          { tenant: { fullName: { contains: search, mode: 'insensitive' } } },
          { tenant: { phone: { contains: search } } },
          { ejariNumber: { contains: search } },
          { unit: { unitNumber: { contains: search, mode: 'insensitive' } } },
        ],
      }),
    };

    const [total, leases] = await Promise.all([
      this.prisma.lease.count({ where }),
      this.prisma.lease.findMany({
        where,
        skip,
        take: limit,
        include: {
          tenant: { select: { id: true, fullName: true, phone: true, email: true } },
          unit: {
            select: {
              id: true,
              unitNumber: true,
              type: true,
              property: { select: { id: true, name: true, area: true } },
            },
          },
          pdcCheques: { where: { status: 'PENDING' }, select: { amount: true, dueDate: true } },
          _count: { select: { rentCollections: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return { data: leases, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(workspaceId: string, id: string) {
    const lease = await this.prisma.lease.findFirst({
      where: { id, workspaceId },
      include: {
        tenant: true,
        unit: {
          include: {
            property: { include: { owner: true } },
          },
        },
        pdcCheques: { orderBy: { chequeSeq: 'asc' } },
        rentCollections: { orderBy: { collectedAt: 'desc' }, take: 24 },
        commissions: { orderBy: { createdAt: 'desc' } },
        moveOutInspection: true,
        renewalAlerts: { orderBy: { daysBeforeExpiry: 'desc' } },
      },
    });

    if (!lease) throw new NotFoundException('Lease not found');
    return lease;
  }

  async create(workspaceId: string, dto: CreateLeaseDto, createdBy?: string) {
    const unit = await this.prisma.unit.findFirst({
      where: { id: dto.unitId, workspaceId, deletedAt: null },
      include: { property: { include: { owner: true } } },
    });

    if (!unit) throw new NotFoundException('Unit not found');
    if (unit.occupancyStatus === 'OCCUPIED') {
      throw new ConflictException('Unit is already occupied');
    }

    const tenant = await this.prisma.tenant.findFirst({
      where: { id: dto.tenantId, workspaceId },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const securityDepositPct = unit.securityDepositPct;
    const monthlyRent = new Decimal(dto.annualRent).div(12);
    const securityDeposit = dto.securityDeposit ?? monthlyRent.mul(securityDepositPct.toString()).div(100).toDecimalPlaces(2);

    const leaseRef = `LSE-${Date.now().toString(36).toUpperCase()}`;

    const lease = await this.prisma.$transaction(async (tx) => {
      const newLease = await tx.lease.create({
        data: {
          workspaceId,
          unitId: dto.unitId,
          tenantId: dto.tenantId,
          leaseType: dto.leaseType || 'RESIDENTIAL',
          status: 'DRAFT',
          startDate: new Date(dto.startDate),
          endDate: new Date(dto.endDate),
          annualRent: dto.annualRent,
          currencyCode: dto.currencyCode || 'AED',
          paymentFrequency: dto.paymentFrequency || 'ANNUAL',
          numCheques: dto.numCheques || 1,
          securityDeposit: securityDeposit as any,
          gracePeriodDays: dto.gracePeriodDays || 5,
          vatApplicable: dto.vatApplicable || false,
          specialConditions: dto.specialConditions,
          leaseRef,
          moveInStatus: 'PENDING',
          moveInPendingAt: new Date(),
        },
        include: { tenant: true, unit: { include: { property: true } } },
      });

      if (dto.numCheques && dto.numCheques > 0) {
        await this.generatePdcCheques(tx, newLease.id, workspaceId, {
          annualRent: dto.annualRent,
          startDate: dto.startDate,
          numCheques: dto.numCheques,
          currencyCode: dto.currencyCode || 'AED',
        });
      }

      return newLease;
    });

    this.logger.log(`Lease created: ${lease.id}`);
    return lease;
  }

  async renew(workspaceId: string, leaseId: string, dto: { startDate: Date; endDate: Date; annualRent: any }) {
    const lease = await this.findOne(workspaceId, leaseId);
    if (lease.status !== 'ACTIVE') {
      throw new BadRequestException('Only active leases can be renewed');
    }

    const leaseRef = `LSE-${Date.now().toString(36).toUpperCase()}`;

    const newLease = await this.prisma.$transaction(async (tx) => {
      await tx.lease.update({
        where: { id: leaseId },
        data: { status: 'RENEWED' },
      });

      const created = await tx.lease.create({
        data: {
          workspaceId,
          unitId: lease.unitId,
          tenantId: lease.tenantId,
          leaseType: lease.leaseType,
          status: 'ACTIVE',
          startDate: new Date(dto.startDate),
          endDate: new Date(dto.endDate),
          annualRent: dto.annualRent,
          currencyCode: lease.currencyCode,
          paymentFrequency: lease.paymentFrequency,
          numCheques: lease.numCheques,
          securityDeposit: lease.securityDeposit,
          gracePeriodDays: lease.gracePeriodDays,
          vatApplicable: lease.vatApplicable,
          renewedFromLeaseId: leaseId,
          renewalAcceptedAt: new Date(),
          leaseRef,
          moveInStatus: 'COMPLETE',
          moveInCompletedAt: new Date(),
        },
      });

      return created;
    });

    this.logger.log(`Lease ${leaseId} renewed → ${newLease.id}`);
    return newLease;
  }

  async terminate(workspaceId: string, leaseId: string, dto: { reason?: string }) {
    const lease = await this.findOne(workspaceId, leaseId);
    if (!['ACTIVE', 'DRAFT'].includes(lease.status)) {
      throw new BadRequestException('Lease cannot be terminated in its current state');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.lease.update({
        where: { id: leaseId },
        data: {
          status: 'TERMINATED',
          terminatedAt: new Date(),
          terminationReason: dto.reason || 'Terminated by PM',
        },
      });

      await tx.unit.update({
        where: { id: lease.unitId },
        data: { occupancyStatus: OccupancyStatus.VACANT },
      });
    });

    return { success: true };
  }

  async analyzeReraRent(workspaceId: string, leaseId: string) {
    const lease = await this.findOne(workspaceId, leaseId);

    const reraIndex = await this.prisma.reraIndexCache.findFirst({
      where: {
        area: lease.unit.property.area,
        propertyType: lease.unit.type,
      },
    });

    const currentRent = Number(lease.annualRent);
    const marketRent = reraIndex?.avgRent ? Number(reraIndex.avgRent) : currentRent * 1.05;
    const gapPercent = ((marketRent - currentRent) / marketRent) * 100;

    let maxIncreasePercent = 0;
    if (gapPercent >= 40) maxIncreasePercent = 20;
    else if (gapPercent >= 30) maxIncreasePercent = 15;
    else if (gapPercent >= 20) maxIncreasePercent = 10;
    else if (gapPercent >= 10) maxIncreasePercent = 5;

    const maxNewRent = currentRent * (1 + maxIncreasePercent / 100);

    return {
      currentRent,
      marketRent,
      gapPercent: Math.round(gapPercent * 10) / 10,
      maxIncreasePercent,
      maxNewRent: Math.round(maxNewRent),
      indexSource: reraIndex ? 'RERA Smart Rental Index' : 'Estimated',
      lastUpdated: reraIndex?.refreshedAt || null,
    };
  }

  async update(workspaceId: string, leaseId: string, dto: any) {
    await this.findOne(workspaceId, leaseId);
    return this.prisma.lease.update({
      where: { id: leaseId },
      data: dto,
    });
  }

  async getExpiring(workspaceId: string, days: number) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() + days);

    return this.prisma.lease.findMany({
      where: {
        workspaceId,
        status: 'ACTIVE',
        endDate: { lte: cutoffDate, gte: new Date() },
      },
      include: {
        tenant: { select: { id: true, fullName: true, phone: true } },
        unit: {
          select: {
            unitNumber: true,
            property: { select: { name: true } },
          },
        },
      },
      orderBy: { endDate: 'asc' },
    });
  }

  async activate(workspaceId: string, id: string) {
    const lease = await this.findOne(workspaceId, id);
    if (lease.status !== 'DRAFT') {
      throw new BadRequestException('Only DRAFT leases can be activated');
    }

    const updatedLease = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.lease.update({
        where: { id },
        data: { status: 'ACTIVE' },
      });

      await tx.unit.update({
        where: { id: lease.unitId },
        data: { occupancyStatus: OccupancyStatus.OCCUPIED },
      });

      return updated;
    });

    const workspace = await this.prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (workspace?.ejariEnabled) {
      await this.ejariQueue.add(
        'register',
        { leaseId: id, workspaceId },
        { attempts: 3, backoff: { type: 'exponential', delay: 30000 } },
      );
    }

    return updatedLease;
  }

  async getOverdueLeases(workspaceId: string) {
    const today = new Date();

    const overdueLeases = await this.prisma.lease.findMany({
      where: { workspaceId, status: 'ACTIVE' },
      include: {
        tenant: true,
        unit: { include: { property: { select: { name: true, area: true } } } },
        pdcCheques: {
          where: { status: 'PENDING', dueDate: { lte: today } },
          orderBy: { dueDate: 'asc' },
        },
        aiCalls: { orderBy: { initiatedAt: 'desc' }, take: 1 },
      },
    });

    const withOverdue = overdueLeases
      .filter((l) => l.pdcCheques.length > 0)
      .map((l) => {
        const overdueCheques = l.pdcCheques;
        const totalOverdue = overdueCheques.reduce((sum, c) => sum + Number(c.amount), 0);
        const maxOverdueDays = Math.max(
          ...overdueCheques.map((c) =>
            Math.floor((today.getTime() - new Date(c.dueDate).getTime()) / 86400000),
          ),
        );
        return {
          ...l,
          overdueSummary: {
            totalAmount: totalOverdue,
            maxDaysOverdue: maxOverdueDays,
            chequesCount: overdueCheques.length,
            lastAiCall: (l as any).aiCalls[0] || null,
          },
        };
      })
      .sort((a, b) => b.overdueSummary.maxDaysOverdue - a.overdueSummary.maxDaysOverdue);

    return { data: withOverdue, total: withOverdue.length };
  }

  // ─── New workflow methods ───────────────────────────────────

  async updateMoveInStatus(workspaceId: string, leaseId: string, status: 'PENDING' | 'ONGOING' | 'COMPLETE') {
    const lease = await this.findOne(workspaceId, leaseId);

    const now = new Date();
    const data: any = { moveInStatus: status };
    if (status === 'PENDING') data.moveInPendingAt = now;
    if (status === 'ONGOING') data.moveInOngoingAt = now;
    if (status === 'COMPLETE') {
      data.moveInCompletedAt = now;
      data.handoverAt = now;
    }

    const updated = await this.prisma.lease.update({ where: { id: leaseId }, data });

    // On COMPLETE: schedule renewal alert jobs at 120/60/30/15 days before lease end
    if (status === 'COMPLETE') {
      const endDate = new Date(lease.endDate);
      const now = Date.now();
      for (const daysBefore of [120, 60, 30, 15]) {
        const fireAt = endDate.getTime() - daysBefore * 86400000;
        const delay = fireAt - now;
        if (delay > 0) {
          await this.notificationsQueue.add(
            'renewal-alert',
            { leaseId, workspaceId, daysBeforeExpiry: daysBefore },
            { delay, attempts: 3 },
          );
          this.logger.log(`Renewal alert scheduled for lease ${leaseId} at ${daysBefore}d before expiry`);
        }
      }
    }

    return updated;
  }

  async submitCommission(workspaceId: string, leaseId: string, dto: { amount: number; type?: string; notes?: string }) {
    await this.findOne(workspaceId, leaseId);

    const commission = await this.prisma.commission.create({
      data: {
        workspaceId,
        leaseId,
        type: (dto.type as any) || 'LEASING',
        amount: dto.amount,
        status: 'PENDING_VERIFICATION',
        notes: dto.notes,
      },
    });

    await this.prisma.lease.update({
      where: { id: leaseId },
      data: {
        commissionAmount: dto.amount,
        commissionStatus: 'PENDING_VERIFICATION',
      },
    });

    return commission;
  }

  async verifyCommission(workspaceId: string, leaseId: string, verifiedBy: string) {
    const lease = await this.findOne(workspaceId, leaseId);
    if (!lease.commissionAmount) throw new BadRequestException('No commission submitted for this lease');

    const commission = await this.prisma.commission.findFirst({
      where: { leaseId, status: 'PENDING_VERIFICATION' },
      orderBy: { createdAt: 'desc' },
    });
    if (!commission) throw new NotFoundException('No pending commission found');

    const now = new Date();
    const [updatedCommission] = await Promise.all([
      this.prisma.commission.update({
        where: { id: commission.id },
        data: { status: 'VERIFIED', verifiedAt: now, verifiedBy },
      }),
      this.prisma.lease.update({
        where: { id: leaseId },
        data: { commissionStatus: 'VERIFIED', commissionVerifiedAt: now, commissionVerifiedBy: verifiedBy },
      }),
    ]);

    return updatedCommission;
  }

  async createMoveOut(workspaceId: string, leaseId: string, dto: {
    maintenanceRequired?: boolean;
    maintenanceAmount?: number;
    utilityBillsSubmitted?: boolean;
    notes?: string;
    inspectedBy?: string;
  }) {
    await this.findOne(workspaceId, leaseId);

    const existing = await this.prisma.moveOutInspection.findUnique({ where: { leaseId } });
    if (existing) throw new ConflictException('Move-out inspection already exists for this lease');

    return this.prisma.moveOutInspection.create({
      data: {
        workspaceId,
        leaseId,
        maintenanceRequired: dto.maintenanceRequired || false,
        maintenanceAmount: dto.maintenanceAmount,
        utilityBillsSubmitted: dto.utilityBillsSubmitted || false,
        notes: dto.notes,
        inspectedBy: dto.inspectedBy,
        status: 'PENDING',
      },
    });
  }

  async updateMoveOut(workspaceId: string, leaseId: string, dto: {
    inspectedAt?: Date;
    maintenanceRequired?: boolean;
    maintenanceAmount?: number;
    settlementAmount?: number;
    utilityBillsSubmitted?: boolean;
    refundApproved?: boolean;
    refundAmount?: number;
    refundIssuedAt?: Date;
    status?: string;
    notes?: string;
  }) {
    const inspection = await this.prisma.moveOutInspection.findUnique({ where: { leaseId } });
    if (!inspection) throw new NotFoundException('Move-out inspection not found');

    const updated = await this.prisma.moveOutInspection.update({
      where: { leaseId },
      data: {
        ...dto,
        status: dto.status as any,
        inspectedAt: dto.inspectedAt ? new Date(dto.inspectedAt) : undefined,
        refundIssuedAt: dto.refundIssuedAt ? new Date(dto.refundIssuedAt) : undefined,
      },
    });

    // If move-out is COMPLETE, mark unit as vacant
    if (dto.status === 'COMPLETE') {
      const lease = await this.prisma.lease.findUnique({ where: { id: leaseId } });
      if (lease) {
        await this.prisma.unit.update({
          where: { id: lease.unitId },
          data: { occupancyStatus: OccupancyStatus.VACANT },
        });
      }
    }

    return updated;
  }

  private async generatePdcCheques(
    tx: any,
    leaseId: string,
    workspaceId: string,
    data: { annualRent: number; startDate: string; numCheques: number; currencyCode: string },
  ) {
    const { annualRent, startDate, numCheques, currencyCode } = data;
    const chequeAmount = new Decimal(annualRent).div(numCheques).toDecimalPlaces(2);
    const start = new Date(startDate);

    const cheques = Array.from({ length: numCheques }, (_, i) => {
      const dueDate = new Date(start);
      dueDate.setMonth(dueDate.getMonth() + Math.floor((i * 12) / numCheques));
      return {
        leaseId,
        workspaceId,
        chequeNumber: `PDC-${i + 1}`,
        chequeSeq: i + 1,
        amount: chequeAmount,
        currencyCode,
        dueDate,
      };
    });

    await tx.pdcCheque.createMany({ data: cheques });
  }
}
