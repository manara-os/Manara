import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { Expo, ExpoPushMessage, ExpoPushSuccessTicket } from 'expo-server-sdk';
import * as admin from 'firebase-admin';

export interface SendPushOptions {
  userId?: string;
  tenantId?: string;
  ownerId?: string;
  vendorId?: string;
  workspaceId: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  sound?: string;
  badge?: number;
  appVariant?: 'owner' | 'tenant' | 'vendor' | string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly expo: Expo;
  private firebaseApp?: admin.app.App;

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {
    this.expo = new Expo({
      accessToken: config.get('EXPO_ACCESS_TOKEN'),
      useFcmV1: true,
    });

    // Initialize Firebase Admin
    const projectId = config.get('FIREBASE_PROJECT_ID');
    if (projectId) {
      this.firebaseApp = admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          privateKey: config.get('FIREBASE_PRIVATE_KEY')?.replace(/\\n/g, '\n'),
          clientEmail: config.get('FIREBASE_CLIENT_EMAIL'),
        }),
      });
    }
  }

  async sendPushToUser(options: SendPushOptions): Promise<void> {
    const { userId, appVariant, workspaceId, type, title, body, data, sound } = options;

    if (!userId) return;

    // Get active push tokens
    const tokens = await this.prisma.pushToken.findMany({
      where: {
        userId,
        isActive: true,
        ...(appVariant && { appVariant }),
      },
    });

    if (tokens.length === 0) {
      this.logger.debug(`No push tokens for user ${userId}`);
      return;
    }

    // Create notification record
    await this.prisma.notification.create({
      data: {
        workspaceId,
        userId,
        tenantId: options.tenantId,
        ownerId: options.ownerId,
        type: type as any,
        channel: 'PUSH',
        title,
        body,
        data: data || {},
      },
    });

    // Split tokens by platform
    const expoTokens = tokens.filter((t) => Expo.isExpoPushToken(t.token));
    const fcmTokens = tokens.filter((t) => !Expo.isExpoPushToken(t.token));

    // Send via Expo
    if (expoTokens.length > 0) {
      await this.sendExpoNotifications(
        expoTokens.map((t) => t.token),
        { title, body, data, sound },
      );
    }

    // Send via Firebase FCM (tenant app)
    if (fcmTokens.length > 0 && this.firebaseApp) {
      await this.sendFcmNotifications(
        fcmTokens.map((t) => t.token),
        { title, body, data },
      );
    }
  }

  async sendPushToWorkspace(
    workspaceId: string,
    roles: string[],
    notification: Omit<SendPushOptions, 'workspaceId'>,
  ): Promise<void> {
    // Get all active workspace users with specified roles
    const workspaceUsers = await this.prisma.workspaceUser.findMany({
      where: { workspaceId, isActive: true, role: { in: roles as any[] } },
      select: { userId: true },
    });

    await Promise.allSettled(
      workspaceUsers.map((wu) =>
        this.sendPushToUser({ ...notification, userId: wu.userId, workspaceId }),
      ),
    );
  }

  async sendEmail(to: string, subject: string, htmlBody: string): Promise<void> {
    const isDev = this.config.get('NODE_ENV') !== 'production';

    if (isDev) {
      this.logger.debug(`[DEV] Email to ${to}: ${subject}`);
      return;
    }

    try {
      const { SESClient, SendEmailCommand } = await import('@aws-sdk/client-ses');
      const ses = new SESClient({ region: this.config.get('AWS_SES_REGION', 'me-central-1') });

      await ses.send(
        new SendEmailCommand({
          Source: `${this.config.get('EMAIL_FROM_NAME')} <${this.config.get('EMAIL_FROM')}>`,
          Destination: { ToAddresses: [to] },
          Message: {
            Subject: { Data: subject },
            Body: { Html: { Data: htmlBody } },
          },
        }),
      );
    } catch (error) {
      this.logger.error(`Email failed to ${to}`, error);
    }
  }

  async markAsRead(userId: string, notificationId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { readAt: new Date() },
    });
  }

  async getUserNotifications(userId: string, workspaceId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [total, notifications] = await Promise.all([
      this.prisma.notification.count({ where: { userId, workspaceId } }),
      this.prisma.notification.findMany({
        where: { userId, workspaceId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const unreadCount = await this.prisma.notification.count({
      where: { userId, workspaceId, readAt: null },
    });

    return { data: notifications, meta: { total, page, limit, unreadCount } };
  }

  private async sendExpoNotifications(tokens: string[], message: Partial<ExpoPushMessage>): Promise<void> {
    const messages: ExpoPushMessage[] = tokens.map((token) => ({
      to: token,
      title: message.title,
      body: message.body,
      data: message.data || {},
      sound: (message.sound as any) || 'default',
      badge: message.badge,
      channelId: 'default',
    }));

    const chunks = this.expo.chunkPushNotifications(messages);

    for (const chunk of chunks) {
      try {
        const tickets = await this.expo.sendPushNotificationsAsync(chunk);

        // Handle invalid tokens
        for (let i = 0; i < tickets.length; i++) {
          const ticket = tickets[i];
          if (ticket.status === 'error') {
            if (ticket.details?.error === 'DeviceNotRegistered') {
              // Deactivate invalid token
              await this.prisma.pushToken.updateMany({
                where: { token: tokens[i] },
                data: { isActive: false },
              });
            }
          }
        }
      } catch (error) {
        this.logger.error('Expo push notification failed', error);
      }
    }
  }

  async getForUser(userId: string, workspaceId: string, opts?: { unreadOnly?: boolean; page?: number }) {
    const page = opts?.page ?? 1;
    const limit = 20;
    const skip = (page - 1) * limit;
    const where = { userId, workspaceId, ...(opts?.unreadOnly && { readAt: null }) };

    const [total, data] = await Promise.all([
      this.prisma.notification.count({ where }),
      this.prisma.notification.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
    ]);

    return { data, meta: { total, page, limit, hasMore: total > page * limit } };
  }

  async markRead(notificationId: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { readAt: new Date() },
    });
  }

  async markAllRead(userId: string, workspaceId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, workspaceId, readAt: null },
      data: { readAt: new Date() },
    });
  }

  async getUnreadCount(userId: string, workspaceId: string) {
    const count = await this.prisma.notification.count({
      where: { userId, workspaceId, readAt: null },
    });
    return { count };
  }

  private async sendFcmNotifications(tokens: string[], message: any): Promise<void> {
    if (!this.firebaseApp) return;

    const messaging = admin.messaging(this.firebaseApp);

    for (const token of tokens) {
      try {
        await messaging.send({
          token,
          notification: { title: message.title, body: message.body },
          data: message.data ? Object.fromEntries(
            Object.entries(message.data).map(([k, v]) => [k, String(v)])
          ) : {},
          android: { priority: 'high', notification: { channelId: 'default' } },
          apns: { payload: { aps: { sound: 'default', badge: 1 } } },
        });
      } catch (error: any) {
        if (error.code === 'messaging/registration-token-not-registered') {
          await this.prisma.pushToken.updateMany({
            where: { token },
            data: { isActive: false },
          });
        }
        this.logger.error(`FCM failed for token ${token.slice(0, 20)}...`, error.message);
      }
    }
  }
}
