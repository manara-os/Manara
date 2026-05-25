import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { OtpService } from './otp.service';
import { TokenService } from './token.service';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { RegisterPushTokenDto } from './dto/register-push-token.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { UserRole } from '@prisma/client';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private otpService: OtpService,
    private tokenService: TokenService,
    private config: ConfigService,
  ) {}

  async sendOtp(dto: SendOtpDto, ipAddress?: string): Promise<{ message: string; phone: string }> {
    const { phone } = dto;

    // Rate check: max 5 OTPs per phone per 10 minutes
    const recentOtps = await this.prisma.otpCode.count({
      where: {
        phone,
        createdAt: { gte: new Date(Date.now() - 10 * 60 * 1000) },
      },
    });

    if (recentOtps >= 5) {
      throw new BadRequestException('Too many OTP requests. Please wait before trying again.');
    }

    const code = await this.otpService.generate(phone, ipAddress);
    await this.otpService.send(phone, code);

    this.logger.log(`OTP sent to ${phone.slice(0, 7)}***`);
    return { message: 'OTP sent successfully', phone };
  }

  async verifyOtp(
    dto: VerifyOtpDto,
    ipAddress?: string,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    user: any;
    workspaces: any[];
  }> {
    const { phone, code } = dto;

    const isValid = await this.otpService.verify(phone, code);
    if (!isValid) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    // Find or create user
    let user = await this.prisma.user.findUnique({
      where: { phone },
      include: {
        workspaceUsers: {
          include: { workspace: { select: { id: true, name: true, slug: true, status: true, logoUrl: true, countryCode: true, currencyCode: true, subscriptionPlan: true } } },
          where: { isActive: true },
        },
      },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: { phone, phoneVerified: true },
        include: {
          workspaceUsers: {
            include: { workspace: { select: { id: true, name: true, slug: true, status: true, logoUrl: true, countryCode: true, currencyCode: true, subscriptionPlan: true } } },
            where: { isActive: true },
          },
        },
      });
    } else {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });
    }

    const workspaces = user.workspaceUsers.map((wu) => ({
      workspaceId: wu.workspaceId,
      role: wu.role,
      workspace: wu.workspace,
    }));

    // Default to first active workspace
    const primaryWorkspace = workspaces[0];
    const payload: JwtPayload = {
      sub: user.id,
      phone: user.phone,
      workspaceId: primaryWorkspace?.workspaceId || null,
      role: (primaryWorkspace?.role as UserRole) || UserRole.TENANT,
      countryCode: 'AE',
    };

    const { accessToken, refreshToken } = await this.tokenService.generateTokenPair(
      payload,
      user.id,
      primaryWorkspace?.workspaceId,
      ipAddress,
    );

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        phone: user.phone,
        email: user.email,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
      },
      workspaces,
    };
  }

  async refreshToken(
    refreshToken: string,
    ipAddress?: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    return this.tokenService.refresh(refreshToken, ipAddress);
  }

  async logout(userId: string, refreshToken?: string): Promise<void> {
    if (refreshToken) {
      await this.prisma.refreshToken.updateMany({
        where: { token: refreshToken, userId },
        data: { isRevoked: true },
      });
    } else {
      await this.prisma.refreshToken.updateMany({
        where: { userId, isRevoked: false },
        data: { isRevoked: true },
      });
    }
    this.logger.log(`User ${userId} logged out`);
  }

  async registerPushToken(userId: string, dto: RegisterPushTokenDto): Promise<void> {
    const { expoPushToken } = dto.data;

    if (!expoPushToken) {
      throw new BadRequestException('Push token is required');
    }

    // Determine app variant from token prefix
    const platform = expoPushToken.startsWith('ExponentPushToken') ? 'expo' : 'fcm';
    const appVariant = dto.appVariant || 'tenant';

    // Deactivate old tokens for same user+variant (dedup logic)
    await this.prisma.pushToken.updateMany({
      where: { userId, appVariant, isActive: true },
      data: { isActive: false },
    });

    // Upsert new token
    await this.prisma.pushToken.upsert({
      where: {
        userId_token_appVariant: {
          userId,
          token: expoPushToken,
          appVariant,
        },
      },
      update: {
        isActive: true,
        lastSeenAt: new Date(),
        platform,
        appVersion: dto.appVersion,
        deviceId: dto.deviceId,
      },
      create: {
        userId,
        token: expoPushToken,
        platform,
        appVariant,
        isActive: true,
        lastSeenAt: new Date(),
        appVersion: dto.appVersion,
        deviceId: dto.deviceId,
      },
    });

    this.logger.log(`Push token registered for user ${userId} (${appVariant})`);
  }

  async getMe(userId: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        workspaceUsers: {
          include: {
            workspace: {
              select: {
                id: true,
                name: true,
                slug: true,
                logoUrl: true,
                countryCode: true,
                currencyCode: true,
                status: true,
                subscriptionPlan: true,
              },
            },
          },
          where: { isActive: true },
        },
      },
    });

    if (!user) throw new NotFoundException('User not found');
    return user;
  }
}
