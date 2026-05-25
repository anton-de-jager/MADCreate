import { InternalAdapter } from './internal.adapter';
import { createMockPrisma } from '../../../test/mock-helpers';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fakeSite = (overrides: Record<string, unknown> = {}) => ({
  id: 'site-1',
  name: 'Acme Site',
  status: 'DRAFT',
  version: 2,
  tenantId: 'tenant-1',
  deletedAt: null,
  updatedAt: new Date(),
  ...overrides,
});

function makeAdapter() {
  const prisma = createMockPrisma();
  const adapter = new InternalAdapter(prisma as never);
  return { adapter, prisma };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('InternalAdapter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // Happy path – site found via siteId
  // -------------------------------------------------------------------------

  describe('happy path – siteId lookup', () => {
    it('marks the site as PUBLISHED and bumps its version', async () => {
      const { adapter, prisma } = makeAdapter();
      const site = fakeSite();
      const updatedSite = { ...site, status: 'PUBLISHED', version: 3 };

      prisma.site.findUnique.mockResolvedValue(site);
      prisma.site.update.mockResolvedValue(updatedSite);

      const result = await adapter.deploy({ siteId: 'site-1', tenantId: 'tenant-1', config: {} });

      expect(prisma.site.findUnique).toHaveBeenCalledWith({ where: { id: 'site-1' } });
      expect(prisma.site.update).toHaveBeenCalledWith({
        where: { id: 'site-1' },
        data: {
          status: 'PUBLISHED',
          publishedAt: expect.any(Date),
          version: { increment: 1 },
        },
      });
      expect(result.version).toBe('3');
      expect(result.log).toContain('Published site');
      expect(result.log).toContain('Acme Site');
      expect(result.log).toContain('v3');
      expect(result.artefactUrl).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // Site not found
  // -------------------------------------------------------------------------

  describe('site not found', () => {
    it('returns early with version "0" when siteId yields no result', async () => {
      const { adapter, prisma } = makeAdapter();
      prisma.site.findUnique.mockResolvedValue(null);

      const result = await adapter.deploy({ siteId: 'missing-id', tenantId: 'tenant-1', config: {} });

      expect(result).toEqual({ log: 'No site to deploy', version: '0' });
      expect(prisma.site.update).not.toHaveBeenCalled();
    });

    it('returns early with version "0" when tenantId fallback yields no result', async () => {
      const { adapter, prisma } = makeAdapter();
      prisma.site.findFirst.mockResolvedValue(null);

      const result = await adapter.deploy({ tenantId: 'tenant-1', config: {} });

      expect(result).toEqual({ log: 'No site to deploy', version: '0' });
      expect(prisma.site.update).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // TenantId fallback lookup
  // -------------------------------------------------------------------------

  describe('tenantId fallback lookup', () => {
    it('uses findFirst with tenantId when siteId is not provided', async () => {
      const { adapter, prisma } = makeAdapter();
      const site = fakeSite();
      const updatedSite = { ...site, status: 'PUBLISHED', version: 3 };

      prisma.site.findFirst.mockResolvedValue(site);
      prisma.site.update.mockResolvedValue(updatedSite);

      const result = await adapter.deploy({ tenantId: 'tenant-1', config: {} });

      expect(prisma.site.findFirst).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-1', deletedAt: null },
        orderBy: { updatedAt: 'desc' },
      });
      expect(prisma.site.findUnique).not.toHaveBeenCalled();
      expect(result.version).toBe('3');
      expect(result.log).toContain('Published site');
    });

    it('uses findFirst when siteId is null', async () => {
      const { adapter, prisma } = makeAdapter();
      const site = fakeSite();
      const updatedSite = { ...site, status: 'PUBLISHED', version: 3 };

      prisma.site.findFirst.mockResolvedValue(site);
      prisma.site.update.mockResolvedValue(updatedSite);

      const result = await adapter.deploy({ siteId: null, tenantId: 'tenant-1', config: {} });

      expect(prisma.site.findFirst).toHaveBeenCalled();
      expect(prisma.site.findUnique).not.toHaveBeenCalled();
      expect(result.version).toBe('3');
    });
  });
});
