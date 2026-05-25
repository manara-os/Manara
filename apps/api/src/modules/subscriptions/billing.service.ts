import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import Stripe from 'stripe';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private readonly stripe: Stripe;

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {
    this.stripe = new Stripe(config.get('STRIPE_SECRET_KEY', ''), {
      apiVersion: '2024-11-20.acacia',
    });
  }

  async createCheckoutSession(workspaceId: string, plan: 'PRO' | 'ENTERPRISE', successUrl: string, cancelUrl: string) {
    const workspace = await this.prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) throw new NotFoundException('Workspace not found');

    const priceId = plan === 'PRO'
      ? this.config.get('STRIPE_PRO_PRICE_ID')
      : this.config.get('STRIPE_ENTERPRISE_PRICE_ID');

    if (!priceId) throw new BadRequestException('Plan not configured');

    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: { workspaceId, plan },
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: workspaceId,
    });

    return { url: session.url, sessionId: session.id };
  }

  async createPortalSession(workspaceId: string, returnUrl: string) {
    const workspace = await this.prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace || !workspace.stripeCustomerId) {
      throw new NotFoundException('No Stripe customer found for this workspace');
    }

    const session = await this.stripe.billingPortal.sessions.create({
      customer: workspace.stripeCustomerId,
      return_url: returnUrl,
    });

    return { url: session.url };
  }

  async handleWebhook(payload: Buffer, signature: string) {
    const webhookSecret = this.config.get('STRIPE_WEBHOOK_SECRET');
    if (!webhookSecret) return;

    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (err) {
      this.logger.error('Stripe webhook signature verification failed', err);
      throw new BadRequestException('Invalid webhook signature');
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.CheckoutSession;
        await this.handleSubscriptionCreated(session);
        break;
      }
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        await this.handleSubscriptionUpdated(sub);
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        await this.handleSubscriptionCancelled(sub);
        break;
      }
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        await this.recordInvoicePaid(invoice);
        break;
      }
    }
  }

  async getSubscription(workspaceId: string) {
    const workspace = await this.prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) throw new NotFoundException('Workspace not found');

    const invoices = await this.prisma.subscriptionInvoice.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      take: 12,
    });

    return {
      plan: workspace.subscriptionPlan,
      status: workspace.status,
      stripeCustomerId: workspace.stripeCustomerId,
      invoices,
    };
  }

  private async handleSubscriptionCreated(session: Stripe.CheckoutSession) {
    const { workspaceId, plan } = session.metadata ?? {};
    if (!workspaceId) return;

    await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        subscriptionPlan: plan ?? 'PRO',
        stripeCustomerId: session.customer as string,
        stripeSubscriptionId: session.subscription as string,
      },
    });
    this.logger.log(`Workspace ${workspaceId} subscribed to ${plan}`);
  }

  private async handleSubscriptionUpdated(sub: Stripe.Subscription) {
    const workspace = await this.prisma.workspace.findFirst({
      where: { stripeSubscriptionId: sub.id },
    });
    if (!workspace) return;

    const plan = sub.items.data[0]?.price.metadata?.plan ?? workspace.subscriptionPlan;
    await this.prisma.workspace.update({
      where: { id: workspace.id },
      data: { subscriptionPlan: plan },
    });
  }

  private async handleSubscriptionCancelled(sub: Stripe.Subscription) {
    const workspace = await this.prisma.workspace.findFirst({
      where: { stripeSubscriptionId: sub.id },
    });
    if (!workspace) return;

    await this.prisma.workspace.update({
      where: { id: workspace.id },
      data: { subscriptionPlan: 'STARTER' },
    });
  }

  private async recordInvoicePaid(invoice: Stripe.Invoice) {
    const workspace = await this.prisma.workspace.findFirst({
      where: { stripeCustomerId: invoice.customer as string },
    });
    if (!workspace) return;

    await this.prisma.subscriptionInvoice.create({
      data: {
        workspaceId: workspace.id,
        stripeInvoiceId: invoice.id,
        amount: invoice.amount_paid / 100,
        currencyCode: invoice.currency.toUpperCase(),
        status: 'PAID',
        paidAt: new Date(invoice.status_transitions.paid_at! * 1000),
        invoiceUrl: invoice.hosted_invoice_url,
        periodStart: new Date(invoice.period_start * 1000),
        periodEnd: new Date(invoice.period_end * 1000),
      },
    });
  }
}
