import { Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../database/prisma.service';
import { TwilioService } from '../../integrations/twilio.service';

/**
 * NPS dispatcher — every 30 minutes, pick up PENDING NPS rows and send the WhatsApp
 * survey link. Marks them SENT on success.
 */
@Processor('nps-dispatch')
export class NpsDispatchProcessor {
  private readonly log = new Logger(NpsDispatchProcessor.name);

  constructor(private prisma: PrismaService, private twilio: TwilioService) {}

  @Cron('*/30 * * * *')
  async dispatchPending() {
    const batch = await this.prisma.npsResponse.findMany({
      where: { status: 'PENDING' },
      take: 100,
      include: { tenant: { select: { fullName: true } }, workspace: { select: { name: true } } },
    });
    for (const n of batch) {
      if (!n.recipientPhone) continue;
      const body = `Hi ${n.tenant?.fullName?.split(' ')[0] ?? 'there'}! How likely are you to recommend ${n.workspace.name} to a friend or colleague? Reply with a number from 0-10. Optional: add a brief comment after the score.`;
      try {
        await this.twilio.sendWhatsApp(n.recipientPhone, body);
        await this.prisma.npsResponse.update({
          where: { id: n.id },
          data: { status: 'SENT', sentAt: new Date() },
        });
      } catch (e: any) {
        this.log.error(`Failed to send NPS to ${n.recipientPhone}: ${e.message}`);
      }
    }
    if (batch.length) this.log.log(`Dispatched ${batch.length} NPS surveys`);
  }
}
