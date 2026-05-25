import { BadRequestException } from '@nestjs/common';
import { SiteApplicatorService, GeneratedSite } from './site-applicator.service';
import { SiteStatus, PageStatus } from '@prisma/client';
import { createMockPrisma, type PrismaService } from '../../test/mock-helpers';

// parse() is pure -- no DB or DI needed. We instantiate with a mock Prisma
// since apply() is the only branch that touches it.
function makeApplicator(): SiteApplicatorService {
  return new SiteApplicatorService(createMockPrisma() as unknown as PrismaService);
}

/** Build a mock PrismaService whose $transaction executes the callback with mock tx. */
function makeMockPrismaWithTx() {
  const tx = {
    tenant: { update: jest.fn().mockResolvedValue({}) },
    theme:  {
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      create: jest.fn().mockResolvedValue({ id: 'theme-1' }),
    },
    site: {
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      create: jest.fn().mockResolvedValue({ id: 'site-1' }),
    },
    page: {
      create: jest.fn().mockImplementation(({ data }: { data: { slug: string } }) =>
        Promise.resolve({ id: `page-${data.slug}`, slug: data.slug }),
      ),
    },
    section: { createMany: jest.fn().mockResolvedValue({ count: 2 }) },
  };

  const prisma = createMockPrisma();
  prisma.$transaction.mockImplementation((cb: (t: typeof tx) => Promise<unknown>) => cb(tx));
  prisma.$disconnect.mockResolvedValue(undefined);
  prisma.$connect.mockResolvedValue(undefined);

  return { prisma, tx };
}

const validSpec: GeneratedSite = {
  brandKit: {
    name: 'Acme',
    tagline: 'We ship.',
    mission: 'To ship things.',
    voice: 'confident, calm',
    logoConcept: 'Two interlocking circles.',
    colors: { primary: '#7C5CFF', secondary: '#0EA5E9', accent: '#F472B6', background: '#0B0B12', surface: '#13131C', foreground: '#FAFAFA', muted: '#9CA3AF' },
    typography: { headingFamily: 'Inter', bodyFamily: 'Inter', headingWeights: [600, 800], bodyWeights: [400, 500] },
  },
  site: {
    name: 'Acme Site',
    navigation: { items: [{ label: 'Home', href: '/' }] },
    settings: { metaTitle: 'Acme', metaDescription: 'Acme description' },
    pages: [
      {
        slug: 'home',
        title: 'Home',
        metaTitle: 'Home — Acme',
        metaDescription: 'Welcome.',
        sections: [
          { kind: 'hero',     props: { heading: 'Hi', subheading: 'Welcome.', primaryCta: { label: 'Go', href: '/' } } },
          { kind: 'features', props: { heading: 'Why', items: [{ title: 'Fast', body: 'Speed.' }] } },
        ],
      },
    ],
  },
};

