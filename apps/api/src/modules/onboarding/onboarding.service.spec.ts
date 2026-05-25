import { OnboardingService } from './onboarding.service';
import {
  createMockPrisma,
  createMockTenantsService,
  type PrismaService,
  type TenantsService,
} from '../../test/mock-helpers';
import type { AiService } from '../ai/ai.service';

function createMockAiService() {
  return { enqueue: jest.fn(), run: jest.fn(), getGeneration: jest.fn() };
}

function makeService() {
  const prisma = createMockPrisma();
  const tenants = createMockTenantsService();
  const ai = createMockAiService();
  const svc = new OnboardingService(
    prisma as unknown as PrismaService,
    tenants as unknown as TenantsService,
    ai as unknown as AiService,
  );
  return { svc, prisma, tenants, ai };
}

const USER = 'user-1';
const TENANT = 'tenant-1';

const baseTenant = {
  id: TENANT,
  name: 'Acme',
  slug: 'acme',
  onboarding: {
    companyName: 'Acme',
    industry: 'tech',
    description: 'A tech company',
  },
};

const answers = {
  companyName: 'Acme',
  industry: 'tech',
  description: 'A tech company',
  brandColors: ['#000', '#fff'],
  brandVoice: 'professional',
};

describe('OnboardingService', () => {
  // ---------------------------------------------------------------
  // saveAnswers
  // ---------------------------------------------------------------
  describe('saveAnswers', () => {
    it('validates tenant access and updates tenant with answer fields', async () => {
      const { svc, prisma, tenants } = makeService();
      tenants.get.mockResolvedValue(baseTenant);
      prisma.tenant.update.mockResolvedValue({ ...baseTenant, ...answers });

      await svc.saveAnswers(USER, TENANT, answers);

      expect(tenants.get).toHaveBeenCalledWith(USER, TENANT);
      expect(prisma.tenant.update).toHaveBeenCalledWith({
        where: { id: TENANT },
        data: expect.objectContaining({
          onboarding: answers,
          name: 'Acme',
          industry: 'tech',
          description: 'A tech company',
          branding: expect.objectContaining({
            colors: ['#000', '#fff'],
            voice: 'professional',
          }),
        }),
      });
    });
  });

  // ---------------------------------------------------------------
  // getAnswers
  // ---------------------------------------------------------------
  describe('getAnswers', () => {
    it('returns tenant.onboarding as OnboardingAnswers', async () => {
      const { svc, tenants } = makeService();
      tenants.get.mockResolvedValue(baseTenant);

      const result = await svc.getAnswers(USER, TENANT);

      expect(tenants.get).toHaveBeenCalledWith(USER, TENANT);
      expect(result).toEqual(baseTenant.onboarding);
    });

    it('returns empty object when no onboarding data', async () => {
      const { svc, tenants } = makeService();
      tenants.get.mockResolvedValue({ ...baseTenant, onboarding: null });

      const result = await svc.getAnswers(USER, TENANT);

      expect(result).toEqual({});
    });
  });

  // ---------------------------------------------------------------
  // generateFromAnswers
  // ---------------------------------------------------------------
  describe('generateFromAnswers', () => {
    it('enqueues AI generation with kind SITE and creates a claudeTask', async () => {
      const { svc, prisma, tenants, ai } = makeService();
      const gen = { id: 'gen-1' };
      tenants.get.mockResolvedValue(baseTenant);
      ai.enqueue.mockResolvedValue(gen);
      prisma.claudeTask.create.mockResolvedValue({ id: 1 });

      const result = await svc.generateFromAnswers(USER, TENANT);

      expect(tenants.get).toHaveBeenCalledWith(USER, TENANT);
      expect(ai.enqueue).toHaveBeenCalledWith(
        USER,
        TENANT,
        expect.objectContaining({
          kind: 'SITE',
          provider: 'claude-code-manual',
          jsonMode: true,
        }),
      );
      expect(prisma.claudeTask.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: 'Generate site for acme',
            priority: 1,
          }),
        }),
      );
      expect(result).toEqual(gen);
    });

    it('queries integrationCatalog when integrations are selected', async () => {
      const { svc, prisma, tenants, ai } = makeService();
      const tenantWithIntegrations = {
        ...baseTenant,
        onboarding: {
          ...baseTenant.onboarding,
          integrations: ['stripe', 'mailchimp'],
        },
      };
      const catalogItems = [
        { key: 'stripe', name: 'Stripe', category: 'payments', description: 'Payment processing' },
        { key: 'mailchimp', name: 'Mailchimp', category: 'email', description: 'Email marketing' },
      ];
      tenants.get.mockResolvedValue(tenantWithIntegrations);
      prisma.integrationCatalog.findMany.mockResolvedValue(catalogItems);
      ai.enqueue.mockResolvedValue({ id: 'gen-2' });
      prisma.claudeTask.create.mockResolvedValue({ id: 2 });

      await svc.generateFromAnswers(USER, TENANT);

      expect(prisma.integrationCatalog.findMany).toHaveBeenCalledWith({
        where: { key: { in: ['stripe', 'mailchimp'] } },
        select: { key: true, name: true, category: true, description: true },
      });
      // The userPrompt passed to ai.enqueue should mention the integrations
      const enqueueCall = ai.enqueue.mock.calls[0][2];
      expect(enqueueCall.userPrompt).toContain('Stripe');
      expect(enqueueCall.userPrompt).toContain('Mailchimp');
    });

    it('skips integrationCatalog query when no integrations selected', async () => {
      const { svc, prisma, tenants, ai } = makeService();
      tenants.get.mockResolvedValue(baseTenant);
      ai.enqueue.mockResolvedValue({ id: 'gen-3' });
      prisma.claudeTask.create.mockResolvedValue({ id: 3 });

      await svc.generateFromAnswers(USER, TENANT);

      expect(prisma.integrationCatalog.findMany).not.toHaveBeenCalled();
    });
  });
});
