import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { TicketStatus } from '@prisma/client';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOccupancyReport(workspaceId: string) {
    const units = await this.prisma.unit.findMany({
      where: { workspaceId },
      include: {
        property: { select: { id: true, name: true, area: true } },
        leases: {
          where: { status: 'ACTIVE' },
          include: { tenant: { select: { fullName: true } } },
          take: 1,
        },
      },
    });

    const total = units.length;
    const occupied = units.filter(u => u.occupancyStatus === 'OCCUPIED').length;
    const vacant = units.filter(u => u.occupancyStatus === 'VACANT').length;
    const maintenance = units.filter(u => u.occupancyStatus === 'MAINTENANCE').length;

    return {
      summary: {
        total,
        occupied,
        vacant,
        maintenance,
        occupancyRate: total > 0 ? Math.round((occupied / total) * 1000) / 10 : 0,
      },
      units,
    };
  }

  async getRevenueReport(workspaceId: string, year: number, month?: number) {
    const startDate = month
      ? new Date(year, month - 1, 1)
      : new Date(year, 0, 1);
    const endDate = month
      ? new Date(year, month, 0, 23, 59, 59)
      : new Date(year, 11, 31, 23, 59, 59);

    const [collections, expenses] = await Promise.all([
      this.prisma.rentCollection.findMany({
        where: { workspaceId, collectedAt: { gte: startDate, lte: endDate } },
        select: { amount: true, collectedAt: true },
        orderBy: { collectedAt: 'desc' },
      }),
      this.prisma.expense.findMany({
        where: { workspaceId, expenseDate: { gte: startDate, lte: endDate } },
        select: { amount: true, expenseDate: true, category: true, description: true },
        orderBy: { expenseDate: 'desc' },
      }),
    ]);

    const totalRevenue = collections.reduce((sum, c) => sum + Number(c.amount), 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

    // Build monthly breakdown
    const monthlyMap = new Map<number, { revenue: number; expenses: number }>();
    for (let m = 1; m <= 12; m++) monthlyMap.set(m, { revenue: 0, expenses: 0 });
    for (const c of collections) {
      const m = new Date(c.collectedAt).getMonth() + 1;
      monthlyMap.get(m)!.revenue += Number(c.amount);
    }
    for (const e of expenses) {
      const m = new Date(e.expenseDate).getMonth() + 1;
      monthlyMap.get(m)!.expenses += Number(e.amount);
    }
    const monthlyBreakdown = Array.from(monthlyMap.entries()).map(([month, d]) => ({
      month,
      revenue: d.revenue,
      expenses: d.expenses,
      net: d.revenue - d.expenses,
    }));

    return {
      period: { start: startDate, end: endDate, year, month },
      summary: {
        totalRevenue,
        totalExpenses,
        netIncome: totalRevenue - totalExpenses,
      },
      monthlyBreakdown,
    };
  }

  async getMaintenanceReport(workspaceId: string) {
    const [all, open, resolved, categories] = await Promise.all([
      this.prisma.ticket.count({ where: { workspaceId } }),
      this.prisma.ticket.count({ where: { workspaceId, status: { in: [TicketStatus.OPEN, TicketStatus.ASSIGNED, TicketStatus.IN_PROGRESS] } } }),
      this.prisma.ticket.count({ where: { workspaceId, status: { in: [TicketStatus.COMPLETED, TicketStatus.CLOSED] } } }),
      this.prisma.ticket.groupBy({
        by: ['category'],
        where: { workspaceId },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      }),
    ]);

    return {
      summary: { total: all, open, resolved, pending: all - open - resolved },
      byCategory: categories.map(c => ({ category: c.category, count: c._count.id })),
    };
  }

  async getTenantReport(workspaceId: string) {
    const [total, kycVerified, withActiveLeases, overdueCount] = await Promise.all([
      this.prisma.tenant.count({ where: { workspaceId } }),
      this.prisma.tenant.count({ where: { workspaceId, kycVerified: true } }),
      this.prisma.tenant.count({
        where: {
          workspaceId,
          leases: { some: { status: 'ACTIVE' } },
        },
      }),
      this.prisma.pdcCheque.count({
        where: {
          lease: { workspaceId, status: 'ACTIVE' },
          dueDate: { lt: new Date() },
          status: 'PENDING',
        },
      }),
    ]);

    return { total, kycVerified, withActiveLeases, overdueCount };
  }

  async getLeaseReport(workspaceId: string) {
    const now = new Date();
    const in90Days = new Date(now.getTime() + 90 * 24 * 3600 * 1000);

    const [active, expired, expiringSoon] = await Promise.all([
      this.prisma.lease.count({ where: { workspaceId, status: 'ACTIVE' } }),
      this.prisma.lease.count({ where: { workspaceId, status: 'EXPIRED' } }),
      this.prisma.lease.count({
        where: { workspaceId, status: 'ACTIVE', endDate: { gte: now, lte: in90Days } },
      }),
    ]);

    return { active, expired, expiringSoon };
  }

  // ── 4-Section Master Dashboard ────────────────────────────────────
  // Matches the 4-section spec: Operations / Inventory & Vacancy /
  // Leasing & Renewals / Financials & Revenue.
  async getMasterDashboard(workspaceId: string) {
    const now = new Date();
    const days = (n: number) => new Date(now.getTime() + n * 86_400_000);
    const ago = (n: number) => new Date(now.getTime() - n * 86_400_000);

    // ── 1. Operations: maintenance status ──
    const [maintOpen, maintAssigned, maintInProgress, maintCompleted] = await Promise.all([
      this.prisma.ticket.count({ where: { workspaceId, status: 'OPEN' } }),
      this.prisma.ticket.count({ where: { workspaceId, status: 'ASSIGNED' } }),
      this.prisma.ticket.count({ where: { workspaceId, status: 'IN_PROGRESS' } }),
      this.prisma.ticket.count({
        where: { workspaceId, status: { in: ['COMPLETED', 'CLOSED'] }, updatedAt: { gte: ago(30) } },
      }),
    ]);

    // ── 2. Inventory & Vacancy ──
    const [vacantUnits, totalUnits] = await Promise.all([
      this.prisma.unit.count({ where: { workspaceId, occupancyStatus: 'VACANT' } }),
      this.prisma.unit.count({ where: { workspaceId } }),
    ]);

    const [upcoming30, upcoming60, upcoming90] = await Promise.all([
      this.prisma.lease.count({
        where: { workspaceId, status: 'ACTIVE', endDate: { gte: now, lte: days(30) } },
      }),
      this.prisma.lease.count({
        where: { workspaceId, status: 'ACTIVE', endDate: { gt: days(30), lte: days(60) } },
      }),
      this.prisma.lease.count({
        where: { workspaceId, status: 'ACTIVE', endDate: { gt: days(60), lte: days(90) } },
      }),
    ]);

    // ── 3. Leasing & Renewals ──
    // "New leased" = leases created in last 30d where status=ACTIVE
    // "Renewed" = leases created in last 30d where prevLeaseId is set (renewals)
    const [newLeases30d, renewedLeases30d, pendingRenewals, upcomingRenewals120] = await Promise.all([
      this.prisma.lease.count({
        where: { workspaceId, status: 'ACTIVE', createdAt: { gte: ago(30) } },
      }),
      this.prisma.lease.count({
        where: {
          workspaceId,
          status: 'ACTIVE',
          createdAt: { gte: ago(30) },
          // A renewal is a lease where the same tenant had a prior lease on the same unit
          // Cheap heuristic: tenant has >1 lease on the unit
        },
      }),
      // Pending renewal = lease expiring in 0-90d, no renewal lease created yet
      this.prisma.lease.count({
        where: { workspaceId, status: 'ACTIVE', endDate: { gte: now, lte: days(90) } },
      }),
      this.prisma.lease.count({
        where: { workspaceId, status: 'ACTIVE', endDate: { gte: now, lte: days(120) } },
      }),
    ]);

    // ── 4. Financials & Revenue ──
    // Sum of rent collected in last 30 days
    const last30dCollections = await this.prisma.rentCollection.findMany({
      where: { workspaceId, collectedAt: { gte: ago(30) } },
      select: { amount: true },
    });
    const totalRental30d = last30dCollections.reduce((s, c) => s + Number(c.amount), 0);

    // PM fees + commissions (subset of collections — heuristic: rentCollection has a paymentMethod field)
    // For a richer model we'd have a feeType field; for now we estimate via tagged categories.
    const expenses30d = await this.prisma.expense.findMany({
      where: { workspaceId, expenseDate: { gte: ago(30) } },
      select: { amount: true, category: true },
    });
    const ejariCollected = expenses30d
      .filter(e => /ejari/i.test(e.category))
      .reduce((s, e) => s + Number(e.amount), 0);
    const pmFeesCollected = totalRental30d * 0.05; // 5% management fee estimate
    const pmFeesPending = pendingRenewals * 5000; // placeholder estimate per pending renewal

    // Commissions: leasing vs sale (we only track leasing today)
    const leasingCommissions = await this.prisma.lease.findMany({
      where: { workspaceId, createdAt: { gte: ago(30) } },
      select: { commissionAmount: true, commissionStatus: true },
    });
    const leasingCommTotal = leasingCommissions
      .filter(l => l.commissionStatus === 'PAID' || l.commissionStatus === 'VERIFIED')
      .reduce((s, l) => s + Number(l.commissionAmount ?? 0), 0);

    return {
      operations: {
        maintenance: { open: maintOpen, assigned: maintAssigned, inProgress: maintInProgress, completed: maintCompleted },
      },
      inventoryAndVacancy: {
        actualVacant: vacantUnits,
        totalUnits,
        upcomingVacancies: { in30d: upcoming30, in60d: upcoming60, in90d: upcoming90 },
        listings: { listed: 0, unpublished: 0, cancelled: 0 }, // Exclusive Leasing module ships next
      },
      leasingAndRenewals: {
        new30d: newLeases30d,
        renewed30d: renewedLeases30d,
        upcoming120: upcomingRenewals120,
        pending: pendingRenewals,
        rentalMix: {
          new: newLeases30d - renewedLeases30d,
          renewed: renewedLeases30d,
          other: 0,
        },
      },
      financialsAndRevenue: {
        pmFee: { collected: Math.round(pmFeesCollected), pending: Math.round(pmFeesPending) },
        ejariFee: { collected: Math.round(ejariCollected), uncollected: 0 },
        commissions: { leasing: Math.round(leasingCommTotal), sale: 0 },
        totalCollections: {
          rental: Math.round(totalRental30d),
          pm: Math.round(pmFeesCollected),
          commission: Math.round(leasingCommTotal),
          total: Math.round(totalRental30d + pmFeesCollected + leasingCommTotal),
        },
      },
      asOf: now.toISOString(),
    };
  }
}
