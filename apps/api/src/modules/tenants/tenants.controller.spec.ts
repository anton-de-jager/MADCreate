import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';
import type { JwtPayload } from '@madcreate/shared';

// ---------------------------------------------------------------------------
// Mock TenantsService interface
// ---------------------------------------------------------------------------

interface MockTenantsService {
  list: jest.Mock;
  get: jest.Mock;
  create: jest.Mock;
  update: jest.Mock;
  remove: jest.Mock;
  purgeAll: jest.Mock;
  purge: jest.Mock;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockTenantsService(): MockTenantsService {
  return {
    list: jest.fn(),
    get: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    purgeAll: jest.fn(),
    purge: jest.fn(),
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
  const svc = mockTenantsService();
  const ctrl = new TenantsController(svc as unknown as TenantsService);
  return { ctrl, svc };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('TenantsController', () => {
  // =========================================================================
  // Delegation tests
  // =========================================================================

  describe('list', () => {
    it('delegates to tenants.list with user.sub and workspaceId', async () => {
      const { ctrl, svc } = makeController();
      const expected = [{ id: 't-1', name: 'Tenant One' }];
      svc.list.mockResolvedValue(expected);

      const result = await ctrl.list(jwtUser, 'ws-1');

      expect(svc.list).toHaveBeenCalledWith('user-1', 'ws-1');
      expect(result).toBe(expected);
    });
  });

  describe('get', () => {
    it('delegates to tenants.get with user.sub and id', async () => {
      const { ctrl, svc } = makeController();
      const expected = { id: 't-1', name: 'Tenant One' };
      svc.get.mockResolvedValue(expected);

      const result = await ctrl.get(jwtUser, 't-1');

      expect(svc.get).toHaveBeenCalledWith('user-1', 't-1');
      expect(result).toBe(expected);
    });
  });

  describe('create', () => {
    it('delegates to tenants.create with user.sub, workspaceId, and dto', async () => {
      const { ctrl, svc } = makeController();
      const dto = { slug: 'my-tenant', name: 'My Tenant', industry: 'tech', description: 'A tenant' };
      const expected = { id: 't-2', ...dto };
      svc.create.mockResolvedValue(expected);

      const result = await ctrl.create(jwtUser, 'ws-1', dto);

      expect(svc.create).toHaveBeenCalledWith('user-1', 'ws-1', dto);
      expect(result).toBe(expected);
    });

    it('works with only required fields in dto', async () => {
      const { ctrl, svc } = makeController();
      const dto = { slug: 'minimal', name: 'Minimal' };
      svc.create.mockResolvedValue({ id: 't-3', ...dto });

      await ctrl.create(jwtUser, 'ws-1', dto);

      expect(svc.create).toHaveBeenCalledWith('user-1', 'ws-1', dto);
    });
  });

  describe('update', () => {
    it('delegates to tenants.update with user.sub, id, and dto', async () => {
      const { ctrl, svc } = makeController();
      const dto = { name: 'Updated Name', industry: 'finance' };
      const expected = { id: 't-1', ...dto };
      svc.update.mockResolvedValue(expected);

      const result = await ctrl.update(jwtUser, 't-1', dto);

      expect(svc.update).toHaveBeenCalledWith('user-1', 't-1', dto);
      expect(result).toBe(expected);
    });

    it('works with branding field', async () => {
      const { ctrl, svc } = makeController();
      const dto = { branding: { primaryColor: '#ff0000' } };
      svc.update.mockResolvedValue({ id: 't-1', ...dto });

      await ctrl.update(jwtUser, 't-1', dto);

      expect(svc.update).toHaveBeenCalledWith('user-1', 't-1', dto);
    });
  });

  describe('remove', () => {
    it('delegates to tenants.remove with user.sub and id', async () => {
      const { ctrl, svc } = makeController();
      const expected = { deleted: true };
      svc.remove.mockResolvedValue(expected);

      const result = await ctrl.remove(jwtUser, 't-1');

      expect(svc.remove).toHaveBeenCalledWith('user-1', 't-1');
      expect(result).toBe(expected);
    });
  });

  describe('purgeExpired', () => {
    it('delegates to tenants.purgeAll with user.sub', async () => {
      const { ctrl, svc } = makeController();
      const expected = { purged: 3 };
      svc.purgeAll.mockResolvedValue(expected);

      const result = await ctrl.purgeExpired(jwtUser);

      expect(svc.purgeAll).toHaveBeenCalledWith('user-1');
      expect(result).toBe(expected);
    });
  });

  describe('purge', () => {
    it('delegates to tenants.purge with user.sub and id', async () => {
      const { ctrl, svc } = makeController();
      const expected = { purged: true };
      svc.purge.mockResolvedValue(expected);

      const result = await ctrl.purge(jwtUser, 't-1');

      expect(svc.purge).toHaveBeenCalledWith('user-1', 't-1');
      expect(result).toBe(expected);
    });
  });

  // =========================================================================
  // Decorator metadata tests
  // =========================================================================

  describe('decorator metadata', () => {
    const proto = TenantsController.prototype;

    describe('@Controller route prefix', () => {
      it('has "tenants" path prefix', () => {
        const path = Reflect.getMetadata('path', TenantsController);
        expect(path).toBe('tenants');
      });
    });

    describe('HTTP method metadata', () => {
      it('list uses GET', () => {
        const method = Reflect.getMetadata('method', proto.list);
        expect(method).toBe(0); // RequestMethod.GET = 0
      });

      it('get uses GET with :id param', () => {
        const method = Reflect.getMetadata('method', proto.get);
        const path = Reflect.getMetadata('path', proto.get);
        expect(method).toBe(0);
        expect(path).toBe(':id');
      });

      it('create uses POST', () => {
        const method = Reflect.getMetadata('method', proto.create);
        expect(method).toBe(1); // RequestMethod.POST = 1
      });

      it('update uses PATCH with :id param', () => {
        const method = Reflect.getMetadata('method', proto.update);
        const path = Reflect.getMetadata('path', proto.update);
        expect(method).toBe(4); // RequestMethod.PATCH = 4
        expect(path).toBe(':id');
      });

      it('remove uses DELETE with :id param', () => {
        const method = Reflect.getMetadata('method', proto.remove);
        const path = Reflect.getMetadata('path', proto.remove);
        expect(method).toBe(3); // RequestMethod.DELETE = 3
        expect(path).toBe(':id');
      });

      it('purgeExpired uses POST with purge-expired path', () => {
        const method = Reflect.getMetadata('method', proto.purgeExpired);
        const path = Reflect.getMetadata('path', proto.purgeExpired);
        expect(method).toBe(1);
        expect(path).toBe('purge-expired');
      });

      it('purge uses POST with :id/purge path', () => {
        const method = Reflect.getMetadata('method', proto.purge);
        const path = Reflect.getMetadata('path', proto.purge);
        expect(method).toBe(1);
        expect(path).toBe(':id/purge');
      });
    });
  });
});
