import { NotFoundException } from '@nestjs/common';
import { RenderService } from './render.service';
import { createMockPrisma, type PrismaService } from '../../test/mock-helpers';
import type { DomainsService } from '../domains/domains.service';

function createMockDomainsService() {
  return { resolveByHostname: jest.fn() };
}

function makeService() {
  const prisma = createMockPrisma();
  const domains = createMockDomainsService();
  const svc = new RenderService(prisma as unknown as PrismaService, domains as unknown as DomainsService);
  return { svc, prisma, domains };
}

const fakeTenant = {
  id: 'tenant-1',
  slug: 'acme',
  name: 'Acme',
  sites: [
    {
      theme: { tokens: { colors: { primary: '#000' } } },
      navigation: { items: [] },
      settings: { metaTitle: 'Acme' },
      pages: [
        { slug: 'home', title: 'Home', metaTitle: null, metaDescription: null, schema: { sections: [] } },
        { slug: 'about', title: 'About', metaTitle: 'About Us', metaDescription: 'About page', schema: { sections: [] } },
      ],
    },
  ],
};

describe('RenderService', () => {
  // ---------------------------------------------------------------------------
  // getSiteForSlug
  // ---------------------------------------------------------------------------
  describe('getSiteForSlug', () => {
    it('returns RenderedSite with tenant, theme, navigation, settings, pages', async () => {
      const { svc, prisma } = makeService();
      prisma.tenant.findFirst.mockResolvedValue(fakeTenant);

      const result = await svc.getSiteForSlug('acme');

      expect(result).not.toBeNull();
      expect(result!.tenant).toEqual({ id: 'tenant-1', slug: 'acme', name: 'Acme' });
      expect(result!.theme).toEqual({ colors: { primary: '#000' } });
      expect(result!.navigation).toEqual({ items: [] });
      expect(result!.settings).toEqual({ metaTitle: 'Acme' });
      expect(result!.pages).toHaveLength(2);
      expect(result!.pages[0].slug).toBe('home');
      expect(result!.pages[1].slug).toBe('about');
    });

    it('returns null when tenant not found', async () => {
      const { svc, prisma } = makeService();
      prisma.tenant.findFirst.mockResolvedValue(null);

      const result = await svc.getSiteForSlug('unknown');

      expect(result).toBeNull();
    });

    it('returns null when no published site exists', async () => {
      const { svc, prisma } = makeService();
      prisma.tenant.findFirst.mockResolvedValue({ id: 'tenant-1', slug: 'acme', name: 'Acme', sites: [] });

      const result = await svc.getSiteForSlug('acme');

      expect(result).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // getSiteForHostname
  // ---------------------------------------------------------------------------
  describe('getSiteForHostname', () => {
    it('resolves hostname via domains service and delegates to getSiteForSlug', async () => {
      const { svc, prisma, domains } = makeService();
      domains.resolveByHostname.mockResolvedValue({ tenant: { slug: 'acme' } });
      prisma.tenant.findFirst.mockResolvedValue(fakeTenant);

      const result = await svc.getSiteForHostname('acme.example.com');

      expect(domains.resolveByHostname).toHaveBeenCalledWith('acme.example.com');
      expect(result).not.toBeNull();
      expect(result!.tenant.slug).toBe('acme');
    });

    it('returns null when domain not resolved', async () => {
      const { svc, domains } = makeService();
      domains.resolveByHostname.mockResolvedValue(null);

      const result = await svc.getSiteForHostname('unknown.example.com');

      expect(result).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // getPageBySlug
  // ---------------------------------------------------------------------------
  describe('getPageBySlug', () => {
    it('returns site and matching page', async () => {
      const { svc, prisma } = makeService();
      prisma.tenant.findFirst.mockResolvedValue(fakeTenant);

      const { site, page } = await svc.getPageBySlug('acme', 'about');

      expect(site.tenant.slug).toBe('acme');
      expect(page.slug).toBe('about');
      expect(page.metaTitle).toBe('About Us');
    });

    it('falls back to home page when slug does not match', async () => {
      const { svc, prisma } = makeService();
      prisma.tenant.findFirst.mockResolvedValue(fakeTenant);

      const { page } = await svc.getPageBySlug('acme', 'nonexistent');

      expect(page.slug).toBe('home');
    });

    it('throws NotFoundException when site not found', async () => {
      const { svc, prisma } = makeService();
      prisma.tenant.findFirst.mockResolvedValue(null);

      await expect(svc.getPageBySlug('unknown', 'home')).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when no pages exist', async () => {
      const { svc, prisma } = makeService();
      prisma.tenant.findFirst.mockResolvedValue({
        ...fakeTenant,
        sites: [{ ...fakeTenant.sites[0], pages: [] }],
      });

      await expect(svc.getPageBySlug('acme', 'home')).rejects.toThrow(NotFoundException);
    });
  });
});
