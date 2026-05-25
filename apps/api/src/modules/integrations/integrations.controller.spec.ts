import { IntegrationsController } from './integrations.controller';
import { IntegrationsService } from './integrations.service';
import type { JwtPayload } from '@madcreate/shared';
import type { InstallIntegrationDto } from './dto/install-integration.dto';

// ---------------------------------------------------------------------------
// Mock IntegrationsService
// ---------------------------------------------------------------------------

interface MockIntegrationsService {
  catalog: jest.Mock;
  installed: jest.Mock;
  install: jest.Mock;
  uninstall: jest.Mock;
}

function mockIntegrationsService(): MockIntegrationsService {
  return {
    catalog: jest.fn(),
    installed: jest.fn(),
    install: jest.fn(),
    uninstall: jest.fn(),
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
  const svc = mockIntegrationsService();
  const ctrl = new IntegrationsController(svc as unknown as IntegrationsService);
  return { ctrl, svc };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('IntegrationsController', () => {
  // ── catalog ───────────────────────────────────────────────────────
  describe('catalog()', () => {
    it('delegates to service.catalog() and returns result', () => {
      const { ctrl, svc } = makeController();
      const catalogItems = [{ id: '1', key: 'stripe', name: 'Stripe' }];
      svc.catalog.mockReturnValue(catalogItems);

      const result = ctrl.catalog();

      expect(svc.catalog).toHaveBeenCalledTimes(1);
      expect(result as unknown).toBe(catalogItems);
    });
  });

  // ── suggest ───────────────────────────────────────────────────────
  describe('suggest()', () => {
    it('returns default keys when no industry provided', () => {
      const { ctrl } = makeController();
      const result = ctrl.suggest();

      expect(result.industry).toBeNull();
      expect(result.keys).toEqual(expect.arrayContaining(['stripe', 'mailchimp']));
      expect(Array.isArray(result.keys)).toBe(true);
    });

    it('returns default keys when industry is undefined', () => {
      const { ctrl } = makeController();
      const result = ctrl.suggest(undefined);

      expect(result.industry).toBeNull();
      expect(result.keys.length).toBeGreaterThan(0);
    });

    it('returns matched keys for restaurant industry', () => {
      const { ctrl } = makeController();
      const result = ctrl.suggest('restaurant');

      expect(result.industry).toBe('restaurant');
      expect(result.keys).toContain('stripe');
      expect(result.keys).toContain('calendly');
    });

    it('returns matched keys for ecommerce industry', () => {
      const { ctrl } = makeController();
      const result = ctrl.suggest('ecommerce');

      expect(result.industry).toBe('ecommerce');
      expect(result.keys).toContain('shopify');
      expect(result.keys).toContain('stripe');
    });

    it('returns matched keys for saas industry', () => {
      const { ctrl } = makeController();
      const result = ctrl.suggest('saas');

      expect(result.industry).toBe('saas');
      expect(result.keys).toContain('stripe');
      expect(result.keys).toContain('posthog');
    });

    it('returns matched keys for church/nonprofit', () => {
      const { ctrl } = makeController();
      const result = ctrl.suggest('church');

      expect(result.industry).toBe('church');
      expect(result.keys).toContain('payfast');
      expect(result.keys).toContain('whatsapp');
    });

    it('returns fallback keys for unknown industry', () => {
      const { ctrl } = makeController();
      const result = ctrl.suggest('underwater basket weaving');

      expect(result.industry).toBe('underwater basket weaving');
      expect(result.keys).toContain('stripe');
      expect(result.keys).toContain('hubspot');
    });
  });

  // ── installed ─────────────────────────────────────────────────────
  describe('installed()', () => {
    it('delegates to service.installed() with user sub and tenantId', () => {
      const { ctrl, svc } = makeController();
      const installedItems = [{ id: 'ti-1', catalogId: 'c-1' }];
      svc.installed.mockReturnValue(installedItems);

      const result = ctrl.installed(jwtUser, 'tenant-1');

      expect(svc.installed).toHaveBeenCalledWith('user-1', 'tenant-1');
      expect(result as unknown).toBe(installedItems);
    });
  });

  // ── install ───────────────────────────────────────────────────────
  describe('install()', () => {
    it('delegates to service.install() with user sub, tenantId and dto', () => {
      const { ctrl, svc } = makeController();
      const dto: InstallIntegrationDto = { catalogKey: 'stripe', config: { apiKey: 'sk_test' } };
      const created = { id: 'ti-1', catalogId: 'c-1', config: dto.config };
      svc.install.mockReturnValue(created);

      const result = ctrl.install(jwtUser, 'tenant-1', dto);

      expect(svc.install).toHaveBeenCalledWith('user-1', 'tenant-1', dto);
      expect(result as unknown).toBe(created);
    });

    it('passes dto without config', () => {
      const { ctrl, svc } = makeController();
      const dto: InstallIntegrationDto = { catalogKey: 'mailchimp' };
      svc.install.mockReturnValue({ id: 'ti-2' });

      ctrl.install(jwtUser, 'tenant-2', dto);

      expect(svc.install).toHaveBeenCalledWith('user-1', 'tenant-2', dto);
    });
  });

  // ── uninstall ─────────────────────────────────────────────────────
  describe('uninstall()', () => {
    it('delegates to service.uninstall() with user sub, tenantId and id', () => {
      const { ctrl, svc } = makeController();
      const deleted = { id: 'ti-1', deletedAt: new Date() };
      svc.uninstall.mockReturnValue(deleted);

      const result = ctrl.uninstall(jwtUser, 'tenant-1', 'ti-1');

      expect(svc.uninstall).toHaveBeenCalledWith('user-1', 'tenant-1', 'ti-1');
      expect(result as unknown).toBe(deleted);
    });
  });
});
