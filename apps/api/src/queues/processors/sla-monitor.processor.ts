import { Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../database/prisma.service';
import { TwilioService } from '../../integrations/twilio.service';

/**
 * SLA Monitor — every 15 minutes, find tickets whose SLA window has passed without completion
 * and mark them breached + dispatch escalation alerts to PM staff via WhatsApp.
 */
@Processor('sla-monitor')
export class SlaMonitorProcessor {
  private readonly log = new Logger(SlaMonitorProcessor.name);

  constructor(private prisma: PrismaService, private twilio: TwilioService) {}

  @Cron('*/15 * * * *')
  async tick() {
    const now = new Date();
    const due = await this.prisma.ticket.findMany({
      where: {
        slaDueAt: { lt: now, not: null },
        slaBreached: false,
        status: { in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS'] },
      },
      include: {
        workspace: { select: { id: true, contactPhone: true } },
        unit: { include: { property: { select: { name: true } } } },
      },
    });

    for (const t of due) {
      await this.prisma.ticket.update({
        where: { id: t.id },
        data: { slaBreached: true, meta: { breachedAt: now.toISOString() } },
      });
      if (t.workspace.contactPhone) {
        const body = `⚠️ SLA BREACHED — Ticket ${t.ticketRef} (${t.priority}) at ${t.unit.property?.name ?? 'unknown property'} unit ${t.unit.unitNumber}. Status: ${t.status}.`;
        await this.twilio.sendWhatsApp(t.workspace.contactPhone, body).catch((e) => this.log.error(e));
      }
    }
    if (due.length) this.log.warn(`Marked ${due.length} tickets as SLA breached`);
  }
}
