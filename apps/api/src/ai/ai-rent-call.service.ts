import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import OpenAI from 'openai';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class AiRentCallService {
  private readonly logger = new Logger(AiRentCallService.name);
  private readonly openai: OpenAI;

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
    @InjectQueue('ai-calls') private aiCallQueue: Queue,
    @InjectQueue('notifications') private notifQueue: Queue,
  ) {
    this.openai = new OpenAI({ apiKey: config.get('OPENAI_API_KEY') });
  }

  async triggerRentFollowUpCall(
    workspaceId: string,
    tenantId: string,
    initiatedBy: string,
  ) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { id: tenantId, workspaceId },
      include: {
        leases: {
          where: { status: 'ACTIVE' },
          include: {
            unit: { include: { property: true } },
            pdcCheques: {
              where: { status: 'PENDING', dueDate: { lte: new Date() } },
              orderBy: { dueDate: 'asc' },
            },
          },
          take: 1,
        },
      },
    });

    if (!tenant) throw new NotFoundException('Tenant not found');
    const activeLease = tenant.leases[0];
    if (!activeLease) throw new NotFoundException('No active lease found for tenant');

    const overdueCheques = activeLease.pdcCheques;
    if (overdueCheques.length === 0) {
      return { message: 'No overdue payments found', tenantId };
    }

    const totalOverdue = overdueCheques.reduce((sum, c) => sum + Number(c.amount), 0);
    const maxDaysOverdue = Math.max(
      ...overdueCheques.map((c) =>
        Math.floor((Date.now() - new Date(c.dueDate).getTime()) / (1000 * 60 * 60 * 24)),
      ),
    );

    // Generate AI script
    const script = await this.generateCallScript({
      tenantName: tenant.fullName,
      propertyName: activeLease.unit.property.name,
      unitNumber: activeLease.unit.unitNumber,
      totalOverdue,
      currencyCode: activeLease.currencyCode,
      daysOverdue: maxDaysOverdue,
      dueDates: overdueCheques.map((c) => c.dueDate.toISOString().split('T')[0]),
    });

    // Create AI call record
    const aiCall = await this.prisma.aiCall.create({
      data: {
        workspaceId,
        tenantId,
        leaseId: activeLease.id,
        toPhone: tenant.phone,
        script,
        initiatedBy,
        overdueDays: maxDaysOverdue,
        overdueAmount: totalOverdue,
      },
    });

    // Queue the actual call
    await this.aiCallQueue.add(
      'make-call',
      {
        aiCallId: aiCall.id,
        tenantPhone: tenant.phone,
        script,
        tenantName: tenant.fullName,
        workspaceId,
      },
      { attempts: 2, backoff: { type: 'fixed', delay: 60000 } },
    );

    this.logger.log(`AI rent call queued for tenant ${tenantId}, overdue: ${totalOverdue} ${activeLease.currencyCode}`);

    return {
      aiCallId: aiCall.id,
      tenantName: tenant.fullName,
      totalOverdue,
      currencyCode: activeLease.currencyCode,
      daysOverdue: maxDaysOverdue,
      script,
    };
  }

  async executeCall(aiCallId: string): Promise<void> {
    const aiCall = await this.prisma.aiCall.findUnique({
      where: { id: aiCallId },
    });
    if (!aiCall) return;

    const isDev = this.config.get('NODE_ENV') !== 'production';

    if (isDev) {
      this.logger.debug(`[DEV] Would call ${aiCall.toPhone} with script: ${aiCall.script.slice(0, 100)}...`);
      await this.prisma.aiCall.update({
        where: { id: aiCallId },
        data: { outcome: 'ANSWERED', endedAt: new Date(), duration: 45 },
      });
      return;
    }

    try {
      const twilio = require('twilio');
      const client = twilio(
        this.config.get('TWILIO_ACCOUNT_SID'),
        this.config.get('TWILIO_AUTH_TOKEN'),
      );

      // Generate TTS audio
      const ttsBuffer = await this.generateTts(aiCall.script);
      const audioUrl = await this.uploadAudio(ttsBuffer, aiCallId, aiCall.workspaceId);

      const call = await client.calls.create({
        to: aiCall.toPhone,
        from: this.config.get('TWILIO_FROM_NUMBER'),
        url: audioUrl,
        statusCallback: `${this.config.get('API_URL')}/api/v1/ai/calls/${aiCallId}/status`,
        statusCallbackMethod: 'POST',
      });

      await this.prisma.aiCall.update({
        where: { id: aiCallId },
        data: {
          callSid: call.sid,
          answeredAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(`Twilio call failed for aiCall ${aiCallId}`, error);
      await this.prisma.aiCall.update({
        where: { id: aiCallId },
        data: { outcome: 'FAILED', endedAt: new Date() },
      });

      // Fall back to WhatsApp
      await this.sendWhatsAppFollowUp(aiCall);
      throw error;
    }
  }

  async sendWhatsAppFollowUp(aiCall: any): Promise<void> {
    if (this.config.get('NODE_ENV') !== 'production') {
      this.logger.debug(`[DEV] Would send WhatsApp to ${aiCall.toPhone}`);
      return;
    }

    try {
      const twilio = require('twilio');
      const client = twilio(
        this.config.get('TWILIO_ACCOUNT_SID'),
        this.config.get('TWILIO_AUTH_TOKEN'),
      );

      const message = this.generateWhatsAppMessage(aiCall);
      await client.messages.create({
        body: message,
        from: this.config.get('TWILIO_WHATSAPP_FROM'),
        to: `whatsapp:${aiCall.toPhone}`,
      });

      this.logger.log(`WhatsApp follow-up sent to ${aiCall.toPhone}`);
    } catch (error) {
      this.logger.error(`WhatsApp fallback failed for ${aiCall.toPhone}`, error);
    }
  }

  private async generateCallScript(context: {
    tenantName: string;
    propertyName: string;
    unitNumber: string;
    totalOverdue: number;
    currencyCode: string;
    daysOverdue: number;
    dueDates: string[];
  }): Promise<string> {
    const { tenantName, propertyName, unitNumber, totalOverdue, currencyCode, daysOverdue } = context;

    // For dev/testing, use template
    if (this.config.get('NODE_ENV') !== 'production') {
      return `Hello ${tenantName}, this is a reminder from Manara OS Property Management. We noticed that your rent payment of ${totalOverdue} ${currencyCode} for unit ${unitNumber} at ${propertyName} is ${daysOverdue} days overdue. Please arrange payment at your earliest convenience. If you have already made this payment, please disregard this message. For assistance, please contact your property manager. Thank you.`;
    }

    const completion = await this.openai.chat.completions.create({
      model: this.config.get('OPENAI_MODEL', 'gpt-4o'),
      messages: [
        {
          role: 'system',
          content: 'You are a professional property management assistant. Generate a polite, professional, and empathetic rent reminder script for an automated phone call. Keep it under 150 words. Be respectful and offer assistance.',
        },
        {
          role: 'user',
          content: `Generate a rent reminder call script for:
- Tenant: ${tenantName}
- Property: ${propertyName}, Unit ${unitNumber}
- Overdue amount: ${totalOverdue} ${currencyCode}
- Days overdue: ${daysOverdue}
- Language: English (professional, UAE context)`,
        },
      ],
      max_tokens: 300,
      temperature: 0.3,
    });

    return completion.choices[0]?.message?.content || this.getFallbackScript(context);
  }

  private async generateTts(script: string): Promise<Buffer> {
    const response = await this.openai.audio.speech.create({
      model: this.config.get('OPENAI_TTS_MODEL', 'tts-1-hd'),
      voice: this.config.get('OPENAI_TTS_VOICE', 'alloy') as any,
      input: script,
      response_format: 'mp3',
    });

    return Buffer.from(await response.arrayBuffer());
  }

  private async uploadAudio(buffer: Buffer, callId: string, workspaceId: string): Promise<string> {
    // Upload to S3 and return public URL
    const { FilesService } = await import('../files/files.service');
    // This would use the files service to upload
    return `${this.config.get('API_URL')}/static/audio/${callId}.mp3`;
  }

  async initiateRentCall(leaseId: string, workspaceId: string) {
    const lease = await this.prisma.lease.findFirst({
      where: { id: leaseId, workspaceId },
      include: { tenant: true },
    });
    if (!lease) throw new NotFoundException('Lease not found');
    return this.triggerRentFollowUpCall(workspaceId, lease.tenantId, 'system');
  }

  async getCallHistory(workspaceId: string, leaseId?: string) {
    return this.prisma.aiCall.findMany({
      where: { workspaceId, ...(leaseId && { leaseId }) },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  private generateWhatsAppMessage(aiCall: any): string {
    return `Dear Tenant, your rent payment of ${aiCall.overdueAmount} is overdue by ${aiCall.overdueDays} days. Please arrange payment immediately or contact your property manager. Reply STOP to unsubscribe.`;
  }

  private getFallbackScript(context: any): string {
    return `Hello ${context.tenantName}, this is a reminder regarding your outstanding rent payment of ${context.totalOverdue} ${context.currencyCode}. Please contact your property manager. Thank you.`;
  }
}
