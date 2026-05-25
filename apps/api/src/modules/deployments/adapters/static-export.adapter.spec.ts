import * as nodefs from 'node:fs';
import { StaticExportAdapter, renderPage } from './static-export.adapter';
import { createMockPrisma } from '../../../test/mock-helpers';

// ---------------------------------------------------------------------------
// fs mock – avoid real disk I/O
// ---------------------------------------------------------------------------

jest.mock('node:fs', () => ({
  promises: {
    mkdir: jest.fn().mockResolvedValue(undefined),
    writeFile: jest.fn().mockResolvedValue(undefined),
  },
}));

const mockFs = (nodefs as jest.Mocked<typeof nodefs>).promises as jest.Mocked<typeof nodefs.promises>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fakeTenant = {
  id: 'tenant-1',
  slug: 'acme',
  branding: {
    primaryColor: '#ff0000',
    secondaryColor: '#00ff00',
    backgroundColor: '#ffffff',
    textColor: '#000000',
    fontFamily: 'Arial, sans-serif',
  },
};

const fakePage = (overrides: Record<string, unknown> = {}) => ({
  id: 'page-1',
  slug: 'home',
  title: 'Home Page',
  metaTitle: 'Home | Acme',
  metaDescription: 'Welcome to Acme',
  ogImageUrl: 'https://example.com/og.png',
  deletedAt: null,
  schema: {
    sections: [
      {
        kind: 'hero',
        props: {
          heading: 'Welcome to Acme',
          subheading: 'We build great products',
          ctaLabel: 'Get Started',
          ctaUrl: '/start',
        },
      },
    ],
  },
  ...overrides,
});

const fakeSite = (pages: ReturnType<typeof fakePage>[] = [fakePage()]) => ({
  id: 'site-1',
  name: 'Acme Site',
  pages,
});

function makeAdapter() {
  const prisma = createMockPrisma();
  const adapter = new StaticExportAdapter(prisma as never);
  return { adapter, prisma };
}

// ---------------------------------------------------------------------------
// Tests: deploy()
// ---------------------------------------------------------------------------

