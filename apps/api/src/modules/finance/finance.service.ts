import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { ChequeStatus, RentCollectionMethod } from '@prisma/client';

@Injectable()
export class FinanceService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('notifications') private notificationsQueue: Queue,
  ) {}

  // ── Rent Collections ──────────────────────────────────────────────

  async getCollections(workspaceId: string, filters?: { leaseId?: string; month?: string; year?: number }) {
    return this.prisma.rentCollection.findMany({
      where: {
        workspaceId,
        ...(filters?.leaseId && { leaseId: filters.leaseId }),
      },
      include: {
        lease: {
          include: {
            tenant: { select: { fullName: true, phone: true } },
            unit: { select: { unitNumber: true, property: { select: { name: true } } } },
          },
        },
      },
      orderBy: { collectedAt: 'desc' },
      take: 100,
    });
  }

  async recordCollection(workspaceId: string, dto: {
    leaseId: string;
    amount: number;
    collectedAt: Date;
    method: RentCollectionMethod;
    referenceNo?: string;
    periodStart?: Date;
    periodEnd?: Date;
    notes?: string;
  }) {
    const lease = await this.prisma.lease.findFirst({
      where: { id: dto.leaseId, workspaceId },
      include: { tenant: true, unit: { include: { property: true } } },
    });
    if (!lease) throw new NotFoundException('Lease not found');

    const collectedAt = new Date(dto.collectedAt ?? new Date());
    const periodStart = dto.periodStart ? new Date(dto.periodStart) : new Date(lease.startDate);
    const periodEnd = dto.periodEnd ? new Date(dto.periodEnd) : new Date(lease.endDate);

    const collection = await this.prisma.rentCollection.create({
      data: {
        workspaceId,
        leaseId: dto.leaseId,
        tenantId: lease.tenantId,
        amount: dto.amount,
        collectedAt,
        periodStart,
        periodEnd,
        method: dto.method,
        referenceNo: dto.referenceNo,
        notes: dto.notes,
      },
    });

    await this.notificationsQueue.add('payment-received', {
      leaseId: dto.leaseId,
      amount: dto.amount,
      tenantId: lease.tenantId,
      workspaceId,
    });

    return collection;
  }

  // ── PDC Cheques ───────────────────────────────────────────────────

  async getCheques(workspaceId: string, filters?: { leaseId?: string; status?: ChequeStatus; dueMonth?: Date }) {
    return this.prisma.pdcCheque.findMany({
      where: {
        lease: { workspaceId },
        ...(filters?.leaseId && { leaseId: filters.leaseId }),
        ...(filters?.status && { status: filters.status }),
      },
      include: {
        lease: {
          include: {
            tenant: { select: { fullName: true, phone: true } },
            unit: { select: { unitNumber: true, property: { select: { name: true } } } },
          },
        },
      },
      orderBy: { dueDate: 'asc' },
    });
  }

  async updateChequeStatus(chequeId: string, status: ChequeStatus, bouncedReason?: string) {
    return this.prisma.pdcCheque.update({
      where: { id: chequeId },
      data: {
        status,
        ...(bouncedReason && { bouncedReason }),
        ...(status === ChequeStatus.CLEARED && { clearedAt: new Date() }),
      },
    });
  }

  async getOverdueRent(workspaceId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.prisma.pdcCheque.findMany({
      where: {
        lease: { workspaceId, status: 'ACTIVE' },
        dueDate: { lt: today },
        status: ChequeStatus.PENDING,
      },
      include: {
        lease: {
          include: {
            tenant: { select: { id: true, fullName: true, phone: true, email: true } },
            unit: { select: { unitNumber: true, property: { select: { name: true } } } },
          },
        },
      },
      orderBy: { dueDate: 'asc' },
    });
  }

  // ── Expenses ──────────────────────────────────────────────────────

  async getExpenses(workspaceId: string, filters?: { propertyId?: string; unitId?: string }) {
    return this.prisma.expense.findMany({
      where: {
        workspaceId,
        ...(filters?.propertyId && { propertyId: filters.propertyId }),
        ...(filters?.unitId && { unitId: filters.unitId }),
      },
      orderBy: { expenseDate: 'desc' },
      take: 100,
    });
  }

  async createExpense(workspaceId: string, dto: {
    propertyId: string;
    unitId?: string;
    category: string;
    amount: number;
    expenseDate: Date;
    description?: string;
    vendorName?: string;
    invoiceNo?: string;
  }) {
    const property = await this.prisma.property.findFirst({ where: { id: dto.propertyId, workspaceId } });
    if (!property) throw new NotFoundException('Property not found');

    return this.prisma.expense.create({ data: { workspaceId, ...dto } });
  }

  // ── Owner SOA ─────────────────────────────────────────────────────

  async getOwnerSoa(workspaceId: string, ownerId: string, period: string) {
    const [year, month] = period.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const owner = await this.prisma.owner.findFirst({ where: { id: ownerId, workspaceId } });
    if (!owner) throw new NotFoundException('Owner not found');

    const soa = await this.prisma.ownerSoa.findFirst({
      where: { workspaceId, ownerId, periodStart: { gte: startDate }, periodEnd: { lte: endDate } },
    });

    if (soa) return soa;

    // Generate on-the-fly if not exists
    const properties = await this.prisma.property.findMany({
      where: { workspaceId, ownerId },
      include: {
        units: {
          include: {
            leases: {
              where: { startDate: { lte: endDate }, endDate: { gte: startDate } },
              include: { rentCollections: { where: { collectedAt: { gte: startDate, lte: endDate } } } },
            },
          },
        },
        expenses: { where: { expenseDate: { gte: startDate, lte: endDate } } },
      },
    });

    let totalRent = 0;
    let totalExpenses = 0;

    for (const property of properties) {
      for (const unit of property.units) {
        for (const lease of unit.leases) {
          totalRent += lease.rentCollections.reduce((sum, c) => sum + Number(c.amount), 0);
        }
      }
      totalExpenses += property.expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    }

    const mgmtFee = totalRent * (owner.mgmtFeePct / 100);
    const netAmount = totalRent - totalExpenses - mgmtFee;

    return {
      ownerId,
      periodStart: startDate,
      periodEnd: endDate,
      totalRentCollected: totalRent,
      totalExpenses,
      mgmtFee,
      netAmount,
      currencyCode: 'AED',
      properties,
    };
  }

  // ── Commissions ───────────────────────────────────────────────────

  async listCommissions(workspaceId: string, filters?: { status?: string; leaseId?: string }) {
    return this.prisma.commission.findMany({
      where: {
        workspaceId,
        ...(filters?.status && { status: filters.status as any }),
        ...(filters?.leaseId && { leaseId: filters.leaseId }),
      },
      include: {
        lease: {
          include: {
            tenant: { select: { fullName: true } },
            unit: { select: { unitNumber: true, property: { select: { name: true } } } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── Dashboard Summary ──────────────────────────────────────────────

  async getDashboardSummary(workspaceId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [revenueMtd, overdueCheques, totalUnits, vacantUnits] = await Promise.all([
      this.prisma.rentCollection.aggregate({
        where: { workspaceId, collectedAt: { gte: startOfMonth } },
        _sum: { amount: true },
      }),
      this.prisma.pdcCheque.findMany({
        where: {
          lease: { workspaceId, status: 'ACTIVE' },
          dueDate: { lt: now },
          status: ChequeStatus.PENDING,
        },
        select: { amount: true },
      }),
      this.prisma.unit.count({ where: { workspaceId } }),
      this.prisma.unit.count({ where: { workspaceId, occupancyStatus: 'VACANT' } }),
    ]);

    const overdueAmount = overdueCheques.reduce((sum, c) => sum + Number(c.amount), 0);
    const occupancyRate = totalUnits > 0 ? ((totalUnits - vacantUnits) / totalUnits) * 100 : 0;

    return {
      revenueMtd: revenueMtd._sum.amount ?? 0,
      overdueAmount,
      overdueCount: overdueCheques.length,
      totalUnits,
      vacantUnits,
      occupancyRate: Math.round(occupancyRate * 10) / 10,
    };
  }
}
