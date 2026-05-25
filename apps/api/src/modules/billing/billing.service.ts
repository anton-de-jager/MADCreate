import { BadRequestException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '../../prisma/prisma.service';
import { BillingInterval, SubscriptionStatus } from '@prisma/client';

@Injectable()
export class BillingService implements OnModuleInit {
  private readonly logger = new Logger(BillingService.name);
  private stripe?: Stripe;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit(): void {
    const key = this.config.get<string>('stripe.secretKey');
    if (!key) {
      this.logger.warn('STRIPE_SECRET_KEY not set — billing returns a stub until configured.');
      return;
    }
    this.stripe = new Stripe(key);
    this.logger.log('Stripe client ready');
  }

  publicPlans() {
    return this.prisma.plan.findMany({
      where: { deletedAt: null, isPublic: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async subscription(workspaceId: string) {
    return this.prisma.subscription.findUnique({
      where: { workspaceId },
      include: { plan: true },
    });
  }

  /**
   * Create a Stripe Checkout session for a workspace + plan + interval.
   * Returns { checkoutUrl } the client redirects to. Stripe handles the rest;
   * handleWebhook() syncs back into our Subscription table.
   */
  async startCheckout(workspaceId: string, planCode: string, interval: BillingInterval = 'MONTHLY') {
    if (!this.stripe) {
      return {
        checkoutUrl: null,
        message: 'Stripe not configured. Set STRIPE_SECRET_KEY to enable real checkout.',
        planCode, workspaceId,
      };
    }

    const ws = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { id: true, name: true, billingEmail: true },
    });
    if (!ws) throw new NotFoundException('Workspace not found');

    const plan = await this.prisma.plan.findUnique({ where: { code: planCode } });
    if (!plan) throw new NotFoundException('Plan not found');

    const amount = Math.round(Number(interval === 'ANNUAL' ? plan.priceAnnualUsd : plan.priceMonthlyUsd) * 100);
    if (amount <= 0) throw new BadRequestException('This plan is not chargeable via Stripe.');

    const appUrl = this.config.get<string>('web.url') ?? 'http://localhost:4200';
    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: ws.billingEmail ?? undefined,
      success_url: `${appUrl}/app/settings?checkout=success`,
      cancel_url: `${appUrl}/pricing?checkout=cancel`,
      client_reference_id: ws.id,
      metadata: { workspaceId: ws.id, planCode, interval },
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: amount,
            recurring: { interval: interval === 'ANNUAL' ? 'year' : 'month' },
            product_data: { name: `MADCreate ${plan.name}`, description: plan.description ?? undefined },
          },
          quantity: 1,
        },
      ],
    });
    return { checkoutUrl: session.url, sessionId: session.id };
  }

  /**
   * Verifies and processes a Stripe webhook event.
   * Caller (controller) provides the raw body + signature header.
   */
  async handleWebhook(rawBody: Buffer, signature: string): Promise<{ received: true; type?: string }> {
    if (!this.stripe) return { received: true };
    const secret = this.config.get<string>('stripe.webhookSecret');
    if (!secret) {
      this.logger.warn('Stripe webhook hit but STRIPE_WEBHOOK_SECRET not set — ignoring.');
      return { received: true };
    }

    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, secret);
    } catch (err) {
      throw new BadRequestException(`Stripe webhook signature failed: ${(err as Error).message}`);
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        await this.upsertSubscriptionFromSession(event.data.object as Stripe.Checkout.Session);
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        await this.syncSubscription(event.data.object as Stripe.Subscription);
        break;
      }
      default:
        this.logger.debug(`Unhandled Stripe event: ${event.type}`);
    }
    return { received: true, type: event.type };
  }

  /**
   * Create a Stripe billing portal session so the customer can manage their
   * subscription, update payment methods, or cancel.
   */
  async createPortalSession(workspaceId: string): Promise<{ portalUrl: string | null }> {
    if (!this.stripe) {
      return { portalUrl: null };
    }

    const sub = await this.prisma.subscription.findUnique({
      where: { workspaceId },
      select: { externalCustomerId: true },
    });
    if (!sub?.externalCustomerId) {
      throw new NotFoundException('No active subscription found for this workspace');
    }

    const appUrl = this.config.get<string>('web.url') ?? 'http://localhost:4200';
    const session = await this.stripe.billingPortal.sessions.create({
      customer: sub.externalCustomerId,
      return_url: `${appUrl}/app/settings`,
    });

    return { portalUrl: session.url };
  }

  private async upsertSubscriptionFromSession(session: Stripe.Checkout.Session) {
    if (!this.stripe) return;
    const workspaceId = session.metadata?.workspaceId || session.client_reference_id;
    const planCode = session.metadata?.planCode;
    const interval = (session.metadata?.interval as BillingInterval) ?? 'MONTHLY';
    if (!workspaceId || !planCode || !session.subscription) return;

    const plan = await this.prisma.plan.findUnique({ where: { code: planCode } });
    if (!plan) return;

    const stripeSub = await this.stripe.subscriptions.retrieve(session.subscription as string);
    await this.prisma.subscription.upsert({
      where: { workspaceId },
      update: {
        planId: plan.id,
        interval,
        status: this.mapStatus(stripeSub.status),
        externalCustomerId: stripeSub.customer as string,
        externalSubscriptionId: stripeSub.id,
        currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
        currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
      },
      create: {
        workspaceId,
        planId: plan.id,
        interval,
        status: this.mapStatus(stripeSub.status),
        externalCustomerId: stripeSub.customer as string,
        externalSubscriptionId: stripeSub.id,
        currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
        currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
      },
    });
    await this.prisma.workspace.update({ where: { id: workspaceId }, data: { planId: plan.id } });
  }

  private async syncSubscription(sub: Stripe.Subscription) {
    const existing = await this.prisma.subscription.findFirst({ where: { externalSubscriptionId: sub.id } });
    if (!existing) return;
    await this.prisma.subscription.update({
      where: { id: existing.id },
      data: {
        status: this.mapStatus(sub.status),
        currentPeriodStart: new Date(sub.current_period_start * 1000),
        currentPeriodEnd: new Date(sub.current_period_end * 1000),
        cancelAtPeriodEnd: sub.cancel_at_period_end,
        cancelledAt: sub.canceled_at ? new Date(sub.canceled_at * 1000) : null,
      },
    });
  }

  private mapStatus(s: Stripe.Subscription.Status): SubscriptionStatus {
    switch (s) {
      case 'trialing': return 'TRIALING';
      case 'active':   return 'ACTIVE';
      case 'past_due': return 'PAST_DUE';
      case 'canceled': return 'CANCELED';
      case 'unpaid':
      case 'incomplete_expired': return 'EXPIRED';
      default: return 'ACTIVE';
    }
  }
}
