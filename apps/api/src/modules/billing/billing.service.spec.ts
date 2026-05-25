import { BillingService } from './billing.service';
import { createMockPrisma, createMockConfig, type PrismaService, type ConfigService } from '../../test/mock-helpers';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeService() {
  const prisma = createMockPrisma();
  const config = createMockConfig();
  config.get.mockReturnValue('http://localhost:4200');
  const svc = new BillingService(
    prisma as unknown as PrismaService,
    config as unknown as ConfigService,
  );
  return { svc, prisma, config };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('BillingService', () => {
  // ----- onModuleInit ------------------------------------------------------
  describe('onModuleInit', () => {
    it('does not throw when STRIPE_SECRET_KEY is not set', () => {
      const original = process.env.STRIPE_SECRET_KEY;
      delete process.env.STRIPE_SECRET_KEY;

      const { svc } = makeService();
      expect(() => svc.onModuleInit()).not.toThrow();

      if (original !== undefined) process.env.STRIPE_SECRET_KEY = original;
    });
  });

  // ----- publicPlans -------------------------------------------------------
  describe('publicPlans', () => {
    it('queries for visible plans ordered by sortOrder', async () => {
      const { svc, prisma } = makeService();
      const plans = [{ id: 'p1', name: 'Free' }, { id: 'p2', name: 'Pro' }];
      prisma.plan.findMany.mockResolvedValue(plans);

      const result = await svc.publicPlans();

      expect(prisma.plan.findMany).toHaveBeenCalledWith({
        where: { deletedAt: null, isPublic: true },
        orderBy: { sortOrder: 'asc' },
      });
      expect(result.length).toBe(2);
      expect(result[0].name).toBe('Free');
    });
  });

  // ----- subscription ------------------------------------------------------
  describe('subscription', () => {
    it('returns the subscription for a workspace', async () => {
      const { svc, prisma } = makeService();
      const sub = { id: 'sub-1', workspaceId: 'ws-1', plan: { name: 'Pro' } };
      prisma.subscription.findUnique.mockResolvedValue(sub);

      const result = await svc.subscription('ws-1');

      expect(prisma.subscription.findUnique).toHaveBeenCalledWith({
        where: { workspaceId: 'ws-1' },
        include: { plan: true },
      });
      expect(result).toBeDefined();
      expect(result!.id).toBe('sub-1');
    });

    it('returns null when no subscription exists', async () => {
      const { svc, prisma } = makeService();
      prisma.subscription.findUnique.mockResolvedValue(null);

      const result = await svc.subscription('ws-none');

      expect(result).toBeNull();
    });
  });

  // ----- startCheckout (no Stripe configured) ------------------------------
  describe('startCheckout (Stripe not configured)', () => {
    it('returns a stub response when Stripe is not initialized', async () => {
      const { svc } = makeService();
      // stripe is undefined because onModuleInit was not called with a key

      const result = await svc.startCheckout('ws-1', 'pro', 'MONTHLY');

      expect(result.checkoutUrl).toBeNull();
      expect(result.message).toMatch(/Stripe not configured/);
    });
  });

  // ----- handleWebhook (no Stripe configured) ------------------------------
  describe('handleWebhook (Stripe not configured)', () => {
    it('returns received: true when Stripe is not initialized', async () => {
      const { svc } = makeService();

      const result = await svc.handleWebhook(Buffer.from('{}'), 'sig');

      expect(result.received).toBe(true);
    });
  });
});
