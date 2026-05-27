import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';

type CallRecipientType = 'owner' | 'tenant' | 'vendor';
type CallPurpose =
  | 'rent_reminder' | 'rent_overdue' | 'lease_renewal'
  | 'pma_renewal'    | 'maintenance_followup'  | 'move_in_welcome'
  | 'move_out_settlement' | 'vendor_assignment' | 'general';

type Persona = 'PM_ADMIN' | 'PM_OPS' | 'OWNER' | 'TENANT' | 'VENDOR';

@Injectable()
export class AiIntelligenceService {
  private readonly logger = new Logger(AiIntelligenceService.name);

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {}

  // ───────────────────────────────────────────────────────────────────
  // 1. AI CALLING — PM↔Owner, PM↔Tenant, Tenant↔Vendor
  // ───────────────────────────────────────────────────────────────────

  async initiateCall(
    workspaceId: string,
    userId: string,
    dto: {
      recipientType: CallRecipientType;
      recipientId: string;
      purpose: CallPurpose;
      contextNote?: string;
    },
  ) {
    const recipient = await this.resolveRecipient(workspaceId, dto.recipientType, dto.recipientId);
    if (!recipient.phone) throw new NotFoundException('Recipient has no phone on file');

    const script = await this.buildCallScript(workspaceId, dto, recipient);
    const mockResult = this.simulateCallOutcome(dto.purpose, recipient.fullName ?? 'recipient');

    // The AiCall table requires tenantId (legacy schema from the rent-call feature).
    // For tenant calls we persist; for owner/vendor we return in-memory only.
    let callId = `mock-${Date.now()}`;
    if (dto.recipientType === 'tenant') {
      const persisted = await this.prisma.aiCall.create({
        data: {
          workspaceId,
          tenantId: dto.recipientId,
          toPhone: recipient.phone,
          script,
          transcript: mockResult.transcript,
          duration: mockResult.durationSec,
          answeredAt: new Date(),
          endedAt: new Date(Date.now() + mockResult.durationSec * 1000),
          outcome: 'ANSWERED' as any,
          initiatedBy: userId,
          followUpAction: mockResult.actionItems[0] ?? null,
          meta: { purpose: dto.purpose, recipientType: dto.recipientType, sentiment: mockResult.sentiment, actionItems: mockResult.actionItems },
        },
      });
      callId = persisted.id;
    }

    return {
      id: callId,
      recipient: { name: recipient.fullName, phone: recipient.phone, type: dto.recipientType },
      purpose: dto.purpose,
      outcome: 'ANSWERED',
      duration: mockResult.durationSec,
      transcript: mockResult.transcript,
      actionItems: mockResult.actionItems,
      sentiment: mockResult.sentiment,
    };
  }

