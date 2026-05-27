import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';

/**
 * Unified payments adapter — picks the configured gateway in priority order.
 *
 * Real mode env:
 *   STRIPE_SECRET_KEY                  (primary, international)
 *   CHECKOUT_SECRET_KEY                (Checkout.com, MEA preferred)
 *   NETWORK_INTERNATIONAL_API_KEY      (NI Online, UAE local)
 *
 * Any one of the above turns off simulation for that provider.
 */
@Injectable()
export class PaymentsService {
  private readonly log = new Logger(PaymentsService.name);
  private stripe: any = null;
  readonly providers: string[] = [];
  readonly simulated: boolean;

  constructor(private config: ConfigService) {
    const stripeKey = config.get<string>('STRIPE_SECRET_KEY');
    const checkoutKey = config.get<string>('CHECKOUT_SECRET_KEY');
    const niKey = config.get<string>('NETWORK_INTERNATIONAL_API_KEY');

    if (stripeKey) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const Stripe = require('stripe');
        this.stripe = new Stripe(stripeKey, { apiVersion: '2024-06-20' });
        this.providers.push('stripe');
      } catch (e: any) {
        this.log.warn(`stripe SDK not installed: ${e.message}`);
      }
    }
    if (checkoutKey) this.providers.push('checkout_com');
    if (niKey) this.providers.push('network_international');

    this.simulated = this.providers.length === 0;
    if (this.simulated) this.log.log('Payments simulation mode — no gateway env vars configured');
    else this.log.log(`Payments configured: ${this.providers.join(', ')}`);
  }

  async createCheckoutSession(opts: {
    amountAed: number;
    description: string;
    metadata?: Record<string, string>;
    successUrl: string;
    cancelUrl: string;
    method?: 'card' | 'apple_pay' | 'google_pay' | 'mada' | 'bank_transfer';
    customerEmail?: string;
  }): Promise<{ sessionId: string; url: string; provider: string; simulated?: boolean }> {
    if (this.simulated) {
      const id = `sim_cs_${randomUUID()}`;
      return {
        sessionId: id,
        url: `${opts.successUrl}?session_id=${id}&simulated=true`,
        provider: 'simulation',
        simulated: true,
      };
    }

    if (this.stripe) {
      const session = await this.stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'aed',
              product_data: { name: opts.description },
              unit_amount: Math.round(opts.amountAed * 100),
            },
            quantity: 1,
          },
        ],
        success_url: opts.successUrl,
        cancel_url: opts.cancelUrl,
        customer_email: opts.customerEmail,
        metadata: opts.metadata,
      });
      return { sessionId: session.id, url: session.url!, provider: 'stripe' };
    }

    throw new Error('No payment gateway available');
  }

  async verifyWebhook(payload: string, signature: string): Promise<{ event: any; provider: string }> {
    if (this.simulated) {
      return { event: JSON.parse(payload), provider: 'simulation' };
    }
    if (this.stripe) {
      const secret = this.config.get<string>('STRIPE_WEBHOOK_SECRET');
      if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET not configured');
      const event = this.stripe.webhooks.constructEvent(payload, signature, secret);
      return { event, provider: 'stripe' };
    }
    throw new Error('No payment gateway available');
  }
}
