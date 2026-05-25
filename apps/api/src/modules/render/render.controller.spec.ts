import type { Request } from 'express';
import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RenderController } from './render.controller';
import { RenderService } from './render.service';

// ---------------------------------------------------------------------------
// Mock interfaces
// ---------------------------------------------------------------------------

interface MockRenderService {
  getSiteForSlug: jest.Mock;
  getSiteForHostname: jest.Mock;
  getPageBySlug: jest.Mock;
}

interface MockConfigService {
  get: jest.Mock;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockService(): MockRenderService {
  return {
    getSiteForSlug: jest.fn(),
    getSiteForHostname: jest.fn(),
    getPageBySlug: jest.fn(),
  };
}

function mockConfig(): MockConfigService {
  return {
    get: jest.fn(),
  };
}

function makeController() {
  const service = mockService();
  const config = mockConfig();
  const ctrl = new RenderController(
    service as unknown as RenderService,
    config as unknown as ConfigService,
  );
  return { ctrl, service, config };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('RenderController', () => {
  // =========================================================================
  // site
  // =========================================================================

  describe('site', () => {
    it('returns site when slug query param is provided and found', async () => {
      const { ctrl, service } = makeController();
      const expected = { id: 'site-1', slug: 'my-site', pages: [] };
      service.getSiteForSlug.mockResolvedValue(expected);

      const req = { header: jest.fn() } as unknown as Request;
      const result = await ctrl.site(req, 'my-site');

      expect(service.getSiteForSlug).toHaveBeenCalledWith('my-site');
      expect(result).toBe(expected);
    });

    it('throws NotFoundException when slug is provided but site not found', async () => {
      const { ctrl, service } = makeController();
      service.getSiteForSlug.mockResolvedValue(null);

      const req = { header: jest.fn() } as unknown as Request;

      await expect(ctrl.site(req, 'missing')).rejects.toThrow(NotFoundException);
    });

    it('returns site when resolved by hostname from x-forwarded-host header', async () => {
      const { ctrl, service } = makeController();
      const expected = { id: 'site-2', slug: 'host-site', pages: [] };
      service.getSiteForHostname.mockResolvedValue(expected);

      const req = {
        header: jest.fn((name: string) => {
          if (name === 'x-forwarded-host') return 'example.com';
          return undefined;
        }),
      } as unknown as Request;

      const result = await ctrl.site(req, undefined);

      expect(service.getSiteForHostname).toHaveBeenCalledWith('example.com');
      expect(result).toBe(expected);
    });

    it('returns site when resolved by hostname from host header', async () => {
      const { ctrl, service } = makeController();
      const expected = { id: 'site-3', slug: 'host-site', pages: [] };
      service.getSiteForHostname.mockResolvedValue(expected);

      const req = {
        header: jest.fn((name: string) => {
          if (name === 'host') return 'example.com:3000';
          return undefined;
        }),
      } as unknown as Request;

      const result = await ctrl.site(req, undefined);

      expect(service.getSiteForHostname).toHaveBeenCalledWith('example.com');
      expect(result).toBe(expected);
    });

    it('throws NotFoundException when no host header is present', async () => {
      const { ctrl } = makeController();

      const req = {
        header: jest.fn(() => undefined),
      } as unknown as Request;

      await expect(ctrl.site(req, undefined)).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when hostname lookup returns null', async () => {
      const { ctrl, service } = makeController();
      service.getSiteForHostname.mockResolvedValue(null);

      const req = {
        header: jest.fn((name: string) => {
          if (name === 'host') return 'unknown.com';
          return undefined;
        }),
      } as unknown as Request;

      await expect(ctrl.site(req, undefined)).rejects.toThrow(NotFoundException);
    });
  });

  // =========================================================================
  // page
  // =========================================================================

  describe('page', () => {
    it('delegates to render.getPageBySlug', async () => {
      const { ctrl, service } = makeController();
      const expected = { id: 'page-1', slug: 'about', content: [] };
      service.getPageBySlug.mockResolvedValue(expected);

      const result = await ctrl.page('my-site', 'about');

      expect(service.getPageBySlug).toHaveBeenCalledWith('my-site', 'about');
      expect(result).toBe(expected);
    });
  });

  // =========================================================================
  // robots
  // =========================================================================

  describe('robots', () => {
    it('returns robots.txt content with configured domain', async () => {
      const { ctrl, config } = makeController();
      config.get.mockReturnValue('example.com');

      const result = await ctrl.robots('my-site');

      expect(config.get).toHaveBeenCalledWith('web.publicDomain');
      expect(result).toBe(
        'User-agent: *\nAllow: /\nSitemap: https://example.com/my-site/sitemap.xml\n',
      );
    });

    it('falls back to default domain when config returns undefined', async () => {
      const { ctrl, config } = makeController();
      config.get.mockReturnValue(undefined);

      const result = await ctrl.robots('my-site');

      expect(result).toContain('madcreate.madleads.ai');
    });
  });

  // =========================================================================
  // sitemap
  // =========================================================================

  describe('sitemap', () => {
    it('returns XML sitemap with pages', async () => {
      const { ctrl, service, config } = makeController();
      config.get.mockReturnValue('example.com');
      service.getSiteForSlug.mockResolvedValue({
        pages: [
          { slug: 'home' },
          { slug: 'about' },
          { slug: 'contact' },
        ],
      });

      const result = await ctrl.sitemap('my-site');

      expect(service.getSiteForSlug).toHaveBeenCalledWith('my-site');
      expect(result).toContain('<?xml version="1.0"');
      expect(result).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
      // home page should not have trailing slug
      expect(result).toContain('<loc>https://example.com/my-site</loc>');
      // other pages include their slug
      expect(result).toContain('<loc>https://example.com/my-site/about</loc>');
      expect(result).toContain('<loc>https://example.com/my-site/contact</loc>');
    });

    it('throws NotFoundException when site not found', async () => {
      const { ctrl, service } = makeController();
      service.getSiteForSlug.mockResolvedValue(null);

      await expect(ctrl.sitemap('missing')).rejects.toThrow(NotFoundException);
    });
  });
});
