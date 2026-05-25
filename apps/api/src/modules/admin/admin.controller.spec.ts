import { Reflector } from '@nestjs/core';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';
import { SetFlagDto } from './dto/admin.dto';

// ---------------------------------------------------------------------------
// Mock AdminService interface
// ---------------------------------------------------------------------------

interface MockAdminService {
  overview: jest.Mock;
  listTenants: jest.Mock;
  listFeatureFlags: jest.Mock;
  setFlag: jest.Mock;
  suspendTenant: jest.Mock;
  unsuspendTenant: jest.Mock;
  softDeleteTenant: jest.Mock;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockAdminService(): MockAdminService {
  return {
    overview: jest.fn(),
    listTenants: jest.fn(),
    listFeatureFlags: jest.fn(),
    setFlag: jest.fn(),
    suspendTenant: jest.fn(),
    unsuspendTenant: jest.fn(),
    softDeleteTenant: jest.fn(),
  };
}

function makeController() {
  const admin = mockAdminService();
  const ctrl = new AdminController(admin as unknown as AdminService);
  return { ctrl, admin };
}

// ---------------------------------------------------------------------------
// Decorator / metadata helpers
// ---------------------------------------------------------------------------

const reflector = new Reflector();

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AdminController', () => {
  // =========================================================================
  // Class-level decorator tests
  // =========================================================================

  describe('decorator metadata', () => {
    it('controller class is marked @Roles(SUPER_ADMIN)', () => {
      const roles = reflector.get(ROLES_KEY, AdminController);
      expect(roles).toEqual(['SUPER_ADMIN']);
    });
  });

  // =========================================================================
  // Delegation tests
  // =========================================================================

  describe('overview', () => {
    it('delegates to admin.overview()', async () => {
      const { ctrl, admin } = makeController();
      const expected = { workspaces: 5, tenants: 10, users: 20, sites: 15, deployments: 8, aiGenerations: 3, customDomains: 2 };
      admin.overview.mockResolvedValue(expected);

      const result = await ctrl.overview();

      expect(admin.overview).toHaveBeenCalledWith();
      expect(result).toBe(expected);
    });
  });

  describe('tenants', () => {
    it('delegates to admin.listTenants() with no params', async () => {
      const { ctrl, admin } = makeController();
      const expected = [{ id: 't-1', slug: 'test' }];
      admin.listTenants.mockResolvedValue(expected);

      const result = await ctrl.tenants();

      expect(admin.listTenants).toHaveBeenCalledWith(undefined, undefined);
      expect(result as unknown).toBe(expected);
    });

    it('delegates to admin.listTenants() with search param', async () => {
      const { ctrl, admin } = makeController();
      admin.listTenants.mockResolvedValue([]);

      await ctrl.tenants('acme');

      expect(admin.listTenants).toHaveBeenCalledWith('acme', undefined);
    });

    it('delegates to admin.listTenants() with search and status params', async () => {
      const { ctrl, admin } = makeController();
      admin.listTenants.mockResolvedValue([]);

      await ctrl.tenants('acme', 'PUBLISHED');

      expect(admin.listTenants).toHaveBeenCalledWith('acme', 'PUBLISHED');
    });
  });

  describe('flags', () => {
    it('delegates to admin.listFeatureFlags()', async () => {
      const { ctrl, admin } = makeController();
      const expected = [{ id: 'f-1', key: 'beta', enabled: true }];
      admin.listFeatureFlags.mockResolvedValue(expected);

      const result = await ctrl.flags();

      expect(admin.listFeatureFlags).toHaveBeenCalledWith();
      expect(result as unknown).toBe(expected);
    });
  });

  describe('setFlag', () => {
    it('delegates to admin.setFlag() with key, enabled, and workspaceId', async () => {
      const { ctrl, admin } = makeController();
      const body: SetFlagDto = { key: 'beta', enabled: true, workspaceId: 'ws-1' };
      const expected = { id: 'f-1', key: 'beta', enabled: true, workspaceId: 'ws-1' };
      admin.setFlag.mockResolvedValue(expected);

      const result = await ctrl.setFlag(body);

      expect(admin.setFlag).toHaveBeenCalledWith('beta', true, 'ws-1');
      expect(result as unknown).toBe(expected);
    });

    it('delegates to admin.setFlag() without workspaceId', async () => {
      const { ctrl, admin } = makeController();
      const body: SetFlagDto = { key: 'feature-x', enabled: false };
      admin.setFlag.mockResolvedValue({ id: 'f-2', key: 'feature-x', enabled: false });

      await ctrl.setFlag(body);

      expect(admin.setFlag).toHaveBeenCalledWith('feature-x', false, undefined);
    });
  });

  describe('suspendTenant', () => {
    it('delegates to admin.suspendTenant() with id', async () => {
      const { ctrl, admin } = makeController();
      const expected = { id: 't-1', status: 'ARCHIVED' };
      admin.suspendTenant.mockResolvedValue(expected);

      const result = await ctrl.suspendTenant('t-1');

      expect(admin.suspendTenant).toHaveBeenCalledWith('t-1');
      expect(result as unknown).toBe(expected);
    });
  });

  describe('unsuspendTenant', () => {
    it('delegates to admin.unsuspendTenant() with id', async () => {
      const { ctrl, admin } = makeController();
      const expected = { id: 't-1', status: 'DRAFT' };
      admin.unsuspendTenant.mockResolvedValue(expected);

      const result = await ctrl.unsuspendTenant('t-1');

      expect(admin.unsuspendTenant).toHaveBeenCalledWith('t-1');
      expect(result as unknown).toBe(expected);
    });
  });

  describe('deleteTenant', () => {
    it('delegates to admin.softDeleteTenant() with id', async () => {
      const { ctrl, admin } = makeController();
      const expected = { id: 't-1', deletedAt: new Date() };
      admin.softDeleteTenant.mockResolvedValue(expected);

      const result = await ctrl.deleteTenant('t-1');

      expect(admin.softDeleteTenant).toHaveBeenCalledWith('t-1');
      expect(result as unknown).toBe(expected);
    });
  });
});
