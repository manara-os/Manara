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

  async getRevenueReport(workspaceId: string, year?: number, month?: number, period?: string) {
    // Resolve date range: named period takes precedence over year/month
    let startDate: Date;
    let endDate: Date;
    const now = new Date();
    if (period === 'today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    } else if (period === 'week') {
      startDate = new Date(now.getTime() - 7 * 86_400_000);
      endDate = now;
    } else if (period === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = now;
    } else if (period === 'quarter') {
      startDate = new Date(now.getTime() - 90 * 86_400_000);
      endDate = now;
    } else if (period === 'all') {
      startDate = new Date(2020, 0, 1);
      endDate = new Date(2099, 11, 31);
    } else if (year) {
      startDate = month ? new Date(year, month - 1, 1) : new Date(year, 0, 1);
      endDate = month ? new Date(year, month, 0, 23, 59, 59) : new Date(year, 11, 31, 23, 59, 59);
    } else {
      // Default: trailing 12 months
      startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1);
      endDate = now;
    }

    const [collections, expenses] = await Promise.all([
      this.prisma.rentCollection.findMany({
        where: { workspaceId, collectedAt: { gte: startDate, lte: endDate } },
        select: { amount: true, collectedAt: true, vatAmount: true, method: true },
        orderBy: { collectedAt: 'desc' },
      }),
      this.prisma.expense.findMany({
        where: { workspaceId, expenseDate: { gte: startDate, lte: endDate } },
        select: { amount: true, expenseDate: true, category: true, description: true, vatAmount: true },
        orderBy: { expenseDate: 'desc' },
      }),
    ]);

    const totalRevenue = collections.reduce((sum, c) => sum + Number(c.amount), 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const totalVatCollected = collections.reduce((sum, c) => sum + Number(c.vatAmount ?? 0), 0);
    const totalVatPaid = expenses.reduce((sum, e) => sum + Number(e.vatAmount ?? 0), 0);

    // Build monthly breakdown (YYYY-MM keyed)
    const monthlyMap = new Map<string, { month: string; revenue: number; expenses: number }>();
    for (const c of collections) {
      const key = new Date(c.collectedAt).toISOString().slice(0, 7);
      const label = new Date(c.collectedAt).toLocaleDateString('en-AE', { month: 'short', year: '2-digit' });
      const row = monthlyMap.get(key) ?? { month: label, revenue: 0, expenses: 0 };
      row.revenue += Number(c.amount);
      monthlyMap.set(key, row);
    }
    for (const e of expenses) {
      const key = new Date(e.expenseDate).toISOString().slice(0, 7);
      const label = new Date(e.expenseDate).toLocaleDateString('en-AE', { month: 'short', year: '2-digit' });
      const row = monthlyMap.get(key) ?? { month: label, revenue: 0, expenses: 0 };
      row.expenses += Number(e.amount);
      monthlyMap.set(key, row);
    }
    const monthlyBreakdown = Array.from(monthlyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => ({ ...v, net: v.revenue - v.expenses }));

    return {
      period: { start: startDate, end: endDate, year, month, name: period ?? null },
      // Top-level flat fields (used by frontend KPI tiles)
      totalRevenue,
      totalExpenses,
      netIncome: totalRevenue - totalExpenses,
      totalVatCollected,
      totalVatPaid,
      // Arrays (used by charts + breakdowns)
      collections,
      expenses,
      monthlyBreakdown,
      // Nested copy (legacy / API consumers)
      summary: { totalRevenue, totalExpenses, netIncome: totalRevenue - totalExpenses },
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
  //
  // `period` controls the lookback window for "in last X days" metrics:
  //   today (1d) | week (7d) | month (calendar month) | quarter (90d) |
  //   all (always-on counters, no window) | undefined → 30d default
  async getMasterDashboard(workspaceId: string, period?: string) {
    const now = new Date();
    const days = (n: number) => new Date(now.getTime() + n * 86_400_000);
    const ago = (n: number) => new Date(now.getTime() - n * 86_400_000);

    // Resolve the rolling window for "last X" counters
    let windowStart: Date;
    let windowDaysLabel: number;
    if (period === 'today')        { windowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()); windowDaysLabel = 1; }
    else if (period === 'week')    { windowStart = ago(7);   windowDaysLabel = 7; }
    else if (period === 'month')   { windowStart = new Date(now.getFullYear(), now.getMonth(), 1); windowDaysLabel = now.getDate(); }
    else if (period === 'quarter') { windowStart = ago(90);  windowDaysLabel = 90; }
    else if (period === 'all')     { windowStart = new Date(2020, 0, 1); windowDaysLabel = 0; }
    else                           { windowStart = ago(30);  windowDaysLabel = 30; } // default trailing 30d

    // ── 1. Operations: maintenance status ──
    const [maintOpen, maintAssigned, maintInProgress, maintCompleted] = await Promise.all([
      this.prisma.ticket.count({ where: { workspaceId, status: 'OPEN' } }),
      this.prisma.ticket.count({ where: { workspaceId, status: 'ASSIGNED' } }),
      this.prisma.ticket.count({ where: { workspaceId, status: 'IN_PROGRESS' } }),
      this.prisma.ticket.count({
        where: { workspaceId, status: { in: ['COMPLETED', 'CLOSED'] }, updatedAt: { gte: windowStart } },
      }),
    ]);

    // ── 2. Inventory & Vacancy ──
    const [vacantUnits, totalUnits, listingsListed, listingsUnpub, listingsCancelled] = await Promise.all([
      this.prisma.unit.count({ where: { workspaceId, occupancyStatus: 'VACANT' } }),
      this.prisma.unit.count({ where: { workspaceId } }),
      this.prisma.propertyListing.count({ where: { workspaceId, status: 'ACTIVE' } }),
      this.prisma.propertyListing.count({ where: { workspaceId, status: 'PAUSED' } }),
      this.prisma.propertyListing.count({ where: { workspaceId, status: 'EXPIRED' } }),
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
    const [newLeasesWindow, renewedLeasesWindow, pendingRenewals, upcomingRenewals120] = await Promise.all([
      this.prisma.lease.count({
        where: { workspaceId, status: 'ACTIVE', createdAt: { gte: windowStart } },
      }),
      this.prisma.lease.count({
        where: {
          workspaceId,
          status: 'RENEWED',
          createdAt: { gte: windowStart },
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
    const windowCollections = await this.prisma.rentCollection.findMany({
      where: { workspaceId, collectedAt: { gte: windowStart } },
      select: { amount: true },
    });
    const totalRentalInWindow = windowCollections.reduce((s, c) => s + Number(c.amount), 0);

    const windowExpenses = await this.prisma.expense.findMany({
      where: { workspaceId, expenseDate: { gte: windowStart } },
      select: { amount: true, category: true },
    });
    const ejariCollected = windowExpenses
      .filter(e => /ejari/i.test(e.category))
      .reduce((s, e) => s + Number(e.amount), 0);
    const pmFeesCollected = totalRentalInWindow * 0.05;
    const pmFeesPending = pendingRenewals * 5000;

    const leasingCommissions = await this.prisma.lease.findMany({
      where: { workspaceId, createdAt: { gte: windowStart } },
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
        listings: { listed: listingsListed, unpublished: listingsUnpub, cancelled: listingsCancelled },
      },
      leasingAndRenewals: {
        new30d: newLeasesWindow,
        renewed30d: renewedLeasesWindow,
        upcoming120: upcomingRenewals120,
        pending: pendingRenewals,
        rentalMix: {
          new: newLeasesWindow - renewedLeasesWindow,
          renewed: renewedLeasesWindow,
          other: 0,
        },
      },
      financialsAndRevenue: {
        pmFee: { collected: Math.round(pmFeesCollected), pending: Math.round(pmFeesPending) },
        ejariFee: { collected: Math.round(ejariCollected), uncollected: 0 },
        commissions: { leasing: Math.round(leasingCommTotal), sale: 0 },
        totalCollections: {
          rental: Math.round(totalRentalInWindow),
          pm: Math.round(pmFeesCollected),
          commission: Math.round(leasingCommTotal),
          total: Math.round(totalRentalInWindow + pmFeesCollected + leasingCommTotal),
        },
      },
      period: { name: period ?? '30d', windowStart, windowDaysLabel },
      asOf: now.toISOString(),
    };
  }
}