describe('SiteApplicatorService.parse', () => {
  let svc: SiteApplicatorService;
  beforeEach(() => { svc = makeApplicator(); });

  it('accepts a plain object spec', () => {
    expect(() => svc.parse(validSpec)).not.toThrow();
    expect(svc.parse(validSpec).brandKit.name).toBe('Acme');
  });

  it('accepts a raw JSON string', () => {
    const raw = JSON.stringify(validSpec);
    const parsed = svc.parse(raw);
    expect(parsed.brandKit.name).toBe('Acme');
    expect(parsed.site.pages.length).toBe(1);
  });

  it('strips a ```json fenced code block', () => {
    const fenced = '```json\n' + JSON.stringify(validSpec) + '\n```';
    expect(() => svc.parse(fenced)).not.toThrow();
  });

  it('strips a generic ``` fenced block', () => {
    const fenced = '```\n' + JSON.stringify(validSpec) + '\n```';
    expect(() => svc.parse(fenced)).not.toThrow();
  });

  it('tolerates leading + trailing whitespace around a fence', () => {
    const fenced = '   \n\n```json\n' + JSON.stringify(validSpec) + '\n```\n   ';
    expect(() => svc.parse(fenced)).not.toThrow();
  });

  it('throws BadRequest on malformed JSON', () => {
    expect(() => svc.parse('{ this is not json'))
      .toThrow(BadRequestException);
  });

  it('throws BadRequest when input is not an object', () => {
    expect(() => svc.parse('"a string"')).toThrow(BadRequestException);
    expect(() => svc.parse('42')).toThrow(BadRequestException);
    expect(() => svc.parse('null')).toThrow(BadRequestException);
  });

  it('throws BadRequest when brandKit is missing', () => {
    const bad: object = { ...validSpec, brandKit: undefined };
    expect(() => svc.parse(bad)).toThrow(/brandKit/);
  });

  it('throws BadRequest when site is missing', () => {
    const bad: object = { ...validSpec, site: undefined };
    expect(() => svc.parse(bad)).toThrow(/site/);
  });

  it('throws BadRequest when brandKit.colors is not an object', () => {
    const bad = JSON.parse(JSON.stringify(validSpec)) as Record<string, Record<string, unknown>>;
    bad.brandKit.colors = null as unknown as Record<string, unknown>;
    expect(() => svc.parse(bad as object)).toThrow(/colors/);
  });

  it('throws BadRequest when site.navigation.items is missing', () => {
    const bad = JSON.parse(JSON.stringify(validSpec)) as Record<string, Record<string, unknown>>;
    delete bad.site.navigation;
    expect(() => svc.parse(bad as object)).toThrow(/navigation/);
  });

  it('throws BadRequest when pages is empty', () => {
    const bad = JSON.parse(JSON.stringify(validSpec)) as Record<string, Record<string, unknown>>;
    bad.site.pages = [];
    expect(() => svc.parse(bad as object)).toThrow(/pages/);
  });

  it('throws BadRequest when a page has no slug', () => {
    const bad = JSON.parse(JSON.stringify(validSpec)) as Record<string, Record<string, Array<Record<string, unknown>>>>;
    delete bad.site.pages[0].slug;
    expect(() => svc.parse(bad as object)).toThrow(/slug/);
  });

  it('throws BadRequest when a section lacks kind', () => {
    const bad = JSON.parse(JSON.stringify(validSpec)) as Record<string, Record<string, Array<Record<string, Array<Record<string, unknown>>>>>>;
    delete bad.site.pages[0].sections[0].kind;
    expect(() => svc.parse(bad as object)).toThrow(/kind/);
  });

  it('throws BadRequest when a section lacks props', () => {
    const bad = JSON.parse(JSON.stringify(validSpec)) as Record<string, Record<string, Array<Record<string, Array<Record<string, unknown>>>>>>;
    delete bad.site.pages[0].sections[0].props;
    expect(() => svc.parse(bad as object)).toThrow(/props/);
  });

  it('throws a friendly message naming the missing brandKit field', () => {
    const bad = JSON.parse(JSON.stringify(validSpec)) as Record<string, Record<string, unknown>>;
    delete bad.brandKit.tagline;
    expect(() => svc.parse(bad as object)).toThrow(/tagline/);
  });
});