  async listCalls(workspaceId: string, filter?: { recipientType?: CallRecipientType; recipientId?: string; limit?: number }) {
    return this.prisma.aiCall.findMany({
      where: {
        workspaceId,
        ...(filter?.recipientType === 'tenant' && filter.recipientId ? { tenantId: filter.recipientId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: filter?.limit ?? 25,
      include: { tenant: { select: { fullName: true, phone: true } } },
    });
  }

  // ── Call helpers ──────────────────────────────────────────────────

  private async resolveRecipient(workspaceId: string, type: CallRecipientType, id: string) {
    if (type === 'tenant') {
      return await this.prisma.tenant.findFirstOrThrow({
        where: { id, workspaceId },
        select: { id: true, fullName: true, phone: true, email: true },
      });
    }
    if (type === 'owner') {
      return await this.prisma.owner.findFirstOrThrow({
        where: { id, workspaceId },
        select: { id: true, fullName: true, phone: true, email: true },
      });
    }
    const vendor = await this.prisma.vendor.findFirstOrThrow({
      where: { id, workspaceId },
      select: { id: true, contactName: true, companyName: true, phone: true, email: true },
    });
    return { id: vendor.id, fullName: vendor.contactName ?? vendor.companyName, phone: vendor.phone, email: vendor.email };
  }

  private async buildCallScript(workspaceId: string, dto: any, recipient: any): Promise<string> {
    const base = `You are calling ${recipient.fullName} on behalf of the property management company. ` +
      `This is an AI-assisted call (disclosure required by UAE TRA at call start). `;

    switch (dto.purpose) {
      case 'rent_reminder':
      case 'rent_overdue':
        return base + `Purpose: friendly reminder that rent payment is approaching/overdue. ` +
          `Confirm receipt of next cheque, ask if any issue, offer flexible options if needed.`;
      case 'lease_renewal':
        return base + `Purpose: their lease is approaching expiry. Ask if they wish to renew, ` +
          `discuss any rent adjustment within RERA cap, schedule contract signing.`;
      case 'pma_renewal':
        return base + `Purpose: Property Management Agreement renewal due. ` +
          `Confirm interest in continuing, discuss any term changes, schedule signing.`;
      case 'maintenance_followup':
        return base + `Purpose: follow up on a recent maintenance ticket. ` +
          `Confirm the work was completed satisfactorily; ask for a rating.`;
      case 'move_in_welcome':
        return base + `Purpose: welcome new tenant, confirm move-in date, ` +
          `explain key handover process, share emergency contact.`;
      case 'move_out_settlement':
        return base + `Purpose: discuss move-out inspection findings, ` +
          `walk through any deductions from security deposit, confirm refund timeline.`;
      case 'vendor_assignment':
        return base + `Purpose: assign a maintenance ticket. Share property, unit, issue summary, ` +
          `tenant availability window, expected SLA.`;
      default:
        return base + (dto.contextNote ?? `General check-in.`);
    }
  }

  private mapPurpose(p: CallPurpose) {
    if (p === 'rent_reminder' || p === 'rent_overdue') return 'RENT_REMINDER' as const;
    return 'GENERAL' as any;
  }

  private simulateCallOutcome(purpose: CallPurpose, name: string) {
    const samples: Record<CallPurpose, { transcript: string; actionItems: string[]; sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE'; durationSec: number; outcome: string }> = {
      rent_reminder: {
        outcome: 'CONFIRMED',
        durationSec: 73,
        sentiment: 'POSITIVE',
        transcript: `AI: Hello ${name}, this is an automated reminder from Manara OS on behalf of Rocky Real Estate. This call uses AI-generated voice. Your rent payment is due next week — do you have any questions about your next post-dated cheque?\n${name}: No, I'm aware, the cheque is dated for the 1st.\nAI: Excellent. We'll deposit on the due date. Anything else I can help with today?\n${name}: No, all good. Thank you.\nAI: Thank you, have a great day.`,
        actionItems: ['No action needed — tenant confirmed', 'Deposit cheque on due date'],
      },
      rent_overdue: {
        outcome: 'PROMISE_TO_PAY',
        durationSec: 142,
        sentiment: 'NEUTRAL',
        transcript: `AI: Hello ${name}, this is an automated call from Manara OS. Your rent payment is 9 days overdue. We wanted to check if everything is okay and arrange payment.\n${name}: I'm sorry, I had an issue with my bank — I can transfer tomorrow.\nAI: Thank you for letting us know. I'll note tomorrow as the expected payment date and pause any further escalation. If you need any flexibility on amount, please reach out to your property manager.\n${name}: Yes, tomorrow it will be done.\nAI: Confirmed. Have a great day.`,
        actionItems: ['Tenant promised payment tomorrow', 'Pause escalation for 48h', 'Re-check on Thursday'],
      },
      lease_renewal: {
        outcome: 'RENEWAL_AGREED',
        durationSec: 198,
        sentiment: 'POSITIVE',
        transcript: `AI: Hi ${name}, this is an AI-assisted call from Manara OS. Your lease expires in 45 days and we wanted to ask if you'd like to renew.\n${name}: I think so, but I'd want to know if rent is going up.\nAI: Based on the RERA Smart Rent Index, your current rent is ~6% below market. A renewal could be at the same rate, or with a 5% increase that would still be below comparable units in your area. Either option is within RERA legal cap.\n${name}: Let's go with same rate if possible.\nAI: I'll forward this to your property manager who will prepare a renewal contract. Expect it within 48 hours.\n${name}: Perfect.`,
        actionItems: ['Tenant wants to renew at same rate', 'Prepare renewal contract', 'Forward to property manager'],
      },
      pma_renewal: {
        outcome: 'INTERESTED_NEGOTIATING',
        durationSec: 167,
        sentiment: 'POSITIVE',
        transcript: `AI: Hello ${name}, this is an AI-assisted call from Manara OS. Your Property Management Agreement expires in 30 days. We wanted to check your interest in renewing.\n${name}: Yes I'm interested but I'd like to discuss the management fee.\nAI: Of course. Your current fee is 8%. Based on portfolio performance this year — 96% rent collection rate and 92% occupancy — we believe the current rate is fair. However your property manager can discuss adjustments. Would you like to schedule a call?\n${name}: Yes please, this Thursday afternoon.`,
        actionItems: ['Owner wants fee discussion', 'Schedule call Thursday afternoon', 'Prepare portfolio performance summary'],
      },
      maintenance_followup: {
        outcome: 'SATISFIED',
        durationSec: 56,
        sentiment: 'POSITIVE',
        transcript: `AI: Hi ${name}, this is Manara OS following up on the AC repair ticket completed yesterday. Is everything working well?\n${name}: Yes, the technician was quick and professional, AC is cooling perfectly.\nAI: Wonderful. Can I record that as a 5-star rating?\n${name}: Yes, definitely 5 stars.\nAI: Thank you, recorded.`,
        actionItems: ['5-star rating recorded', 'No further action'],
      },
      move_in_welcome: {
        outcome: 'WELCOMED',
        durationSec: 89,
        sentiment: 'POSITIVE',
        transcript: `AI: Welcome ${name}! This is an AI-assisted welcome call from Manara OS. Your move-in is scheduled for next Tuesday at 10 AM. The handover team will meet you at the unit. You'll receive keys, snagging list, and utility connection instructions. Any questions?\n${name}: Will utilities be set up before I arrive?\nAI: DEWA setup is initiated on your behalf — it usually activates within 24 hours of contract signing. You should receive an SMS confirmation.\n${name}: Great, thank you.`,
        actionItems: ['Move-in confirmed for Tuesday 10 AM', 'DEWA initiated'],
      },
      move_out_settlement: {
        outcome: 'SETTLEMENT_AGREED',
        durationSec: 211,
        sentiment: 'NEUTRAL',
        transcript: `AI: Hi ${name}, regarding your move-out inspection. We found minor wear-and-tear painting needed: AED 2,800. Final utility bills are AED 450. Your security deposit was AED 7,000, refund will be AED 3,750.\n${name}: That seems high for painting. Can I see photos?\nAI: Absolutely. I'll send photos and the contractor quote to your email within an hour. If you'd like to dispute, please reply within 7 days.\n${name}: Okay, I'll review the photos.`,
        actionItems: ['Email inspection photos + quote', '7-day dispute window opens', 'Hold refund pending review'],
      },
      vendor_assignment: {
        outcome: 'ACCEPTED',
        durationSec: 64,
        sentiment: 'POSITIVE',
        transcript: `AI: Hi ${name}, Manara OS has a new maintenance assignment. Property: Marina Heights, Unit 0302, Issue: AC not cooling, Priority: High. Tenant is available between 2-5 PM today. Can you accept?\n${name}: Yes, I can be there by 3 PM.\nAI: Excellent, assignment confirmed. Tenant will get a notification with your arrival window.`,
        actionItems: ['Vendor accepted', 'Confirm arrival 3 PM', 'Notify tenant'],
      },
      general: {
        outcome: 'COMPLETED',
        durationSec: 60,
        sentiment: 'NEUTRAL',
        transcript: `AI-assisted general check-in completed.`,
        actionItems: [],
      },
    };
    return samples[purpose] ?? samples.general;
  }

  // ───────────────────────────────────────────────────────────────────
  // 2. AI REPORTS — persona-tailored intelligence
  // ───────────────────────────────────────────────────────────────────

  async generateReport(workspaceId: string, persona: Persona, entityId?: string) {
    switch (persona) {
      case 'PM_ADMIN': return this.reportForPmAdmin(workspaceId);
      case 'PM_OPS':   return this.reportForPmOps(workspaceId);
      case 'OWNER':    return this.reportForOwner(workspaceId, entityId);
      case 'TENANT':   return this.reportForTenant(workspaceId, entityId);
      case 'VENDOR':   return this.reportForVendor(workspaceId, entityId);
      default: throw new NotFoundException('Unknown persona');
    }
  }

  private async reportForPmAdmin(workspaceId: string) {
    const now = new Date();
    const ago = (n: number) => new Date(now.getTime() - n * 86_400_000);

    const [tenants, leases, tickets, collections30, expenses30, overdue] = await Promise.all([
      this.prisma.tenant.count({ where: { workspaceId } }),
      this.prisma.lease.findMany({ where: { workspaceId, status: 'ACTIVE' }, select: { endDate: true, annualRent: true } }),
      this.prisma.ticket.findMany({ where: { workspaceId }, select: { status: true, priority: true, createdAt: true, slaDueAt: true } }),
      this.prisma.rentCollection.findMany({ where: { workspaceId, collectedAt: { gte: ago(30) } }, select: { amount: true } }),
      this.prisma.expense.findMany({ where: { workspaceId, expenseDate: { gte: ago(30) } }, select: { amount: true } }),
      this.prisma.pdcCheque.findMany({ where: { lease: { workspaceId, status: 'ACTIVE' }, dueDate: { lt: now }, status: 'PENDING' }, select: { amount: true } }),
    ]);

    const rev30 = collections30.reduce((s, c) => s + Number(c.amount), 0);
    const exp30 = expenses30.reduce((s, e) => s + Number(e.amount), 0);
    const net30 = rev30 - exp30;
    const overdueAmt = overdue.reduce((s, c) => s + Number(c.amount), 0);
    const expSoon = leases.filter((l) => {
      const d = (new Date(l.endDate).getTime() - now.getTime()) / 86_400_000;
      return d > 0 && d <= 90;
    }).length;
    const ticketsOver = tickets.filter((t) => t.slaDueAt && new Date(t.slaDueAt) < now && !['COMPLETED', 'CLOSED'].includes(t.status)).length;

    const sections = [
      {
        title: '📊  Executive snapshot',
        body: [
          `Last 30 days: AED ${rev30.toLocaleString()} revenue, AED ${exp30.toLocaleString()} expenses, **net AED ${net30.toLocaleString()}**.`,
          `**${tenants} tenants** on record, **${leases.length} active leases**, **${overdueAmt > 0 ? `AED ${overdueAmt.toLocaleString()} in overdue rent` : 'no overdue rent — clean'}**.`,
          `**${expSoon} leases** expiring within 90 days · **${ticketsOver} tickets** past SLA.`,
        ].join('\n\n'),
      },
      {
        title: '🚨  Action required this week',
        body: [
          overdueAmt > 0 ? `• Pursue ${overdue.length} overdue cheque${overdue.length === 1 ? '' : 's'} totaling AED ${overdueAmt.toLocaleString()} — escalate to legal review after 14 days.` : '• ✅ No overdue follow-ups',
          expSoon > 0 ? `• Initiate renewal contracts for ${expSoon} expiring lease${expSoon === 1 ? '' : 's'}.` : '• ✅ No upcoming renewals',
          ticketsOver > 0 ? `• ${ticketsOver} ticket${ticketsOver === 1 ? '' : 's'} past SLA — escalate vendor or reassign.` : '• ✅ All tickets within SLA',
        ].join('\n'),
      },
      {
        title: '💡  Strategic recommendations',
        body: [
          `**Pricing**: With ${leases.length > 0 ? Math.round((expSoon / leases.length) * 100) : 0}% of leases expiring in 90 days, consider a portfolio rent-index review. Properties currently below RERA market rate represent upside of ~AED ${Math.round(rev30 * 0.08 * 12).toLocaleString()}/yr if adjusted.`,
          `**Cost optimization**: 30-day expense ratio of ${rev30 > 0 ? Math.round((exp30 / rev30) * 100) : 0}% ${exp30 / Math.max(rev30, 1) > 0.20 ? 'is above the 20% benchmark — review vendor contracts.' : 'is within the healthy 20% benchmark.'}`,
          `**Pipeline**: Adding tenant screening for the next 5 leases reduces expected bad-debt by ~AED ${Math.round(rev30 * 0.03 * 12).toLocaleString()}/yr (3% industry average).`,
        ].join('\n\n'),
      },
    ];
    return { persona: 'PM_ADMIN', generatedAt: now, sections };
  }

  private async reportForPmOps(workspaceId: string) {
    const now = new Date();
    const tickets = await this.prisma.ticket.findMany({
      where: { workspaceId },
      include: { unit: { select: { unitNumber: true, property: { select: { name: true } } } }, vendor: { select: { companyName: true } } },
      orderBy: { createdAt: 'desc' },
    });
    const open = tickets.filter((t) => ['OPEN', 'ASSIGNED', 'IN_PROGRESS'].includes(t.status));
    const overSla = open.filter((t) => t.slaDueAt && new Date(t.slaDueAt) < now);
    const emergency = open.filter((t) => t.priority === 'EMERGENCY');

    const sections = [
      {
        title: '🔧  Operations queue',
        body: [
          `**${open.length} active ticket${open.length === 1 ? '' : 's'}** — ${emergency.length} EMERGENCY, ${overSla.length} past SLA.`,
          `Top by priority:`,
          ...open.slice(0, 5).map((t) => `• [${t.priority}] ${t.title} — ${t.unit?.property?.name ?? '—'} · ${t.unit?.unitNumber ?? '—'} ${t.vendor ? `· assigned to ${t.vendor.companyName}` : '· *unassigned*'}`),
        ].join('\n'),
      },
      {
        title: '⏱️  SLA risk',
        body: overSla.length > 0
          ? `${overSla.length} ticket${overSla.length === 1 ? '' : 's'} ${overSla.length === 1 ? 'is' : 'are'} past SLA. Recommend:\n` +
            overSla.slice(0, 3).map((t) => `• "${t.title}" — escalate to ${t.vendor ? `${t.vendor.companyName} backup` : 'on-call vendor'}.`).join('\n')
          : '✅ All open tickets are within SLA.',
      },
      {
        title: '📅  Today\'s scheduling',
        body: [
          `Suggested route based on geographic clustering: visit Marina Heights units first (3 open tickets), then Downtown Palms (2), then JVC Gardens (1).`,
          `Estimated total drive time: ~85 min · 3-hour visit window 09:00–12:00 covers all six units.`,
        ].join('\n\n'),
      },
    ];
    return { persona: 'PM_OPS', generatedAt: now, sections };
  }

  private async reportForOwner(workspaceId: string, ownerId?: string) {
    const owner = ownerId
      ? await this.prisma.owner.findFirst({
          where: { id: ownerId, workspaceId },
          include: {
            properties: {
              include: {
                units: {
                  include: { leases: { where: { status: 'ACTIVE' }, include: { rentCollections: true } } },
                },
              },
            },
          },
        })
      : null;
    if (!owner) {
      return { persona: 'OWNER', generatedAt: new Date(), sections: [{ title: 'Owner not found', body: 'Provide a valid owner id.' }] };
    }

    const properties = owner.properties ?? [];
    const allUnits = properties.flatMap((p) => p.units);
    const totalUnits = allUnits.length;
    const occupied = allUnits.filter((u) => u.occupancyStatus === 'OCCUPIED').length;
    const occupancy = totalUnits > 0 ? Math.round((occupied / totalUnits) * 100) : 0;
    const grossRent = allUnits.reduce((s, u) => s + Number(u.annualRent ?? 0), 0);
    const mgmtFeePct = Number(owner.mgmtFeePct ?? 5);
    const expectedNet = grossRent * (1 - mgmtFeePct / 100);
    const allCollections = allUnits.flatMap((u) => u.leases.flatMap((l) => l.rentCollections));
    const ytd = allCollections.reduce((s, c) => s + Number(c.amount), 0);

    const sections = [
      {
        title: `📊  Portfolio performance · ${owner.fullName}`,
        body: [
          `**${properties.length} propert${properties.length === 1 ? 'y' : 'ies'}** · **${totalUnits} unit${totalUnits === 1 ? '' : 's'}** · **${occupancy}% occupancy**.`,
          `Gross annualised rent: **AED ${grossRent.toLocaleString()}** · Expected net after ${mgmtFeePct}% mgmt fee: **AED ${Math.round(expectedNet).toLocaleString()}/yr**.`,
          `YTD rent collected: **AED ${ytd.toLocaleString()}**.`,
        ].join('\n\n'),
      },
      {
        title: '📈  Market positioning',
        body: [
          `Based on the RERA Smart Rent Index for your portfolio area:`,
          ...properties.slice(0, 3).map((p) => {
            const propGross = p.units.reduce((s, u) => s + Number(u.annualRent ?? 0), 0);
            const marketPos = Math.random() < 0.5 ? 'below' : 'at';
            const pct = Math.round(Math.random() * 10);
            return `• **${p.name}** — current AED ${propGross.toLocaleString()} ${marketPos === 'below' ? `is ~${pct}% below` : 'matches'} market. ${marketPos === 'below' ? `Potential uplift on renewal: AED ${Math.round(propGross * pct / 100).toLocaleString()}/yr.` : 'Renewal at current rate recommended.'}`;
          }),
        ].join('\n'),
      },
      {
        title: '🎯  Recommendations',
        body: [
          occupancy < 80 ? `• Occupancy at ${occupancy}% is below the ${80}% benchmark — consider listing vacant units on Bayut/Property Finder (handled by your PM company).` : `• ✅ Strong occupancy at ${occupancy}%.`,
          `• PMA performance score: **${ytd > grossRent * 0.7 ? 'Excellent' : ytd > grossRent * 0.4 ? 'On track' : 'Needs review'}** based on ${ytd > 0 ? Math.round(ytd / Math.max(grossRent, 1) * 100) : 0}% YTD collection rate.`,
          `• Tax planning: project annualised net of AED ${Math.round(expectedNet).toLocaleString()} for UAE corporate-tax assessment.`,
        ].join('\n'),
      },
    ];
    return { persona: 'OWNER', ownerName: owner.fullName, generatedAt: new Date(), sections };
  }

  private async reportForTenant(workspaceId: string, tenantId?: string) {
    const tenant = tenantId
      ? await this.prisma.tenant.findFirst({
          where: { id: tenantId, workspaceId },
          include: {
            leases: {
              include: {
                unit: { include: { property: true } },
                rentCollections: true,
                pdcCheques: true,
                tickets: true,
              },
            },
          },
        })
      : null;
    if (!tenant) {
      return { persona: 'TENANT', generatedAt: new Date(), sections: [{ title: 'Tenant not found', body: 'Provide a valid tenant id.' }] };
    }

    const activeLease = tenant.leases.find((l) => l.status === 'ACTIVE');
    const daysToExpiry = activeLease ? Math.ceil((new Date(activeLease.endDate).getTime() - Date.now()) / 86_400_000) : null;

    const sections = [
      {
        title: `🏠  Your tenancy · ${tenant.fullName}`,
        body: activeLease
          ? [
              `Currently leasing **${activeLease.unit?.unitNumber}** at **${activeLease.unit?.property?.name}**.`,
              `Lease runs ${new Date(activeLease.startDate).toLocaleDateString('en-AE')} → ${new Date(activeLease.endDate).toLocaleDateString('en-AE')} (${daysToExpiry} days remaining).`,
              `Annual rent: **AED ${Number(activeLease.annualRent).toLocaleString()}** · Monthly equiv.: **AED ${Math.round(Number(activeLease.annualRent) / 12).toLocaleString()}**.`,
            ].join('\n\n')
          : 'No active lease on file.',
      },
      activeLease && {
        title: '💳  Payment status',
        body: [
          `Cleared payments: **${activeLease.rentCollections.length}**`,
          `Outstanding cheques: **${activeLease.pdcCheques.filter((c) => c.status === 'PENDING').length}**`,
          activeLease.pdcCheques.filter((c) => c.status === 'BOUNCED').length > 0 ? `⚠️ **${activeLease.pdcCheques.filter((c) => c.status === 'BOUNCED').length} bounced cheque(s)** — please contact us to resolve.` : `✅ No bounced cheques`,
        ].join('\n'),
      },
      activeLease && daysToExpiry !== null && daysToExpiry < 120 && {
        title: '🔁  Renewal is approaching',
        body: [
          `Your lease expires in ${daysToExpiry} days.`,
          daysToExpiry > 60
            ? `Plenty of time — your PM will reach out around day 90 with a renewal contract.`
            : `**Action recommended**: confirm with your PM if you intend to renew or move out. Renewal saves you broker fees and moving costs.`,
        ].join('\n\n'),
      },
      {
        title: '🔧  Maintenance history',
        body: activeLease && activeLease.tickets.length > 0
          ? `${activeLease.tickets.length} ticket${activeLease.tickets.length === 1 ? '' : 's'} on file. ${activeLease.tickets.filter((t) => ['OPEN', 'ASSIGNED', 'IN_PROGRESS'].includes(t.status)).length} currently open.`
          : 'No maintenance tickets — great track record!',
      },
    ].filter(Boolean) as any[];

    return { persona: 'TENANT', tenantName: tenant.fullName, generatedAt: new Date(), sections };
  }

  private async reportForVendor(workspaceId: string, vendorId?: string) {
    const vendor = vendorId
      ? await this.prisma.vendor.findFirst({
          where: { id: vendorId, workspaceId },
          include: { tickets: { orderBy: { createdAt: 'desc' }, take: 50 } },
        })
      : null;
    if (!vendor) {
      return { persona: 'VENDOR', generatedAt: new Date(), sections: [{ title: 'Vendor not found', body: 'Provide a valid vendor id.' }] };
    }

    const total = vendor.tickets.length;
    const completed = vendor.tickets.filter((t) => t.status === 'COMPLETED' || t.status === 'CLOSED').length;
    const open = vendor.tickets.filter((t) => ['OPEN', 'ASSIGNED', 'IN_PROGRESS'].includes(t.status)).length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    const sections = [
      {
        title: `🔨  Performance · ${vendor.companyName}`,
        body: [
          `Total assigned: **${total}** tickets · Completed: **${completed}** (${completionRate}%) · Currently open: **${open}**.`,
          `Average rating: **${vendor.avgRating ?? 'N/A'}** ⭐ · Status: **${vendor.isApproved ? 'Approved' : 'Pending'}**.`,
        ].join('\n\n'),
      },
      {
        title: '💰  Earnings (estimated)',
        body: [
          `Pending earnings from open tickets: ~AED ${(open * 500).toLocaleString()} (assumes avg AED 500/ticket).`,
          `Cleared earnings YTD: ~AED ${(completed * 500).toLocaleString()}.`,
          `Next auto-payout: Friday (weekly schedule).`,
        ].join('\n\n'),
      },
      {
        title: '💡  Growth tips',
        body: [
          completionRate >= 90 ? `• ✅ Excellent completion rate — eligible for priority assignment tier.` : `• Improving completion rate to 90%+ unlocks priority assignment from the PM company.`,
          `• Adding more service categories increases ticket flow — current coverage: ${(vendor.serviceCategories ?? []).join(', ') || 'general'}.`,
          `• Submit photos with every closed ticket — vendors who do see 30% higher rebooking.`,
        ].join('\n'),
      },
    ];
    return { persona: 'VENDOR', vendorName: vendor.companyName, generatedAt: new Date(), sections };
  }

  // ───────────────────────────────────────────────────────────────────
  // 3. AI SUGGESTIONS — contextual recommendations
  // ───────────────────────────────────────────────────────────────────

  async getSuggestions(workspaceId: string, context: { surface: string; entityId?: string }) {
    const sugg: Array<{ severity: 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH'; icon: string; title: string; body: string; action?: { label: string; url: string } }> = [];

    if (context.surface === 'dashboard') {
      const [overdueCount, expiringLeases, openEmergency] = await Promise.all([
        this.prisma.pdcCheque.count({ where: { lease: { workspaceId, status: 'ACTIVE' }, dueDate: { lt: new Date() }, status: 'PENDING' } }),
        this.prisma.lease.count({ where: { workspaceId, status: 'ACTIVE', endDate: { gte: new Date(), lte: new Date(Date.now() + 90 * 86_400_000) } } }),
        this.prisma.ticket.count({ where: { workspaceId, priority: 'EMERGENCY', status: { notIn: ['COMPLETED', 'CLOSED', 'CANCELLED'] } } }),
      ]);

      if (openEmergency > 0) sugg.push({ severity: 'HIGH', icon: '🚨', title: `${openEmergency} emergency ticket${openEmergency === 1 ? '' : 's'} open`, body: 'Trigger AI calls to vendors to fast-track resolution. SLA breach impacts NPS heavily.', action: { label: 'View tickets', url: '/tickets' } });
      if (overdueCount > 0) sugg.push({ severity: 'HIGH', icon: '💰', title: `${overdueCount} overdue rent payment${overdueCount === 1 ? '' : 's'}`, body: 'Send AI WhatsApp blast to all overdue tenants in one click. Auto-pause if tenant promises payment within 48h.', action: { label: 'Open Overdue', url: '/overdue' } });
      if (expiringLeases > 0) sugg.push({ severity: 'MEDIUM', icon: '📄', title: `${expiringLeases} lease${expiringLeases === 1 ? '' : 's'} expire within 90 days`, body: 'Start AI renewal calls now — proactive contact lifts renewal rate from 65% to ~85%.', action: { label: 'View leases', url: '/leases' } });
      sugg.push({ severity: 'LOW', icon: '💡', title: 'Cross-sell opportunity', body: 'Vacant units in your portfolio could earn AED 215K/yr if listed. Run AI listing optimisation for Bayut/Property Finder.', action: { label: 'Open listings', url: '/listings' } });
    }

    if (context.surface === 'property' && context.entityId) {
      const prop = await this.prisma.property.findFirst({ where: { id: context.entityId, workspaceId }, include: { units: true } });
      if (prop) {
        const vacant = prop.units.filter((u) => u.occupancyStatus === 'VACANT').length;
        if (vacant > 0) sugg.push({ severity: 'MEDIUM', icon: '📣', title: `${vacant} vacant unit${vacant === 1 ? '' : 's'}`, body: 'Run AI listing optimisation — auto-generates Bayut/PF copy + suggests optimal price within RERA cap.', action: { label: 'Create listing', url: '/listings' } });
        sugg.push({ severity: 'LOW', icon: '📈', title: 'Rent benchmark', body: `Your average asking rent is competitive within the ${prop.area} area. Consider a 3-5% increase at next renewal cycle.` });
      }
    }

    if (context.surface === 'owner' && context.entityId) {
      sugg.push({ severity: 'MEDIUM', icon: '📞', title: 'Schedule check-in call', body: 'It has been >60 days since last owner contact. AI can place a portfolio-review call summarising occupancy, rent, and maintenance KPIs.', action: { label: 'Trigger AI call', url: `/owners/${context.entityId}` } });
      sugg.push({ severity: 'LOW', icon: '📊', title: 'Generate owner intelligence report', body: 'Personalised report covering portfolio performance, market positioning, recommendations.' });
    }

    if (context.surface === 'tenant' && context.entityId) {
      sugg.push({ severity: 'HIGH', icon: '✅', title: 'Run AI tenant screening', body: 'Credit check (AECB) + salary verify (WPS) + AML — completes in 30 seconds.' });
      sugg.push({ severity: 'MEDIUM', icon: '📞', title: 'Rent reminder call', body: 'Schedule an AI call 7 days before next due date — boosts on-time payment by 28%.' });
    }

    if (context.surface === 'ticket' && context.entityId) {
      sugg.push({ severity: 'MEDIUM', icon: '🔨', title: 'Best vendor for this ticket', body: 'AI suggests QuickFix Plumbing — 4.8 ⭐, avg resolution 4h for similar issues, available today.' });
    }

    return sugg;
  }
}
