import { NotFoundException } from '@nestjs/common';
import { SitesService } from './sites.service';
import {
  createMockPrisma,
  createMockTenantsService,
  type PrismaService,
  type TenantsService,
} from '../../test/mock-helpers';

function makeService() {
  const prisma = createMockPrisma();
  const tenants = createMockTenantsService();
  tenants.get.mockResolvedValue({ id: 'tenant-1' });
  const svc = new SitesService(
    prisma as unknown as PrismaService,
    tenants as unknown as TenantsService,
  );
  return { svc, prisma, tenants };
}

const fakeSite = {
  id: 'site-1',
  tenantId: 'tenant-1',
  name: 'My Site',
  status: 'DRAFT',
  theme: null,
  pages: [],
};

describe('SitesService', () => {
  // -----------------------------------------------------------------------
  // list
  // -----------------------------------------------------------------------
  describe('list', () => {
    it('asserts tenant access and returns sites', async () => {
      const { svc, prisma, tenants } = makeService();
      prisma.site.findMany.mockResolvedValue([fakeSite]);

      const result = await svc.list('user-1', 'tenant-1');

      expect(tenants.get).toHaveBeenCalledWith('user-1', 'tenant-1');
      expect(prisma.site.findMany).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-1', deletedAt: null },
        orderBy: { updatedAt: 'desc' },
        include: { theme: true, _count: { select: { pages: { where: { deletedAt: null } } } } },
      });
      expect(result).toEqual([fakeSite]);
    });
  });

  // -----------------------------------------------------------------------
  // get
  // -----------------------------------------------------------------------
  describe('get', () => {
    it('returns site with theme and pages', async () => {
      const { svc, prisma, tenants } = makeService();
      prisma.site.findFirst.mockResolvedValue(fakeSite);

      const result = await svc.get('user-1', 'site-1');

      expect(prisma.site.findFirst).toHaveBeenCalledWith({
        where: { id: 'site-1', deletedAt: null },
        include: { theme: true, pages: { where: { deletedAt: null }, orderBy: { order: 'asc' } } },
      });
      expect(tenants.get).toHaveBeenCalledWith('user-1', 'tenant-1');
      expect(result).toEqual(fakeSite);
    });

    it('throws NotFoundException when site does not exist', async () => {
      const { svc, prisma } = makeService();
      prisma.site.findFirst.mockResolvedValue(null);

      await expect(svc.get('user-1', 'missing')).rejects.toThrow(NotFoundException);
    });
  });

  // -----------------------------------------------------------------------
  // create
  // -----------------------------------------------------------------------
  describe('create', () => {
    it('creates a DRAFT site with tenantId', async () => {
      const { svc, prisma, tenants } = makeService();
      prisma.site.create.mockResolvedValue({ ...fakeSite, id: 'site-new' });

      const result = await svc.create('user-1', 'tenant-1', { name: 'New Site' });

      expect(tenants.get).toHaveBeenCalledWith('user-1', 'tenant-1');
      expect(prisma.site.create).toHaveBeenCalledWith({
        data: { tenantId: 'tenant-1', name: 'New Site', themeId: undefined, status: 'DRAFT' },
      });
      expect(result.id).toBe('site-new');
    });
  });

  // -----------------------------------------------------------------------
  // update
  // -----------------------------------------------------------------------
  describe('update', () => {
    it('performs partial update with name', async () => {
      const { svc, prisma } = makeService();
      prisma.site.findFirst.mockResolvedValue(fakeSite);
      prisma.site.update.mockResolvedValue({ ...fakeSite, name: 'Renamed' });

      const result = await svc.update('user-1', 'site-1', { name: 'Renamed' });

      expect(prisma.site.update).toHaveBeenCalledWith({
        where: { id: 'site-1' },
        data: { name: 'Renamed', navigation: undefined, settings: undefined },
      });
      expect(result.name).toBe('Renamed');
    });

    it('handles navigation and settings JSON cast', async () => {
      const { svc, prisma } = makeService();
      prisma.site.findFirst.mockResolvedValue(fakeSite);
      const nav = [{ label: 'Home', href: '/' }];
      const settings = { favicon: 'icon.png' };
      prisma.site.update.mockResolvedValue({ ...fakeSite, navigation: nav, settings });

      await svc.update('user-1', 'site-1', { navigation: nav, settings });

      expect(prisma.site.update).toHaveBeenCalledWith({
        where: { id: 'site-1' },
        data: { navigation: nav, settings },
      });
    });
  });

  // -----------------------------------------------------------------------
  // publish
  // -----------------------------------------------------------------------
  describe('publish', () => {
    it('sets PUBLISHED status, publishedAt, and increments version', async () => {
      const { svc, prisma } = makeService();
      prisma.site.findFirst.mockResolvedValue(fakeSite);
      prisma.site.update.mockResolvedValue({ ...fakeSite, status: 'PUBLISHED' });

      const result = await svc.publish('user-1', 'site-1');

      expect(prisma.site.update).toHaveBeenCalledWith({
        where: { id: 'site-1' },
        data: {
          status: 'PUBLISHED',
          publishedAt: expect.any(Date),
          version: { increment: 1 },
        },
      });
      expect(result.status).toBe('PUBLISHED');
    });
  });

  // -----------------------------------------------------------------------
  // remove
  // -----------------------------------------------------------------------
  describe('remove', () => {
    it('soft-deletes with deletedAt', async () => {
      const { svc, prisma } = makeService();
      prisma.site.findFirst.mockResolvedValue(fakeSite);
      prisma.site.update.mockResolvedValue({ ...fakeSite, deletedAt: new Date() });

      await svc.remove('user-1', 'site-1');

      expect(prisma.site.update).toHaveBeenCalledWith({
        where: { id: 'site-1' },
        data: { deletedAt: expect.any(Date) },
      });
    });
  });
});
