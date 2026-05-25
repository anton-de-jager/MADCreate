import { OnboardingController } from './onboarding.controller';
import { OnboardingService } from './onboarding.service';
import type { JwtPayload } from '@madcreate/shared';

// ---------------------------------------------------------------------------
// Mock OnboardingService interface
// ---------------------------------------------------------------------------

interface MockOnboardingService {
  getAnswers: jest.Mock;
  saveAnswers: jest.Mock;
  generateFromAnswers: jest.Mock;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockOnboardingService(): MockOnboardingService {
  return {
    getAnswers: jest.fn(),
    saveAnswers: jest.fn(),
    generateFromAnswers: jest.fn(),
  };
}

const jwtUser: JwtPayload = {
  sub: 'user-1',
  email: 'alice@example.com',
  wsid: 'ws-1',
  role: 'WORKSPACE_OWNER',
  superAdmin: false,
};

function makeController() {
  const onboarding = mockOnboardingService();
  const ctrl = new OnboardingController(onboarding as unknown as OnboardingService);
  return { ctrl, onboarding };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('OnboardingController', () => {
  // =========================================================================
  // get (GET /onboarding)
  // =========================================================================

  describe('get', () => {
    it('delegates to onboarding.getAnswers with userId and tenantId', async () => {
      const { ctrl, onboarding } = makeController();
      const expected = { businessName: 'Acme', industry: 'tech' };
      onboarding.getAnswers.mockResolvedValue(expected);

      const result = await ctrl.get(jwtUser, 'tenant-1');

      expect(onboarding.getAnswers).toHaveBeenCalledWith('user-1', 'tenant-1');
      expect(result).toBe(expected);
    });
  });

  // =========================================================================
  // save (POST /onboarding)
  // =========================================================================

  describe('save', () => {
    it('delegates to onboarding.saveAnswers with userId, tenantId, and answers', async () => {
      const { ctrl, onboarding } = makeController();
      const answers = { businessName: 'Acme', industry: 'tech' } as any;
      const expected = { id: 'onb-1', saved: true };
      onboarding.saveAnswers.mockResolvedValue(expected);

      const result = await ctrl.save(jwtUser, 'tenant-1', answers);

      expect(onboarding.saveAnswers).toHaveBeenCalledWith('user-1', 'tenant-1', answers);
      expect(result).toBe(expected);
    });

    it('passes through arbitrary answer fields', async () => {
      const { ctrl, onboarding } = makeController();
      const answers = { businessName: 'Test Corp', colors: ['red', 'blue'], goals: 'sell more' } as any;
      onboarding.saveAnswers.mockResolvedValue({ ok: true });

      await ctrl.save(jwtUser, 'tenant-2', answers);

      expect(onboarding.saveAnswers).toHaveBeenCalledWith('user-1', 'tenant-2', answers);
    });
  });

  // =========================================================================
  // generate (POST /onboarding/generate)
  // =========================================================================

  describe('generate', () => {
    it('delegates to onboarding.generateFromAnswers with userId and tenantId', async () => {
      const { ctrl, onboarding } = makeController();
      const expected = { siteId: 'site-1', status: 'GENERATING' };
      onboarding.generateFromAnswers.mockResolvedValue(expected);

      const result = await ctrl.generate(jwtUser, 'tenant-1');

      expect(onboarding.generateFromAnswers).toHaveBeenCalledWith('user-1', 'tenant-1');
      expect(result).toBe(expected);
    });
  });
});
