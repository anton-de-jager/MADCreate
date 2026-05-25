"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var BillingService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BillingService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const stripe_1 = __importDefault(require("stripe"));
const prisma_service_1 = require("../../prisma/prisma.service");
let BillingService = BillingService_1 = class BillingService {
    prisma;
    config;
    logger = new common_1.Logger(BillingService_1.name);
    stripe;
    constructor(prisma, config) {
        this.prisma = prisma;
        this.config = config;
    }
    onModuleInit() {
        const key = this.config.get('stripe.secretKey');
        if (!key) {
            this.logger.warn('STRIPE_SECRET_KEY not set — billing returns a stub until configured.');
            return;
        }
        this.stripe = new stripe_1.default(key);
        this.logger.log('Stripe client ready');
    }
    publicPlans() {
        return this.prisma.plan.findMany({
            where: { deletedAt: null, isPublic: true },
            orderBy: { sortOrder: 'asc' },
        });
    }
    async subscription(workspaceId) {
        return this.prisma.subscription.findUnique({
            where: { workspaceId },
            include: { plan: true },
        });
    }
    async startCheckout(workspaceId, planCode, interval = 'MONTHLY') {
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
        if (!ws)
            throw new common_1.NotFoundException('Workspace not found');
        const plan = await this.prisma.plan.findUnique({ where: { code: planCode } });
        if (!plan)
            throw new common_1.NotFoundException('Plan not found');
        const amount = Math.round(Number(interval === 'ANNUAL' ? plan.priceAnnualUsd : plan.priceMonthlyUsd) * 100);
        if (amount <= 0)
            throw new common_1.BadRequestException('This plan is not chargeable via Stripe.');
        const appUrl = this.config.get('web.url') ?? 'http://localhost:4200';
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
    async handleWebhook(rawBody, signature) {
        if (!this.stripe)
            return { received: true };
        const secret = this.config.get('stripe.webhookSecret');
        if (!secret) {
            this.logger.warn('Stripe webhook hit but STRIPE_WEBHOOK_SECRET not set — ignoring.');
            return { received: true };
        }
        let event;
        try {
            event = this.stripe.webhooks.constructEvent(rawBody, signature, secret);
        }
        catch (err) {
            throw new common_1.BadRequestException(`Stripe webhook signature failed: ${err.message}`);
        }
        switch (event.type) {
            case 'checkout.session.completed': {
                await this.upsertSubscriptionFromSession(event.data.object);
                break;
            }
            case 'customer.subscription.created':
            case 'customer.subscription.updated':
            case 'customer.subscription.deleted': {
                await this.syncSubscription(event.data.object);
                break;
            }
            default:
                this.logger.debug(`Unhandled Stripe event: ${event.type}`);
        }
        return { received: true, type: event.type };
    }
    async createPortalSession(workspaceId) {
        if (!this.stripe) {
            return { portalUrl: null };
        }
        const sub = await this.prisma.subscription.findUnique({
            where: { workspaceId },
            select: { externalCustomerId: true },
        });
        if (!sub?.externalCustomerId) {
            throw new common_1.NotFoundException('No active subscription found for this workspace');
        }
        const appUrl = this.config.get('web.url') ?? 'http://localhost:4200';
        const session = await this.stripe.billingPortal.sessions.create({
            customer: sub.externalCustomerId,
            return_url: `${appUrl}/app/settings`,
        });
        return { portalUrl: session.url };
    }
    async upsertSubscriptionFromSession(session) {
        if (!this.stripe)
            return;
        const workspaceId = session.metadata?.workspaceId || session.client_reference_id;
        const planCode = session.metadata?.planCode;
        const interval = session.metadata?.interval ?? 'MONTHLY';
        if (!workspaceId || !planCode || !session.subscription)
            return;
        const plan = await this.prisma.plan.findUnique({ where: { code: planCode } });
        if (!plan)
            return;
        const stripeSub = await this.stripe.subscriptions.retrieve(session.subscription);
        await this.prisma.subscription.upsert({
            where: { workspaceId },
            update: {
                planId: plan.id,
                interval,
                status: this.mapStatus(stripeSub.status),
                externalCustomerId: stripeSub.customer,
                externalSubscriptionId: stripeSub.id,
                currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
                currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
            },
            create: {
                workspaceId,
                planId: plan.id,
                interval,
                status: this.mapStatus(stripeSub.status),
                externalCustomerId: stripeSub.customer,
                externalSubscriptionId: stripeSub.id,
                currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
                currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
            },
        });
        await this.prisma.workspace.update({ where: { id: workspaceId }, data: { planId: plan.id } });
    }
    async syncSubscription(sub) {
        const existing = await this.prisma.subscription.findFirst({ where: { externalSubscriptionId: sub.id } });
        if (!existing)
            return;
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
    mapStatus(s) {
        switch (s) {
            case 'trialing': return 'TRIALING';
            case 'active': return 'ACTIVE';
            case 'past_due': return 'PAST_DUE';
            case 'canceled': return 'CANCELED';
            case 'unpaid':
            case 'incomplete_expired': return 'EXPIRED';
            default: return 'ACTIVE';
        }
    }
};
exports.BillingService = BillingService;
exports.BillingService = BillingService = BillingService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService])
], BillingService);
//# sourceMappingURL=billing.service.js.map