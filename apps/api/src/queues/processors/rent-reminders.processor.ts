import { Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../database/prisma.service';
import { TwilioService } from '../../integrations/twilio.service';

/**
 * Daily rent-reminder dispatch.
 *
 * Sends T-7 / T-3 / T-1 reminders to tenants for upcoming PDC presentments +
 * post-due gentle nudges.
 */
@Processor('rent-reminders')
export class RentRemindersProcessor {
  private readonly log = new Logger(RentRemindersProcessor.name);

  constructor(private prisma: PrismaService, private twilio: TwilioService) {}

  @Cron('30 9 * * *', { timeZone: 'Asia/Dubai' })
  async dailyDispatch() {
    const now = new Date();
    const cheques = await this.prisma.pdcCheque.findMany({
      where: {
        status: 'PENDING',
        dueDate: { gte: now, lte: new Date(now.getTime() + 7 * 86_400_000) },
      },
      include: { lease: { include: { tenant: true, unit: true } } },
    });

    for (const c of cheques) {
      const daysUntil = Math.ceil((c.dueDate.getTime() - now.getTime()) / 86_400_000);
      if (![7, 3, 1].includes(daysUntil)) continue;
      const tenant = c.lease.tenant;
      if (!tenant?.phone) continue;
      const body = `Reminder: Your rent cheque ${c.chequeNumber} for AED ${Number(c.amount).toLocaleString('en-AE')} will be presented in ${daysUntil} day${daysUntil === 1 ? '' : 's'} (${c.dueDate.toLocaleDateString('en-AE')}). Please ensure funds are available. Reply for help.`;
      await this.twilio.sendWhatsApp(tenant.phone, body).catch((e) => this.log.error(e));
    }
    this.log.log(`Rent reminders dispatched — ${cheques.length} cheques in window`);
  }
}
