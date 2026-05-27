import { Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../database/prisma.service';
import { VendorScoresService } from '../../modules/vendor-scores/vendor-scores.service';

/**
 * Nightly vendor leaderboard recompute.
 * Iterates all active workspaces and refreshes 90-day vendor scores.
 */
@Processor('vendor-scores')
export class VendorScoreProcessor {
  private readonly log = new Logger(VendorScoreProcessor.name);

  constructor(private prisma: PrismaService, private scores: VendorScoresService) {}

  @Cron('0 2 * * *', { timeZone: 'Asia/Dubai' })
  async nightlyRecompute() {
    const workspaces = await this.prisma.workspace.findMany({ where: { status: 'ACTIVE' } });
    const periodStart = new Date(Date.now() - 90 * 86_400_000);
    let totalVendors = 0;
    for (const ws of workspaces) {
      const result = await this.scores.recompute(ws.id, periodStart);
      totalVendors += result.length;
    }
    this.log.log(`Vendor leaderboard refreshed — ${totalVendors} vendors across ${workspaces.length} workspaces`);
  }
}
