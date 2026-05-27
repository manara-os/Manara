import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';

/**
 * Twilio service — real SDK when credentials configured, deterministic simulation otherwise.
 * In simulation mode, all calls succeed with synthetic `sid` so demos behave like production.
 *
 * Required env to enable real mode:
 *   TWILIO_ACCOUNT_SID
 *   TWILIO_AUTH_TOKEN
 *   TWILIO_WHATSAPP_FROM   (e.g. "whatsapp:+14155238886")
 *   TWILIO_SMS_FROM        (optional, for SMS)
 */
@Injectable()
export class TwilioService {
  private readonly log = new Logger(TwilioService.name);
  private client: any;
  private from: string | null = null;
  private smsFrom: string | null = null;
  readonly simulated: boolean;

  constructor(private config: ConfigService) {
    const sid = config.get<string>('TWILIO_ACCOUNT_SID');
    const token = config.get<string>('TWILIO_AUTH_TOKEN');
    const from = config.get<string>('TWILIO_WHATSAPP_FROM');
    this.simulated = !sid || !token || !from;

    if (!this.simulated) {
      try {
        // dynamic require so SDK is optional in dev
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const twilio = require('twilio');
        this.client = twilio(sid, token);
        this.from = from!;
        this.smsFrom = config.get<string>('TWILIO_SMS_FROM') ?? null;
        this.log.log('Twilio configured · real mode');
      } catch (e: any) {
        this.log.warn(`twilio SDK not installed (${e.message}) — falling back to simulation`);
        (this as any).simulated = true;
      }
    } else {
      this.log.log('Twilio simulation mode (no TWILIO_* env vars set)');
    }
  }

  async sendWhatsApp(toPhone: string, body: string, templateName?: string): Promise<{ sid: string; provider: string; simulated?: boolean }> {
    const to = toPhone.startsWith('whatsapp:') ? toPhone : `whatsapp:${toPhone}`;

    if (this.simulated || !this.client) {
      return { sid: `SM${randomUUID().replace(/-/g, '').slice(0, 32)}`, provider: 'twilio', simulated: true };
    }

    try {
      const msg = await this.client.messages.create({
        from: this.from!,
        to,
        body,
        ...(templateName && { contentSid: templateName }),
      });
      return { sid: msg.sid, provider: 'twilio' };
    } catch (e: any) {
      this.log.error(`Twilio sendWhatsApp failed: ${e.message}`);
      throw e;
    }
  }

  async sendSms(toPhone: string, body: string): Promise<{ sid: string; simulated?: boolean }> {
    if (this.simulated || !this.smsFrom || !this.client) {
      return { sid: `SM${randomUUID().replace(/-/g, '').slice(0, 32)}`, simulated: true };
    }
    const msg = await this.client.messages.create({ from: this.smsFrom, to: toPhone, body });
    return { sid: msg.sid };
  }
}
