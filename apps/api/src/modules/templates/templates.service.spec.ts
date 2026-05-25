import { NotFoundException, BadRequestException } from '@nestjs/common';
import { TemplatesService } from './templates.service';
import { createMockPrisma, type MockDelegate, type PrismaService } from '../../test/mock-helpers';

function makeService() {
  const prisma = createMockPrisma();
  const svc = new TemplatesService(prisma as unknown as PrismaService);
  const template = prisma.template;
  return { svc, prisma, template };
}

const mockTemplate = {
  id: 'tpl-1',
  slug: 'starter',
  name: 'Starter Template',
  category: 'business',
  industry: 'tech',
  visibility: 'PUBLIC',
  popularity: 5,
  schema: {
    name: 'Test',
    pages: [
      { slug: 'home', title: 'Home', sections: [{ kind: 'hero', props: {} }] },
    ],
  },
};

describe('TemplatesService', () => {
  // -----------------------------------------------------------------------
  // listPublic
  // -----------------------------------------------------------------------
  describe('listPublic', () => {
    it('calls findMany with PUBLIC visibility and returns results', async () => {
      const { svc, template } = makeService();
      template.findMany.mockResolvedValue([mockTemplate]);

      const result = await svc.listPublic({});

      expect(result).toEqual([mockTemplate]);
      expect(template.findMany).toHaveBeenCalledTimes(1);
      const where = template.findMany.mock.calls[0][0].where;
      expect(where.visibility).toBe('PUBLIC');
      expect(where.deletedAt).toBeNull();
    });

    it('passes category, industry, and search filters', async () => {
      const { svc, template } = makeService();
      template.findMany.mockResolvedValue([]);

      await svc.listPublic({ category: 'business', industry: 'tech', search: 'land' });

      const args = template.findMany.mock.calls[0][0];
      expect(args.where.category).toBe('business');
      expect(args.where.industry).toBe('tech');
      expect(args.where.OR).toEqual([
        { name: { contains: 'land' } },
        { description: { contains: 'land' } },
      ]);
    });
  });

  // -----------------------------------------------------------------------
  // get
  // -----------------------------------------------------------------------
  describe('get', () => {
    it('returns template by slug', async () => {
      const { svc, template } = makeService();
      template.findUnique.mockResolvedValue(mockTemplate);

      const result = await svc.get('starter');

      expect(result).toEqual(mockTemplate);
      expect(template.findUnique).toHaveBeenCalledWith({ where: { slug: 'starter' } });
    });

    it('throws NotFoundException when template not found', async () => {
      const { svc, template } = makeService();
      template.findUnique.mockResolvedValue(null);

      await expect(svc.get('missing')).rejects.toThrow(NotFoundException);
    });
  });

  // -----------------------------------------------------------------------
  // instantiate
  // -----------------------------------------------------------------------
  describe('instantiate', () => {
    function setupInstantiate(
      prisma: ReturnType<typeof createMockPrisma>,
      template: MockDelegate,
    ) {
      prisma.tenant.findUnique.mockResolvedValue({ id: 'tenant-1' });
      template.findUnique.mockResolvedValue(mockTemplate);
      prisma.$transaction.mockImplementation(async (fn: Function) => {
        const tx = {
          site: {
            create: jest.fn().mockResolvedValue({ id: 'site-1' }),
            findUnique: jest.fn().mockResolvedValue({ id: 'site-1', pages: [] }),
          },
          page: { create: jest.fn().mockResolvedValue({}) },
          template: { update: jest.fn().mockResolvedValue({}) },
        };
        return fn(tx);
      });
    }

    it('creates site and pages in transaction and increments popularity', async () => {
      const { svc, prisma, template } = makeService();
      setupInstantiate(prisma, template);

      const result = await svc.instantiate('tenant-1', 'starter');

      expect(result).toEqual({ id: 'site-1', pages: [] });
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);

      // Re-run the transaction callback with fresh spies to verify calls
      const txFn = prisma.$transaction.mock.calls[0][0];
      const tx = {
        site: {
          create: jest.fn().mockResolvedValue({ id: 'site-1' }),
          findUnique: jest.fn().mockResolvedValue({ id: 'site-1', pages: [] }),
        },
        page: { create: jest.fn().mockResolvedValue({}) },
        template: { update: jest.fn().mockResolvedValue({}) },
      };
      await txFn(tx);

      expect(tx.site.create).toHaveBeenCalledTimes(1);
      expect(tx.page.create).toHaveBeenCalledTimes(1);
      expect(tx.template.update).toHaveBeenCalledWith({
        where: { id: 'tpl-1' },
        data: { popularity: { increment: 1 } },
      });
    });

    it('throws NotFoundException for missing tenant', async () => {
      const { svc, prisma } = makeService();
      prisma.tenant.findUnique.mockResolvedValue(null);

      await expect(svc.instantiate('bad-tenant', 'starter')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException for missing template', async () => {
      const { svc, prisma, template } = makeService();
      prisma.tenant.findUnique.mockResolvedValue({ id: 'tenant-1' });
      template.findUnique.mockResolvedValue(null);

      await expect(svc.instantiate('tenant-1', 'missing')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws BadRequestException when schema has no pages', async () => {
      const { svc, prisma, template } = makeService();
      prisma.tenant.findUnique.mockResolvedValue({ id: 'tenant-1' });
      template.findUnique.mockResolvedValue({
        ...mockTemplate,
        schema: { name: 'Empty', pages: [] },
      });

      await expect(svc.instantiate('tenant-1', 'starter')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
