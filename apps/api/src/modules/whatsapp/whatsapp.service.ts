import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  WhatsAppDirection,
  WhatsAppSender,
  WhatsAppDeliveryStatus,
} from '@prisma/client';
import { TwilioService } from '../../integrations/twilio.service';

@Injectable()
export class WhatsAppService {
  constructor(private prisma: PrismaService, private twilio: TwilioService) {}

  async listThread(workspaceId: string, recipientType: 'tenant' | 'owner' | 'vendor', recipientId: string) {
    const where: any = { workspaceId };
    if (recipientType === 'tenant') where.tenantId = recipientId;
    if (recipientType === 'owner') where.ownerId = recipientId;
    if (recipientType === 'vendor') where.vendorId = recipientId;

    const messages = await this.prisma.whatsAppMessage.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      take: 200,
    });
    return messages;
  }

  async send(
    workspaceId: string,
    dto: {
      recipientType: 'tenant' | 'owner' | 'vendor';
      recipientId: string;
      recipientPhone: string;
      body: string;
      isAiGenerated?: boolean;
      templateName?: string;
    },
  ) {
    // Create local record
    const localFields: any = { workspaceId };
    if (dto.recipientType === 'tenant') localFields.tenantId = dto.recipientId;
    if (dto.recipientType === 'owner') localFields.ownerId = dto.recipientId;
    if (dto.recipientType === 'vendor') localFields.vendorId = dto.recipientId;

    const msg = await this.prisma.whatsAppMessage.create({
      data: {
        ...localFields,
        direction: WhatsAppDirection.OUTBOUND,
        sender: dto.isAiGenerated ? WhatsAppSender.AI : WhatsAppSender.PM,
        recipientPhone: dto.recipientPhone,
        body: dto.body,
        isAiGenerated: dto.isAiGenerated ?? false,
        templateName: dto.templateName,
        deliveryStatus: WhatsAppDeliveryStatus.QUEUED,
      },
    });

    // Send via Twilio (real or simulation)
    try {
      const result = await this.twilio.sendWhatsApp(dto.recipientPhone, dto.body, dto.templateName);
      await this.prisma.whatsAppMessage.update({
        where: { id: msg.id },
        data: {
          twilioSid: result.sid,
          deliveryStatus: WhatsAppDeliveryStatus.SENT,
          sentAt: new Date(),
          meta: { provider: result.provider, simulated: result.simulated ?? false },
        },
      });
    } catch (e: any) {
      await this.prisma.whatsAppMessage.update({
        where: { id: msg.id },
        data: { deliveryStatus: WhatsAppDeliveryStatus.FAILED, errorMessage: e.message },
      });
    }
    return msg;
  }

  async handleInbound(workspaceId: string, payload: { from: string; body: string; twilioSid: string; mediaUrl?: string }) {
    // Match the phone to a tenant/owner/vendor
    const phone = payload.from.replace('whatsapp:', '');
    const [tenant, owner, vendor] = await Promise.all([
      this.prisma.tenant.findFirst({ where: { workspaceId, phone } }),
      this.prisma.owner.findFirst({ where: { workspaceId, phone } }),
      this.prisma.vendor.findFirst({ where: { workspaceId, phone } }),
    ]);
    const linked: any = {};
    let sender: WhatsAppSender = WhatsAppSender.SYSTEM;
    if (tenant) { linked.tenantId = tenant.id; sender = WhatsAppSender.TENANT; }
    else if (owner) { linked.ownerId = owner.id; sender = WhatsAppSender.OWNER; }
    else if (vendor) { linked.vendorId = vendor.id; sender = WhatsAppSender.VENDOR; }

    return this.prisma.whatsAppMessage.create({
      data: {
        workspaceId,
        ...linked,
        direction: WhatsAppDirection.INBOUND,
        sender,
        recipientPhone: phone,
        body: payload.body,
        mediaUrl: payload.mediaUrl,
        twilioSid: payload.twilioSid,
        deliveryStatus: WhatsAppDeliveryStatus.DELIVERED,
        sentAt: new Date(),
        deliveredAt: new Date(),
      },
    });
  }

  async markRead(workspaceId: string, messageId: string) {
    return this.prisma.whatsAppMessage.update({
      where: { id: messageId, workspaceId } as any,
      data: { deliveryStatus: WhatsAppDeliveryStatus.READ, readAt: new Date() },
    });
  }
}
