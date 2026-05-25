import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);

  constructor(
    private jwtService: JwtService,
    private config: ConfigService,
    private prisma: PrismaService,
  ) {}

  async generateTokenPair(
    payload: JwtPayload,
    userId: string,
    workspaceId?: string,
    ipAddress?: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const accessToken = this.jwtService.sign(payload);

    const refreshTokenValue = uuidv4() + '.' + crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        token: this.hashToken(refreshTokenValue),
        workspaceId,
        expiresAt,
        ipAddress,
      },
    });

    return { accessToken, refreshToken: refreshTokenValue };
  }

  async refresh(
    refreshToken: string,
    ipAddress?: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const hashedToken = this.hashToken(refreshToken);

    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { token: hashedToken },
      include: {
        user: {
          include: {
            workspaceUsers: {
              where: { isActive: true },
              include: { workspace: true },
            },
          },
        },
      },
    });

    if (!storedToken || storedToken.isRevoked || storedToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Revoke old token (token rotation)
    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { isRevoked: true },
    });

    const workspaceUser = storedToken.user.workspaceUsers.find(
      (wu) => wu.workspaceId === storedToken.workspaceId,
    );

    const payload: JwtPayload = {
      sub: storedToken.user.id,
      phone: storedToken.user.phone,
      workspaceId: storedToken.workspaceId,
      role: workspaceUser?.role || 'TENANT' as any,
      countryCode: 'AE',
    };

    return this.generateTokenPair(payload, storedToken.userId, storedToken.workspaceId, ipAddress);
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
