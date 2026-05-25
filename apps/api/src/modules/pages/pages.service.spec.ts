import { NotFoundException } from '@nestjs/common';
import { PagesService } from './pages.service';
import {
  createMockPrisma,
  createMockTenantsService,
  type PrismaService,
  type TenantsService,
} from '../../test/mock-helpers';

const SITE = { id: 'site-1', tenantId: 'tenant-1' };
const PAGE = {
  id: 'page-1',
  tenantId: 'tenant-1',
  siteId: 'site-1',
  slug: 'home',
  title: 'Home',
  order: 0,
  status: 'DRAFT',
  schema: { sections: [] },
  layoutId: null,
  metaTitle: null,
  metaDescription: null,
  ogImageUrl: null,
  publishedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

function makeService() {
  const prisma = createMockPrisma();
  const tenants = createMockTenantsService();
  tenants.get.mockResolvedValue({ id: 'tenant-1' });
  const svc = new PagesService(
    prisma as unknown as PrismaService,
    tenants as unknown as TenantsService,
  );
  return { svc, prisma, tenants };
}

describe('PagesService', () => {
  // -----------------------------------------------------------------------
  // list
  // -----------------------------------------------------------------------
  describe('list', () => {
    it('returns pages for a site', async () => {
      const { svc, prisma } = makeService();
      prisma.site.findFirst.mockResolvedValue(SITE);
      prisma.page.findMany.mockResolvedValue([PAGE]);

      const result = await svc.list('user-1', 'site-1');

      expect(result).toEqual([PAGE]);
      expect(prisma.site.findFirst).toHaveBeenCalledWith({
        where: { id: 'site-1', deletedAt: null },
      });
      expect(prisma.page.findMany).toHaveBeenCalledWith({
        where: { siteId: 'site-1', deletedAt: null },
        orderBy: { order: 'asc' },
      });
    });

    it('throws NotFoundException when site not found', async () => {
      const { svc, prisma } = makeService();
      prisma.site.findFirst.mockResolvedValue(null);

      await expect(svc.list('user-1', 'missing')).rejects.toThrow(NotFoundException);
    });

    it('calls tenants.get for access check', async () => {
      const { svc, prisma, tenants } = makeService();
      prisma.site.findFirst.mockResolvedValue(SITE);
      prisma.page.findMany.mockResolvedValue([]);

      await svc.list('user-1', 'site-1');

      expect(tenants.get).toHaveBeenCalledWith('user-1', 'tenant-1');
    });
  });

  // -----------------------------------------------------------------------
  // get
  // -----------------------------------------------------------------------
  describe('get', () => {
    it('returns a page', async () => {
      const { svc, prisma } = makeService();
      prisma.page.findFirst.mockResolvedValue(PAGE);

      const result = await svc.get('user-1', 'page-1');

      expect(result).toEqual(PAGE);
    });

    it('throws NotFoundException when page not found', async () => {
      const { svc, prisma } = makeService();
      prisma.page.findFirst.mockResolvedValue(null);

      await expect(svc.get('user-1', 'missing')).rejects.toThrow(NotFoundException);
    });

    it('calls tenants.get for access check', async () => {
      const { svc, prisma, tenants } = makeService();
      prisma.page.findFirst.mockResolvedValue(PAGE);

      await svc.get('user-1', 'page-1');

      expect(tenants.get).toHaveBeenCalledWith('user-1', 'tenant-1');
    });
  });

  // -----------------------------------------------------------------------
  // create
  // -----------------------------------------------------------------------
  describe('create', () => {
    it('creates a page with correct data', async () => {
      const { svc, prisma } = makeService();
      prisma.site.findFirst.mockResolvedValue(SITE);
      prisma.page.create.mockResolvedValue(PAGE);

      const dto = { slug: 'home', title: 'Home' };
      const result = await svc.create('user-1', 'site-1', dto);

      expect(result).toEqual(PAGE);
      expect(prisma.page.create).toHaveBeenCalledWith({
        data: {
          tenantId: 'tenant-1',
          siteId: 'site-1',
          slug: 'home',
          title: 'Home',
          order: 0,
          layoutId: undefined,
          schema: { sections: [] },
        },
      });
    });

    it('passes custom schema and order when provided', async () => {
      const { svc, prisma } = makeService();
      prisma.site.findFirst.mockResolvedValue(SITE);
      prisma.page.create.mockResolvedValue(PAGE);

      const schema = { sections: [{ type: 'hero' }] };
      await svc.create('user-1', 'site-1', {
        slug: 'about',
        title: 'About',
        order: 2,
        schema,
      });

      expect(prisma.page.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ order: 2, schema }),
      });
    });

    it('throws NotFoundException when site not found', async () => {
      const { svc, prisma } = makeService();
      prisma.site.findFirst.mockResolvedValue(null);

      await expect(
        svc.create('user-1', 'missing', { slug: 'x', title: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // -----------------------------------------------------------------------
  // update
  // -----------------------------------------------------------------------
  describe('update', () => {
    it('performs a partial update', async () => {
      const { svc, prisma } = makeService();
      prisma.page.findFirst.mockResolvedValue(PAGE);
      prisma.page.update.mockResolvedValue({ ...PAGE, title: 'Updated' });

      const result = await svc.update('user-1', 'page-1', { title: 'Updated' });

      expect(result.title).toBe('Updated');
      expect(prisma.page.update).toHaveBeenCalledWith({
        where: { id: 'page-1' },
        data: { title: 'Updated', schema: undefined },
      });
    });

    it('casts schema to InputJsonValue when provided', async () => {
      const { svc, prisma } = makeService();
      prisma.page.findFirst.mockResolvedValue(PAGE);
      prisma.page.update.mockResolvedValue(PAGE);

      const schema = { sections: [{ type: 'hero' }] };
      await svc.update('user-1', 'page-1', { schema });

      expect(prisma.page.update).toHaveBeenCalledWith({
        where: { id: 'page-1' },
        data: expect.objectContaining({ schema }),
      });
    });
  });

  // -----------------------------------------------------------------------
  // publish
  // -----------------------------------------------------------------------
  describe('publish', () => {
    it('sets PUBLISHED status and publishedAt', async () => {
      const { svc, prisma } = makeService();
      prisma.page.findFirst.mockResolvedValue(PAGE);
      prisma.page.update.mockResolvedValue({ ...PAGE, status: 'PUBLISHED' });

      const result = await svc.publish('user-1', 'page-1');

      expect(result.status).toBe('PUBLISHED');
      expect(prisma.page.update).toHaveBeenCalledWith({
        where: { id: 'page-1' },
        data: { status: 'PUBLISHED', publishedAt: expect.any(Date) },
      });
    });
  });

  // -----------------------------------------------------------------------
  // remove
  // -----------------------------------------------------------------------
  describe('remove', () => {
    it('soft-deletes with deletedAt', async () => {
      const { svc, prisma } = makeService();
      prisma.page.findFirst.mockResolvedValue(PAGE);
      prisma.page.update.mockResolvedValue({ ...PAGE, deletedAt: new Date() });

      await svc.remove('user-1', 'page-1');

      expect(prisma.page.update).toHaveBeenCalledWith({
        where: { id: 'page-1' },
        data: { deletedAt: expect.any(Date) },
      });
    });
  });
});