describe('StaticExportAdapter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('deploy – early returns', () => {
    it('returns "No site" when tenant not found', async () => {
      const { adapter, prisma } = makeAdapter();
      prisma.tenant.findUnique.mockResolvedValue(null);
      prisma.site.findFirst.mockResolvedValue(null);

      const result = await adapter.deploy({ tenantId: 'tenant-1', config: {} });

      expect(result).toEqual({ log: 'No site' });
      expect(mockFs.writeFile).not.toHaveBeenCalled();
    });

    it('returns "No site" when site not found', async () => {
      const { adapter, prisma } = makeAdapter();
      prisma.tenant.findUnique.mockResolvedValue(fakeTenant);
      prisma.site.findFirst.mockResolvedValue(null);

      const result = await adapter.deploy({ tenantId: 'tenant-1', config: {} });

      expect(result).toEqual({ log: 'No site' });
      expect(mockFs.writeFile).not.toHaveBeenCalled();
    });
  });

  describe('deploy – happy path', () => {
    it('creates output directory and writes one HTML file per page', async () => {
      const { adapter, prisma } = makeAdapter();
      prisma.tenant.findUnique.mockResolvedValue(fakeTenant);
      prisma.site.findFirst.mockResolvedValue(fakeSite());

      const result = await adapter.deploy({
        tenantId: 'tenant-1',
        config: { outputDir: '/tmp/test-export' },
      });

      expect(mockFs.mkdir).toHaveBeenCalledWith('/tmp/test-export', { recursive: true });
      expect(mockFs.writeFile).toHaveBeenCalledTimes(1);

      const [filePath, content] = mockFs.writeFile.mock.calls[0] as [string, string, string];
      expect(filePath.replace(/\\/g, '/')).toBe('/tmp/test-export/home.html');
      expect(content).toContain('<!DOCTYPE html>');
      expect(result.log).toContain('Exported 1 pages');
      expect(result.artefactUrl).toContain('file://');
    });

    it('uses siteId lookup when siteId is provided', async () => {
      const { adapter, prisma } = makeAdapter();
      prisma.tenant.findUnique.mockResolvedValue(fakeTenant);
      prisma.site.findUnique.mockResolvedValue(fakeSite());

      await adapter.deploy({
        tenantId: 'tenant-1',
        siteId: 'site-1',
        config: { outputDir: '/tmp/test-export' },
      });

      expect(prisma.site.findUnique).toHaveBeenCalledWith({
        where: { id: 'site-1' },
        include: { pages: { where: { deletedAt: null } } },
      });
      expect(prisma.site.findFirst).not.toHaveBeenCalled();
    });

    it('falls back to findFirst when siteId is not provided', async () => {
      const { adapter, prisma } = makeAdapter();
      prisma.tenant.findUnique.mockResolvedValue(fakeTenant);
      prisma.site.findFirst.mockResolvedValue(fakeSite());

      await adapter.deploy({ tenantId: 'tenant-1', config: { outputDir: '/tmp/test-export' } });

      expect(prisma.site.findFirst).toHaveBeenCalled();
      expect(prisma.site.findUnique).not.toHaveBeenCalled();
    });

    it('uses index.html for pages with empty slug', async () => {
      const { adapter, prisma } = makeAdapter();
      prisma.tenant.findUnique.mockResolvedValue(fakeTenant);
      prisma.site.findFirst.mockResolvedValue(fakeSite([fakePage({ slug: '' })]));

      await adapter.deploy({ tenantId: 'tenant-1', config: { outputDir: '/tmp/test-export' } });

      const [filePath] = mockFs.writeFile.mock.calls[0] as [string, string, string];
      expect(filePath.replace(/\\/g, '/')).toBe('/tmp/test-export/index.html');
    });

    it('handles pages with no sections gracefully', async () => {
      const { adapter, prisma } = makeAdapter();
      prisma.tenant.findUnique.mockResolvedValue(fakeTenant);
      prisma.site.findFirst.mockResolvedValue(fakeSite([fakePage({ schema: {} })]));

      await adapter.deploy({ tenantId: 'tenant-1', config: { outputDir: '/tmp/test-export' } });

      const [, content] = mockFs.writeFile.mock.calls[0] as [string, string, string];
      expect(content).toContain('No content yet');
    });

    it('handles tenant with no branding', async () => {
      const { adapter, prisma } = makeAdapter();
      prisma.tenant.findUnique.mockResolvedValue({ ...fakeTenant, branding: null });
      prisma.site.findFirst.mockResolvedValue(fakeSite());

      await expect(
        adapter.deploy({ tenantId: 'tenant-1', config: { outputDir: '/tmp/test-export' } }),
      ).resolves.not.toThrow();
    });

    it('exports multiple pages', async () => {
      const { adapter, prisma } = makeAdapter();
      prisma.tenant.findUnique.mockResolvedValue(fakeTenant);
      prisma.site.findFirst.mockResolvedValue(
        fakeSite([fakePage({ slug: 'home' }), fakePage({ slug: 'about', id: 'page-2' })]),
      );

      const result = await adapter.deploy({
        tenantId: 'tenant-1',
        config: { outputDir: '/tmp/test-export' },
      });

      expect(mockFs.writeFile).toHaveBeenCalledTimes(2);
      expect(result.log).toContain('Exported 2 pages');
    });
  });

  // ---------------------------------------------------------------------------
  // Tests: renderPage()
  // ---------------------------------------------------------------------------

  describe('renderPage()', () => {
    const baseOpts = {
      title: 'Test Page',
      description: 'A test',
      ogImageUrl: '',
      siteName: 'Test Site',
      schema: {},
      brandKit: {},
    };

    it('produces a valid HTML5 document', () => {
      const html = renderPage(baseOpts);
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html lang="en">');
      expect(html).toContain('</html>');
    });

    it('includes charset and viewport meta tags', () => {
      const html = renderPage(baseOpts);
      expect(html).toContain('<meta charset="utf-8">');
      expect(html).toContain('<meta name="viewport"');
    });

    it('sets the <title> from the title option', () => {
      const html = renderPage({ ...baseOpts, title: 'My Page Title' });
      expect(html).toContain('<title>My Page Title</title>');
    });

    it('escapes HTML in title', () => {
      const html = renderPage({ ...baseOpts, title: '<script>alert(1)</script>' });
      expect(html).toContain('&lt;script&gt;');
      expect(html).not.toContain('<script>alert');
    });

    it('sets meta description', () => {
      const html = renderPage({ ...baseOpts, description: 'Great description' });
      expect(html).toContain('content="Great description"');
    });

    it('includes og:image when ogImageUrl is provided', () => {
      const html = renderPage({ ...baseOpts, ogImageUrl: 'https://example.com/img.png' });
      expect(html).toContain('og:image');
      expect(html).toContain('https://example.com/img.png');
    });

    it('omits og:image when ogImageUrl is empty', () => {
      const html = renderPage({ ...baseOpts, ogImageUrl: '' });
      expect(html).not.toContain('og:image');
    });

    it('embeds brand colors in a <style> block', () => {
      const html = renderPage({
        ...baseOpts,
        brandKit: { primaryColor: '#abcdef', fontFamily: 'Georgia' },
      });
      expect(html).toContain('<style>');
      expect(html).toContain('#abcdef');
      expect(html).toContain('Georgia');
    });

    it('renders hero section', () => {
      const html = renderPage({
        ...baseOpts,
        schema: {
          sections: [
            {
              kind: 'hero',
              props: { heading: 'Big Headline', subheading: 'Tagline', ctaLabel: 'Click Me', ctaUrl: '/go' },
            },
          ],
        },
      });
      expect(html).toContain('section-hero');
      expect(html).toContain('<h1>Big Headline</h1>');
      expect(html).toContain('Tagline');
      expect(html).toContain('Click Me');
    });

    it('renders features section with items', () => {
      const html = renderPage({
        ...baseOpts,
        schema: {
          sections: [
            {
              kind: 'features',
              props: {
                heading: 'Our Features',
                items: [
                  { title: 'Fast', description: 'Very fast' },
                  { title: 'Reliable', description: 'Rock solid' },
                ],
              },
            },
          ],
        },
      });
      expect(html).toContain('section-features');
      expect(html).toContain('Our Features');
      expect(html).toContain('Fast');
      expect(html).toContain('Very fast');
      expect(html).toContain('Reliable');
    });

    it('renders cta section', () => {
      const html = renderPage({
        ...baseOpts,
        schema: {
          sections: [
            {
              kind: 'cta',
              props: { heading: 'Join Us', ctaLabel: 'Sign Up', ctaUrl: '/signup' },
            },
          ],
        },
      });
      expect(html).toContain('section-cta');
      expect(html).toContain('Join Us');
      expect(html).toContain('Sign Up');
    });

    it('renders faq section with items', () => {
      const html = renderPage({
        ...baseOpts,
        schema: {
          sections: [
            {
              kind: 'faq',
              props: {
                heading: 'Questions',
                items: [{ question: 'What?', answer: 'This.' }],
              },
            },
          ],
        },
      });
      expect(html).toContain('section-faq');
      expect(html).toContain('Questions');
      expect(html).toContain('What?');
      expect(html).toContain('This.');
    });

    it('renders text section', () => {
      const html = renderPage({
        ...baseOpts,
        schema: {
          sections: [{ kind: 'text', props: { heading: 'About', body: 'We are great.' } }],
        },
      });
      expect(html).toContain('section-text');
      expect(html).toContain('About');
      expect(html).toContain('We are great.');
    });

    it('renders generic section for unknown kinds', () => {
      const html = renderPage({
        ...baseOpts,
        schema: {
          sections: [{ kind: 'pricing', props: { heading: 'Plans', description: 'Choose a plan.' } }],
        },
      });
      expect(html).toContain('section-generic');
      expect(html).toContain('data-kind="pricing"');
      expect(html).toContain('Plans');
    });

    it('uses type field as fallback when kind is absent', () => {
      const html = renderPage({
        ...baseOpts,
        schema: {
          sections: [{ type: 'hero', props: { heading: 'Hello' } }],
        },
      });
      expect(html).toContain('section-hero');
    });

    it('renders placeholder when schema has no sections', () => {
      const html = renderPage({ ...baseOpts, schema: {} });
      expect(html).toContain('No content yet');
    });

    it('renders placeholder when sections array is empty', () => {
      const html = renderPage({ ...baseOpts, schema: { sections: [] } });
      expect(html).toContain('No content yet');
    });
  });
});
