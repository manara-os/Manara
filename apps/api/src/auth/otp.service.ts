import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { createClient } from 'redis';
import * as crypto from 'crypto';

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  private readonly OTP_PREFIX = 'otp:';

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {}

  async generate(phone: string, ipAddress?: string): Promise<string> {
    const isDev = this.config.get('NODE_ENV') !== 'production';
    const code = isDev ? this.config.get('OTP_DEV_BYPASS', '123456') : this.generateSecureCode();
    const ttl = this.config.get('OTP_TTL_SECONDS', 300);

    // Invalidate previous OTPs for this phone
    await this.prisma.otpCode.updateMany({
      where: { phone, isUsed: false },
      data: { isUsed: true },
    });

    await this.prisma.otpCode.create({
      data: {
        phone,
        code: this.hashCode(code),
        expiresAt: new Date(Date.now() + ttl * 1000),
        ipAddress,
      },
    });

    if (isDev) this.logger.debug(`OTP for ${phone}: ${code}`);

    return code;
  }

  async verify(phone: string, code: string): Promise<boolean> {
    const otp = await this.prisma.otpCode.findFirst({
      where: {
        phone,
        isUsed: false,
        expiresAt: { gt: new Date() },
        attempts: { lt: 5 },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otp) return false;

    // Increment attempts
    await this.prisma.otpCode.update({
      where: { id: otp.id },
      data: { attempts: { increment: 1 } },
    });

    const isValid = otp.code === this.hashCode(code);

    if (isValid) {
      await this.prisma.otpCode.update({
        where: { id: otp.id },
        data: { isUsed: true },
      });
    }

    return isValid;
  }

  async send(phone: string, code: string): Promise<void> {
    const isDev = this.config.get('NODE_ENV') !== 'production';

    if (isDev) {
      this.logger.debug(`[DEV] SMS to ${phone}: Your Manara OS OTP is ${code}`);
      return;
    }

    // Production: use Twilio
    try {
      const twilio = require('twilio');
      const client = twilio(
        this.config.get('TWILIO_ACCOUNT_SID'),
        this.config.get('TWILIO_AUTH_TOKEN'),
      );

      await client.messages.create({
        body: `Your Manara OS verification code is: ${code}. Valid for 5 minutes. Do not share this code.`,
        from: this.config.get('TWILIO_FROM_NUMBER'),
        to: phone,
      });
    } catch (error) {
      this.logger.error(`Failed to send OTP SMS to ${phone}`, error);
      throw error;
    }
  }

  private generateSecureCode(): string {
    return String(crypto.randomInt(100000, 999999)).padStart(6, '0');
  }

  private hashCode(code: string): string {
    return crypto.createHash('sha256').update(code).digest('hex');
  }
}
