import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Job } from 'bull';
import { PrismaService } from '../../database/prisma.service';
import { TwilioService } from '../../integrations/twilio.service';
import { EmailService } from '../../integrations/email.service';

/**
 * Compliance expiry alerts.
 *
 * Daily at 06:00 Dubai time we scan all compliance items, compute days-to-expiry,
 * and dispatch reminders matching the item's reminderDaysBefore window.
 */
@Processor('compliance-alerts')
export class ComplianceAlertsProcessor {
  private readonly log = new Logger(ComplianceAlertsProcessor.name);

  constructor(private prisma: PrismaService, private twilio: TwilioService, private email: EmailService) {}

  @Cron('0 6 * * *', { timeZone: 'Asia/Dubai' })
  async scanDaily() {
    const items = await this.prisma.complianceItem.findMany({
      where: { expiryDate: { gte: new Date() }, status: { in: ['VALID', 'EXPIRING_SOON'] } },
      include: { workspace: { select: { id: true, name: true, contactEmail: true, contactPhone: true } } },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let dispatched = 0;
    for (const item of items) {
      const days = Math.floor((item.expiryDate.getTime() - today.getTime()) / 86_400_000);
      if (days <= item.reminderDaysBefore && (item.lastReminderAt === null || (today.getTime() - item.lastReminderAt.getTime()) >= 7 * 86_400_000)) {
        const body = `🛡 Compliance reminder: ${item.name} (${item.category}) expires in ${days} day${days === 1 ? '' : 's'}. Reference: ${item.referenceNumber ?? 'N/A'}.`;
        if (item.workspace.contactPhone) {
          await this.twilio.sendWhatsApp(item.workspace.contactPhone, body).catch((e) => this.log.error(e));
        }
        if (item.workspace.contactEmail) {
          await this.email.send({
            to: item.workspace.contactEmail,
            subject: `Compliance expiry in ${days} days — ${item.name}`,
            html: `<p>${body}</p>`,
          }).catch((e) => this.log.error(e));
        }
        await this.prisma.complianceItem.update({
          where: { id: item.id },
          data: { lastReminderAt: new Date(), remindersSentCount: { increment: 1 }, status: days <= 30 ? 'EXPIRING_SOON' : 'VALID' },
        });
        dispatched++;
      }
    }
    this.log.log(`Compliance scan complete — ${dispatched} reminders dispatched, ${items.length} items reviewed`);

    // Mark expired
    await this.prisma.complianceItem.updateMany({
      where: { expiryDate: { lt: today }, status: { not: 'EXPIRED' } },
      data: { status: 'EXPIRED' },
    });
  }

  @Process('manual-scan')
  manualScan(_job: Job) {
    return this.scanDaily();
  }
}
