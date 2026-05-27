import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';

/**
 * Email adapter — SendGrid first, then Postmark, then SMTP, falling back to simulation.
 *
 * Env (any one enables real mode):
 *   SENDGRID_API_KEY + EMAIL_FROM
 *   POSTMARK_SERVER_TOKEN + EMAIL_FROM
 *   SMTP_HOST + SMTP_PORT + SMTP_USER + SMTP_PASS + EMAIL_FROM
 */
@Injectable()
export class EmailService {
  private readonly log = new Logger(EmailService.name);
  private sgClient: any = null;
  private postmark: any = null;
  private smtpTransport: any = null;
  private from: string;
  readonly provider: string;
  readonly simulated: boolean;

  constructor(private config: ConfigService) {
    this.from = config.get<string>('EMAIL_FROM', 'no-reply@manara.app');
    const sgKey = config.get<string>('SENDGRID_API_KEY');
    const pmToken = config.get<string>('POSTMARK_SERVER_TOKEN');
    const smtpHost = config.get<string>('SMTP_HOST');

    if (sgKey) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const sg = require('@sendgrid/mail');
        sg.setApiKey(sgKey);
        this.sgClient = sg;
        this.provider = 'sendgrid';
      } catch (e: any) {
        this.log.warn(`@sendgrid/mail not installed: ${e.message}`);
        this.provider = 'simulation';
      }
    } else if (pmToken) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const pm = require('postmark');
        this.postmark = new pm.ServerClient(pmToken);
        this.provider = 'postmark';
      } catch (e: any) {
        this.log.warn(`postmark not installed: ${e.message}`);
        this.provider = 'simulation';
      }
    } else if (smtpHost) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const nm = require('nodemailer');
        this.smtpTransport = nm.createTransport({
          host: smtpHost,
          port: config.get<number>('SMTP_PORT', 587),
          secure: false,
          auth: { user: config.get('SMTP_USER'), pass: config.get('SMTP_PASS') },
        });
        this.provider = 'smtp';
      } catch (e: any) {
        this.log.warn(`nodemailer not installed: ${e.message}`);
        this.provider = 'simulation';
      }
    } else {
      this.provider = 'simulation';
    }
    this.simulated = this.provider === 'simulation';
    if (this.simulated) this.log.log('Email simulation mode (no provider env set)');
    else this.log.log(`Email provider: ${this.provider}`);
  }

  async send(opts: { to: string; subject: string; html: string; text?: string; attachments?: Array<{ filename: string; content: Buffer; contentType?: string }> }): Promise<{ messageId: string; provider: string; simulated?: boolean }> {
    if (this.simulated) {
      return { messageId: `sim_${randomUUID()}`, provider: 'simulation', simulated: true };
    }
    if (this.sgClient) {
      const result = await this.sgClient.send({
        to: opts.to,
        from: this.from,
        subject: opts.subject,
        html: opts.html,
        text: opts.text,
        attachments: opts.attachments?.map((a) => ({
          content: a.content.toString('base64'),
          filename: a.filename,
          type: a.contentType ?? 'application/octet-stream',
          disposition: 'attachment',
        })),
      });
      return { messageId: result[0]?.headers?.['x-message-id'] ?? 'sg', provider: 'sendgrid' };
    }
    if (this.postmark) {
      const result = await this.postmark.sendEmail({
        From: this.from,
        To: opts.to,
        Subject: opts.subject,
        HtmlBody: opts.html,
        TextBody: opts.text,
      });
      return { messageId: result.MessageID, provider: 'postmark' };
    }
    if (this.smtpTransport) {
      const info = await this.smtpTransport.sendMail({
        from: this.from,
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
        text: opts.text,
        attachments: opts.attachments,
      });
      return { messageId: info.messageId, provider: 'smtp' };
    }
    throw new Error('No email provider available');
  }
}
