import { Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../database/prisma.service';
import { AecbService } from '../../modules/aecb/aecb.service';

/**
 * AECB monthly reporting — on the 5th of each month, queue rent payment reports
 * for all opted-in tenants for the prior month.
 *
 * When a real AECB membership is configured, a separate worker (not yet implemented)
 * picks up queued reports and submits them via the bureau's secure file transfer.
 */
@Processor('aecb-monthly')
export class AecbMonthlyProcessor {
  private readonly log = new Logger(AecbMonthlyProcessor.name);

  constructor(private prisma: PrismaService, private aecb: AecbService) {}

  @Cron('0 3 5 * *', { timeZone: 'Asia/Dubai' })
  async monthlyQueue() {
    const workspaces = await this.prisma.workspace.findMany({ where: { status: 'ACTIVE' } });
    const priorMonth = new Date();
    priorMonth.setDate(1);
    priorMonth.setMonth(priorMonth.getMonth() - 1);

    let total = 0;
    for (const ws of workspaces) {
      const result = await this.aecb.queueMonthlyReports(ws.id, priorMonth);
      total += result.queued;
    }
    this.log.log(`AECB monthly reports queued: ${total}`);
  }
}
