import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class VendorScoresService {
  constructor(private prisma: PrismaService) {}

  async leaderboard(workspaceId: string, period: '30D' | '90D' | 'YTD' = '90D') {
    const days = period === '30D' ? 30 : period === '90D' ? 90 : 365;
    const periodStart = new Date(Date.now() - days * 86_400_000);

    // If we have precomputed scores for this period, use them
    const stored = await this.prisma.vendorScore.findMany({
      where: { workspaceId, periodEnd: { gte: new Date(Date.now() - 86_400_000) } },
      include: { vendor: { select: { id: true, companyName: true, serviceCategories: true } } },
      orderBy: { compositeScore: 'desc' },
      take: 50,
    });
    if (stored.length) return stored;

    // Otherwise compute on the fly
    return this.recompute(workspaceId, periodStart);
  }

  async recompute(workspaceId: string, periodStart: Date) {
    const vendors = await this.prisma.vendor.findMany({
      where: { workspaceId, isApproved: true },
      include: {
        tickets: {
          where: { completedAt: { gte: periodStart } },
          select: {
            id: true,
            completedAt: true,
            assignedAt: true,
            slaBreached: true,
            tenantRating: true,
            vendorInvoiceAmount: true,
            invoiceApprovedAt: true,
          },
        },
      },
    });

    const periodEnd = new Date();
    const scores: any[] = [];

    for (const vendor of vendors) {
      const jobs = vendor.tickets;
      const jobsCompleted = jobs.length;
      const ratings = jobs.filter((t) => t.tenantRating).map((t) => t.tenantRating!);
      const avgRating = ratings.length ? ratings.reduce((s, r) => s + r, 0) / ratings.length : 0;
      const responseHours = jobs
        .filter((t) => t.assignedAt && t.completedAt)
        .map((t) => (t.completedAt!.getTime() - t.assignedAt!.getTime()) / 3_600_000);
      const avgResponseHours = responseHours.length ? responseHours.reduce((s, h) => s + h, 0) / responseHours.length : 0;
      const reworkRate = 0; // would need re-open tracking; default 0
      const slaCompliance = jobs.length ? ((jobs.length - jobs.filter((t) => t.slaBreached).length) / jobs.length) * 100 : 100;
      const totalEarned = jobs.reduce((s, t) => s + Number(t.vendorInvoiceAmount ?? 0), 0);

      // Composite score weighted
      const compositeScore =
        (jobsCompleted / Math.max(50, jobsCompleted)) * 15 +
        (avgRating / 5) * 30 +
        Math.max(0, 100 - avgResponseHours) * 0.2 +
        Math.max(0, 100 - reworkRate * 10) * 0.2 +
        (slaCompliance / 100) * 15;

      const badges: string[] = [];
      if (avgRating >= 4.8) badges.push('Top rated');
      if (avgResponseHours > 0 && avgResponseHours < 4) badges.push('Lightning response');
      if (reworkRate < 2) badges.push('Zero-rework quality');
      if (jobsCompleted > 200) badges.push('High volume');

      const upserted = await this.prisma.vendorScore.upsert({
        where: { vendorId_periodStart_periodEnd: { vendorId: vendor.id, periodStart, periodEnd } },
        create: {
          workspaceId,
          vendorId: vendor.id,
          periodStart,
          periodEnd,
          jobsCompleted,
          avgRating,
          avgResponseHours,
          reworkRatePct: reworkRate,
          slaCompliancePct: slaCompliance,
          totalEarnedAed: totalEarned,
          compositeScore,
          badges,
        },
        update: {
          jobsCompleted,
          avgRating,
          avgResponseHours,
          reworkRatePct: reworkRate,
          slaCompliancePct: slaCompliance,
          totalEarnedAed: totalEarned,
          compositeScore,
          badges,
          computedAt: new Date(),
        },
      });
      scores.push({ ...upserted, vendor: { id: vendor.id, companyName: vendor.companyName, serviceCategories: vendor.serviceCategories } });
    }

    scores.sort((a, b) => Number(b.compositeScore) - Number(a.compositeScore));
    // Assign ranks
    for (let i = 0; i < scores.length; i++) {
      const prevRank = scores[i].rank;
      const newRank = i + 1;
      if (prevRank !== newRank) {
        await this.prisma.vendorScore.update({ where: { id: scores[i].id }, data: { prevRank, rank: newRank } });
        scores[i].prevRank = prevRank;
        scores[i].rank = newRank;
      }
    }
    return scores;
  }
}
