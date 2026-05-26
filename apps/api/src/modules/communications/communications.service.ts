import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { NotificationChannel, NotificationType, DeliveryStatus } from '@prisma/client';

export interface SendMessageDto {
  channel: 'WHATSAPP' | 'EMAIL' | 'SMS';
  recipient:
    | { type: 'tenant'; id: string }
    | { type: 'owner';  id: string }
    | { type: 'vendor'; id: string }
    | { type: 'phone';  value: string }
    | { type: 'email';  value: string };
  template?: string;          // e.g. "rent-reminder", "lease-renewal"
  subject?: string;           // email only
  message: string;            // body / WhatsApp text
  data?: Record<string, any>; // template variables
  relatedEntity?: { type: 'lease' | 'ticket' | 'unit' | 'property'; id: string };
}

const TEMPLATES: Record<string, { subject?: string; body: (vars: any) => string }> = {
  'rent-reminder': {
    subject: 'Rent reminder — Manara OS',
    body: (v) =>
      `Hi ${v.tenantName ?? 'tenant'}, this is a friendly reminder that AED ${v.amount?.toLocaleString() ?? '—'} rent is due on ${v.dueDate ?? '—'} for ${v.unitNumber ?? 'your unit'}. Please arrange payment to avoid a 1% late fee.`,
  },
  'rent-overdue': {
    subject: '⚠️ Overdue rent — Manara OS',
    body: (v) =>
      `Hi ${v.tenantName ?? 'tenant'}, your rent of AED ${v.amount?.toLocaleString() ?? '—'} is now ${v.daysOverdue ?? '—'} days overdue. Please contact our finance team or pay at your earliest convenience. Continued non-payment may trigger lease termination.`,
  },
  'lease-renewal': {
    subject: 'Lease renewal — Manara OS',
    body: (v) =>
      `Hi ${v.tenantName ?? 'tenant'}, your lease for ${v.unitNumber ?? '—'} expires on ${v.endDate ?? '—'}. We'd love to renew with you. Reply to start the conversation.`,
  },
  'move-in-confirmation': {
    subject: 'Welcome to your new home',
    body: (v) =>
      `Welcome ${v.tenantName ?? 'tenant'}! Your move-in to ${v.unitNumber ?? '—'} is confirmed. Keys will be handed over on ${v.handoverDate ?? '—'}. Reach out to ${v.pmName ?? 'us'} on ${v.pmPhone ?? ''} for any questions.`,
  },
  'pma-renewal': {
    subject: 'PMA renewal due — Manara OS',
    body: (v) =>
      `Dear ${v.ownerName ?? 'owner'}, your Property Management Agreement expires on ${v.expiryDate ?? '—'}. Let's schedule a quick call to discuss renewal terms.`,
  },
  'ticket-update': {
    subject: 'Maintenance update',
    body: (v) =>
      `Update on ticket ${v.ticketRef ?? '—'} (${v.title ?? '—'}): status is now ${v.status ?? '—'}. ${v.note ? `Note: ${v.note}` : ''}`,
  },
};

