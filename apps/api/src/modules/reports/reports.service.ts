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
}
