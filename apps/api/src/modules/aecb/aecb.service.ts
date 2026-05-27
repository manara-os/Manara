import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AecbReportStatus } from '@prisma/client';

@Injectable()
export class AecbService {
  constructor(private prisma: PrismaService) {}

  async getTenantHistory(workspaceId: string, tenantId: string) {
    const reports = await this.prisma.aecbReport.findMany({
      where: { workspaceId, tenantId },
      orderBy: { reportingMonth: 'desc' },
    });
    const tenant = await this.prisma.tenant.findFirst({ where: { id: tenantId, workspaceId } });
    const optedIn = ((tenant?.meta as any)?.aecbOptIn) === true;

    // Aggregate score trajectory (mock when AECB API not configured; computed from on-time payment count)
    const currentScore = 650 + reports.filter((r) => r.onTimePayment).length * 12;

    return {
      optedIn,
      currentScore: Math.min(900, currentScore),
      reports,
      tier: currentScore >= 750 ? 'Excellent' : currentScore >= 650 ? 'Good' : 'Building',
    };
  }

  async setOptIn(workspaceId: string, tenantId: string, optIn: boolean) {
    return this.prisma.tenant.update({
      where: { id: tenantId, workspaceId } as any,
      data: { meta: { aecbOptIn: optIn, aecbOptInChangedAt: new Date().toISOString() } },
    });
  }

  async queueMonthlyReports(workspaceId: string, monthDate: Date) {
    // Find all opted-in tenants with on-time payments for the month
    const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 23, 59, 59);

    const tenants = await this.prisma.tenant.findMany({
      where: { workspaceId, isActive: true },
      include: {
        rentCollections: { where: { collectedAt: { gte: monthStart, lte: monthEnd } } },
      },
    });

    let queued = 0;
    for (const t of tenants) {
      const meta = t.meta as any;
      if (meta?.aecbOptIn !== true) continue;
      if (!t.rentCollections.length) continue;
      const onTime = t.rentCollections.every((rc) => rc.collectedAt.getTime() <= rc.periodStart.getTime() + 5 * 86_400_000);
      const totalAmount = t.rentCollections.reduce((s, rc) => s + Number(rc.amount), 0);
      try {
        await this.prisma.aecbReport.create({
          data: {
            workspaceId,
            tenantId: t.id,
            reportingMonth: monthStart,
            onTimePayment: onTime,
            amountAed: totalAmount,
            status: AecbReportStatus.QUEUED,
          },
        });
        queued++;
      } catch (_) {
        // unique constraint — already queued
      }
    }
    return { queued, month: monthStart.toISOString().slice(0, 7) };
  }
}
