import { BadRequestException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';

// ---------------------------------------------------------------------------
// Mock BillingService interface
// ---------------------------------------------------------------------------

interface MockBillingService {
  publicPlans: jest.Mock;
  subscription: jest.Mock;
  startCheckout: jest.Mock;
  handleWebhook: jest.Mock;
  createPortalSession: jest.Mock;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockBillingService(): MockBillingService {
  return {
    publicPlans: jest.fn(),
    subscription: jest.fn(),
    startCheckout: jest.fn(),
    handleWebhook: jest.fn(),
    createPortalSession: jest.fn(),
  };
}

function makeController() {
  const billing = mockBillingService();
  const ctrl = new BillingController(billing as unknown as BillingService);
  return { ctrl, billing };
}

// ---------------------------------------------------------------------------
// Decorator / metadata helpers
// ---------------------------------------------------------------------------

const reflector = new Reflector();

function getMethodMeta(key: string, method: Function) {
  return reflector.get(key, method);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('BillingController', () => {
  // =========================================================================
  // Delegation tests
  // =========================================================================

  describe('plans', () => {
    it('delegates to billing.publicPlans', () => {
      const { ctrl, billing } = makeController();
      const expected = [{ id: '1', name: 'Starter' }];
      billing.publicPlans.mockReturnValue(expected);

      const result = ctrl.plans();

      expect(billing.publicPlans).toHaveBeenCalledWith();
      expect(result).toBe(expected);
    });
  });

  describe('subscription', () => {
    it('delegates to billing.subscription with workspaceId', () => {
      const { ctrl, billing } = makeController();
      const expected = { id: 'sub-1', planId: 'plan-1' };
      billing.subscription.mockReturnValue(expected);

      const result = ctrl.subscription('ws-1');

      expect(billing.subscription).toHaveBeenCalledWith('ws-1');
      expect(result).toBe(expected);
    });
  });

  describe('checkout', () => {
    it('delegates to billing.startCheckout with workspaceId, planCode, and interval', () => {
      const { ctrl, billing } = makeController();
      const expected = { checkoutUrl: 'https://checkout.stripe.com/xxx' };
      billing.startCheckout.mockReturnValue(expected);

      const result = ctrl.checkout({ workspaceId: 'ws-1', planCode: 'pro', interval: 'ANNUAL' });

      expect(billing.startCheckout).toHaveBeenCalledWith('ws-1', 'pro', 'ANNUAL');
      expect(result).toBe(expected);
    });

    it('defaults interval to MONTHLY when not provided', () => {
      const { ctrl, billing } = makeController();
      billing.startCheckout.mockReturnValue({});

      ctrl.checkout({ workspaceId: 'ws-1', planCode: 'pro' });

      expect(billing.startCheckout).toHaveBeenCalledWith('ws-1', 'pro', 'MONTHLY');
    });
  });

  describe('portal', () => {
    it('delegates to billing.createPortalSession with workspaceId', () => {
      const { ctrl, billing } = makeController();
      const expected = { portalUrl: 'https://billing.stripe.com/xxx' };
      billing.createPortalSession.mockReturnValue(expected);

      const result = ctrl.portal({ workspaceId: 'ws-1' });

      expect(billing.createPortalSession).toHaveBeenCalledWith('ws-1');
      expect(result).toBe(expected);
    });
  });

  describe('stripeWebhook', () => {
    it('delegates to billing.handleWebhook with raw body and signature', async () => {
      const { ctrl, billing } = makeController();
      const expected = { received: true, type: 'checkout.session.completed' };
      billing.handleWebhook.mockResolvedValue(expected);

      const rawBody = Buffer.from('{"type":"checkout.session.completed"}');
      const req = { rawBody } as unknown as Request;

      const result = await ctrl.stripeWebhook(req, 'sig_test_123');

      expect(billing.handleWebhook).toHaveBeenCalledWith(rawBody, 'sig_test_123');
      expect(result).toBe(expected);
    });

    it('throws BadRequestException when stripe-signature header is missing', async () => {
      const { ctrl } = makeController();
      const req = { rawBody: Buffer.from('{}') } as unknown as Request;

      await expect(ctrl.stripeWebhook(req, '')).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when rawBody is missing', async () => {
      const { ctrl } = makeController();
      const req = {} as unknown as Request;

      await expect(ctrl.stripeWebhook(req, 'sig_test_123')).rejects.toThrow(BadRequestException);
    });
  });

  // =========================================================================
  // Decorator metadata tests
  // =========================================================================

  describe('decorator metadata', () => {
    const proto = BillingController.prototype;

    describe('@Public()', () => {
      it.each(['plans', 'stripeWebhook'])('%s is marked @Public', (method) => {
        expect(getMethodMeta(IS_PUBLIC_KEY, proto[method])).toBe(true);
      });

      it.each(['subscription', 'checkout', 'portal'])('%s is NOT marked @Public', (method) => {
        expect(getMethodMeta(IS_PUBLIC_KEY, proto[method])).toBeFalsy();
      });
    });
  });
});