@Injectable()
export class CommunicationsService {
  private readonly logger = new Logger(CommunicationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── Resolve recipient ────────────────────────────────────────────

  private async resolveRecipient(workspaceId: string, dto: SendMessageDto) {
    const r = dto.recipient;
    if (r.type === 'phone') return { phone: r.value };
    if (r.type === 'email') return { email: r.value };

    if (r.type === 'tenant') {
      const tenant = await this.prisma.tenant.findFirst({
        where: { id: r.id, workspaceId },
        select: { id: true, fullName: true, phone: true, email: true },
      });
      if (!tenant) throw new NotFoundException('Tenant not found');
      return { tenantId: tenant.id, fullName: tenant.fullName, phone: tenant.phone, email: tenant.email };
    }

    if (r.type === 'owner') {
      const owner = await this.prisma.owner.findFirst({
        where: { id: r.id, workspaceId },
        select: { id: true, fullName: true, phone: true, email: true },
      });
      if (!owner) throw new NotFoundException('Owner not found');
      return { ownerId: owner.id, fullName: owner.fullName, phone: owner.phone, email: owner.email };
    }

    if (r.type === 'vendor') {
      const vendor = await this.prisma.vendor.findFirst({
        where: { id: r.id, workspaceId },
        select: { id: true, companyName: true, contactName: true, phone: true, email: true },
      });
      if (!vendor) throw new NotFoundException('Vendor not found');
      return { fullName: vendor.contactName ?? vendor.companyName, phone: vendor.phone, email: vendor.email };
    }

    throw new BadRequestException('Unknown recipient type');
  }

  // ─── Send a message ───────────────────────────────────────────────

  async send(workspaceId: string, userId: string, dto: SendMessageDto) {
    const recipient = await this.resolveRecipient(workspaceId, dto);

    // Validate channel availability
    if (dto.channel === 'EMAIL' && !recipient.email) {
      throw new BadRequestException('Recipient has no email on file');
    }
    if ((dto.channel === 'WHATSAPP' || dto.channel === 'SMS') && !recipient.phone) {
      throw new BadRequestException('Recipient has no phone on file');
    }

    // Render template if specified
    let body = dto.message;
    let subject = dto.subject;
    if (dto.template && TEMPLATES[dto.template]) {
      const tmpl = TEMPLATES[dto.template];
      const vars = {
        tenantName: (recipient as any).fullName,
        ownerName: (recipient as any).fullName,
        ...dto.data,
      };
      body = tmpl.body(vars);
      subject = subject ?? tmpl.subject;
    }

    // Log a Notification row (PENDING → SENT)
    const notification = await this.prisma.notification.create({
      data: {
        workspaceId,
        userId,
        tenantId: (recipient as any).tenantId,
        ownerId: (recipient as any).ownerId,
        type: this.typeFromTemplate(dto.template) ?? NotificationType.RENT_DUE,
        channel: dto.channel as NotificationChannel,
        title: subject ?? `Message via ${dto.channel}`,
        body,
        data: {
          recipient: { phone: (recipient as any).phone, email: (recipient as any).email },
          template: dto.template,
          relatedEntity: dto.relatedEntity,
          ...(dto.data ?? {}),
        },
        deliveryStatus: DeliveryStatus.PENDING,
      },
    });

    // Stubbed dispatch — in dev, log and mark as SENT immediately.
    // In production, this is where Twilio (WhatsApp/SMS) and Resend (email) are called.
    this.logger.log(
      `📨  [${dto.channel}] → ${(recipient as any).phone ?? (recipient as any).email}: ${body.slice(0, 80)}…`,
    );

    const updated = await this.prisma.notification.update({
      where: { id: notification.id },
      data: {
        deliveryStatus: DeliveryStatus.SENT,
        sentAt: new Date(),
        externalId: `dev-${notification.id.slice(0, 8)}`,
      },
    });

    return {
      id: updated.id,
      channel: updated.channel,
      recipient: (recipient as any).phone ?? (recipient as any).email,
      preview: body.slice(0, 140),
      status: updated.deliveryStatus,
      sentAt: updated.sentAt,
    };
  }

  // ─── Bulk send ────────────────────────────────────────────────────

  async sendBulk(
    workspaceId: string,
    userId: string,
    dto: {
      channel: SendMessageDto['channel'];
      template: string;
      recipientIds: string[];
      recipientType: 'tenant' | 'owner' | 'vendor';
      data?: Record<string, any>;
    },
  ) {
    const results = [];
    for (const id of dto.recipientIds) {
      try {
        const res = await this.send(workspaceId, userId, {
          channel: dto.channel,
          recipient: { type: dto.recipientType, id },
          template: dto.template,
          message: '',
          data: dto.data,
        });
        results.push({ id, ok: true, ...res });
      } catch (err: any) {
        results.push({ id, ok: false, error: err.message });
      }
    }
    return {
      total: dto.recipientIds.length,
      sent: results.filter((r) => r.ok).length,
      failed: results.filter((r) => !r.ok).length,
      results,
    };
  }

  // ─── History ──────────────────────────────────────────────────────

  async history(
    workspaceId: string,
    filter?: { tenantId?: string; ownerId?: string; channel?: NotificationChannel; limit?: number },
  ) {
    return this.prisma.notification.findMany({
      where: {
        workspaceId,
        ...(filter?.tenantId && { tenantId: filter.tenantId }),
        ...(filter?.ownerId && { ownerId: filter.ownerId }),
        ...(filter?.channel && { channel: filter.channel }),
      },
      orderBy: { createdAt: 'desc' },
      take: filter?.limit ?? 50,
    });
  }

  // ─── Helpers ──────────────────────────────────────────────────────

  private typeFromTemplate(template?: string): NotificationType | null {
    if (!template) return null;
    if (template.startsWith('rent-')) return NotificationType.RENT_DUE;
    if (template === 'rent-overdue') return NotificationType.RENT_OVERDUE;
    if (template === 'lease-renewal') return NotificationType.LEASE_RENEWAL;
    if (template === 'pma-renewal') return NotificationType.PMA_RENEWAL;
    return null;
  }
}
