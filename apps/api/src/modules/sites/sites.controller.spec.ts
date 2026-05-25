import { SitesController } from './sites.controller';
import { SitesService } from './sites.service';
import { JwtPayload } from '@madcreate/shared';

// ---------------------------------------------------------------------------
// Mock SitesService interface
// ---------------------------------------------------------------------------

interface MockSitesService {
  list: jest.Mock;
  get: jest.Mock;
  create: jest.Mock;
  update: jest.Mock;
  publish: jest.Mock;
  remove: jest.Mock;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockSitesService(): MockSitesService {
  return {
    list: jest.fn(),
    get: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    publish: jest.fn(),
    remove: jest.fn(),
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
  const sites = mockSitesService();
  const ctrl = new SitesController(sites as unknown as SitesService);
  return { ctrl, sites };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SitesController', () => {
  describe('list', () => {
    it('delegates to sites.list with userId and tenantId', async () => {
      const { ctrl, sites } = makeController();
      const expected = [{ id: 'site-1', name: 'My Site' }];
      sites.list.mockResolvedValue(expected);

      const result = await ctrl.list(jwtUser, 'tenant-1');

      expect(sites.list).toHaveBeenCalledWith('user-1', 'tenant-1');
      expect(result).toBe(expected);
    });
  });

  describe('get', () => {
    it('delegates to sites.get with userId and siteId', async () => {
      const { ctrl, sites } = makeController();
      const expected = { id: 'site-1', name: 'My Site', pages: [] };
      sites.get.mockResolvedValue(expected);

      const result = await ctrl.get(jwtUser, 'site-1');

      expect(sites.get).toHaveBeenCalledWith('user-1', 'site-1');
      expect(result).toBe(expected);
    });
  });

  describe('create', () => {
    it('delegates to sites.create with userId, tenantId and dto', async () => {
      const { ctrl, sites } = makeController();
      const dto = { name: 'New Site', themeId: 'theme-1' };
      const expected = { id: 'site-2', name: 'New Site', themeId: 'theme-1' };
      sites.create.mockResolvedValue(expected);

      const result = await ctrl.create(jwtUser, 'tenant-1', dto);

      expect(sites.create).toHaveBeenCalledWith('user-1', 'tenant-1', dto);
      expect(result).toBe(expected);
    });

    it('works without optional themeId', async () => {
      const { ctrl, sites } = makeController();
      const dto = { name: 'Minimal Site' };
      const expected = { id: 'site-3', name: 'Minimal Site' };
      sites.create.mockResolvedValue(expected);

      const result = await ctrl.create(jwtUser, 'tenant-2', dto);

      expect(sites.create).toHaveBeenCalledWith('user-1', 'tenant-2', dto);
      expect(result).toBe(expected);
    });
  });

  describe('update', () => {
    it('delegates to sites.update with userId, siteId and dto', async () => {
      const { ctrl, sites } = makeController();
      const dto = { name: 'Updated Site', status: 'DRAFT' } as any;
      const expected = { id: 'site-1', name: 'Updated Site', status: 'DRAFT' };
      sites.update.mockResolvedValue(expected);

      const result = await ctrl.update(jwtUser, 'site-1', dto);

      expect(sites.update).toHaveBeenCalledWith('user-1', 'site-1', dto);
      expect(result).toBe(expected);
    });

    it('supports partial updates with navigation and settings', async () => {
      const { ctrl, sites } = makeController();
      const dto = { navigation: [{ label: 'Home', href: '/' }], settings: { favicon: 'x.ico' } };
      const expected = { id: 'site-1', ...dto };
      sites.update.mockResolvedValue(expected);

      const result = await ctrl.update(jwtUser, 'site-1', dto);

      expect(sites.update).toHaveBeenCalledWith('user-1', 'site-1', dto);
      expect(result).toBe(expected);
    });
  });

  describe('publish', () => {
    it('delegates to sites.publish with userId and siteId', async () => {
      const { ctrl, sites } = makeController();
      const expected = { id: 'site-1', status: 'PUBLISHED', version: 1 };
      sites.publish.mockResolvedValue(expected);

      const result = await ctrl.publish(jwtUser, 'site-1');

      expect(sites.publish).toHaveBeenCalledWith('user-1', 'site-1');
      expect(result).toBe(expected);
    });
  });

  describe('remove', () => {
    it('delegates to sites.remove with userId and siteId', async () => {
      const { ctrl, sites } = makeController();
      const expected = { id: 'site-1', deletedAt: '2026-01-01T00:00:00Z' };
      sites.remove.mockResolvedValue(expected);

      const result = await ctrl.remove(jwtUser, 'site-1');

      expect(sites.remove).toHaveBeenCalledWith('user-1', 'site-1');
      expect(result).toBe(expected);
    });
  });

  describe('service error propagation', () => {
    it('propagates errors from the service', async () => {
      const { ctrl, sites } = makeController();
      sites.get.mockRejectedValue(new Error('Not found'));

      await expect(ctrl.get(jwtUser, 'bad-id')).rejects.toThrow('Not found');
    });
  });
});