describe('SiteApplicatorService.apply', () => {
  const tenantId = 'tenant-42';
  const spec: GeneratedSite = validSpec;

  it('creates theme, site, pages and sections in a transaction', async () => {
    const { prisma, tx } = makeMockPrismaWithTx();
    const svc = new SiteApplicatorService(prisma as unknown as PrismaService);

    const result = await svc.apply(tenantId, spec);

    // Transaction was invoked.
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);

    // Tenant branding updated.
    expect(tx.tenant.update).toHaveBeenCalledTimes(1);
    const tenantArg = tx.tenant.update.mock.calls[0][0];
    expect(tenantArg.where).toEqual({ id: tenantId });
    expect(tenantArg.data.branding.colors).toEqual(spec.brandKit.colors);
    expect(tenantArg.data.branding.typography).toEqual(spec.brandKit.typography);

    // Old themes deactivated, new theme created.
    expect(tx.theme.updateMany).toHaveBeenCalledTimes(1);
    const themeUpdateArg = tx.theme.updateMany.mock.calls[0][0];
    expect(themeUpdateArg.where).toEqual({ tenantId, isActive: true });
    expect(themeUpdateArg.data).toEqual({ isActive: false });

    expect(tx.theme.create).toHaveBeenCalledTimes(1);
    const themeCreateArg = tx.theme.create.mock.calls[0][0];
    expect(themeCreateArg.data.tenantId).toBe(tenantId);
    expect(themeCreateArg.data.name).toBe('Acme');
    expect(themeCreateArg.data.isActive).toBe(true);

    // Old sites soft-deleted.
    expect(tx.site.updateMany).toHaveBeenCalledTimes(1);
    const siteUpdateArg = tx.site.updateMany.mock.calls[0][0];
    expect(siteUpdateArg.where.tenantId).toBe(tenantId);
    expect(siteUpdateArg.where.deletedAt).toBeNull();
    expect(siteUpdateArg.data.status).toBe(SiteStatus.DRAFT);

    // New site created with correct themeId.
    expect(tx.site.create).toHaveBeenCalledTimes(1);
    const siteCreateArg = tx.site.create.mock.calls[0][0];
    expect(siteCreateArg.data.tenantId).toBe(tenantId);
    expect(siteCreateArg.data.themeId).toBe('theme-1');
    expect(siteCreateArg.data.name).toBe('Acme Site');
    expect(siteCreateArg.data.status).toBe(SiteStatus.PUBLISHED);

    // Page created for each spec page.
    expect(tx.page.create).toHaveBeenCalledTimes(spec.site.pages.length);
    const pageCreateArg = tx.page.create.mock.calls[0][0];
    expect(pageCreateArg.data.tenantId).toBe(tenantId);
    expect(pageCreateArg.data.siteId).toBe('site-1');
    expect(pageCreateArg.data.slug).toBe('home');
    expect(pageCreateArg.data.status).toBe(PageStatus.PUBLISHED);

    // Sections bulk-inserted.
    expect(tx.section.createMany).toHaveBeenCalledTimes(1);
    const sectionData = tx.section.createMany.mock.calls[0][0].data;
    expect(sectionData.length).toBe(2); // hero + features
    expect(sectionData[0].kind).toBe('hero');
    expect(sectionData[0].order).toBe(0);
    expect(sectionData[0].tenantId).toBe(tenantId);
    expect(sectionData[1].kind).toBe('features');
    expect(sectionData[1].order).toBe(1);
    expect(sectionData[1].tenantId).toBe(tenantId);

    // Return value.
    expect(result).toEqual({ siteId: 'site-1', themeId: 'theme-1', pageCount: 1 });
  });

  it('retries once on P1017 (stale connection)', async () => {
    const { prisma, tx } = makeMockPrismaWithTx();
    let callCount = 0;
    prisma.$transaction.mockImplementation((cb: (t: typeof tx) => Promise<unknown>) => {
      callCount++;
      if (callCount === 1) {
        const err = new Error('server closed the connection') as Error & { code: string };
        err.code = 'P1017';
        return Promise.reject(err);
      }
      return cb(tx);
    });

    const svc = new SiteApplicatorService(prisma as unknown as PrismaService);
    const result = await svc.apply(tenantId, spec);

    expect(prisma.$disconnect).toHaveBeenCalledTimes(1);
    expect(prisma.$connect).toHaveBeenCalledTimes(1);
    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
    expect(result.siteId).toBe('site-1');
  });

  it('throws non-P1017 errors without retrying', async () => {
    const { prisma } = makeMockPrismaWithTx();
    prisma.$transaction.mockRejectedValue(new Error('unique constraint'));

    const svc = new SiteApplicatorService(prisma as unknown as PrismaService);
    try {
      await svc.apply(tenantId, spec);
      fail('Expected apply() to throw');
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      expect(error.message).toBe('unique constraint');
    }
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.$disconnect).not.toHaveBeenCalled();
  });

  it('skips section.createMany when there are no sections', async () => {
    const { prisma, tx } = makeMockPrismaWithTx();
    const noSections: GeneratedSite = JSON.parse(JSON.stringify(validSpec));
    noSections.site.pages[0].sections = [];

    const svc = new SiteApplicatorService(prisma as unknown as PrismaService);
    await svc.apply(tenantId, noSections);

    expect(tx.section.createMany).not.toHaveBeenCalled();
  });
});
