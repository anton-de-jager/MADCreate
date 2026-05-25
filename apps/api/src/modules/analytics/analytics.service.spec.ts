import { AnalyticsEventKind } from '@prisma/client';
import { AnalyticsService } from './analytics.service';
import {
  createMockPrisma,
  createMockTenantsService,
  type PrismaService,
  type TenantsService,
} from '../../test/mock-helpers';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeService() {
  const prisma = createMockPrisma();
  const tenants = createMockTenantsService();
  tenants.get.mockResolvedValue({ id: 'tenant-1', workspaceId: 'ws-1' });

  const ae = prisma.analyticsEvent;
  const raw = prisma.$queryRaw;
  const aiGen = prisma.aIGeneration;

  const svc = new AnalyticsService(
    prisma as unknown as PrismaService,
    tenants as unknown as TenantsService,
  );
  return { svc, prisma, tenants, ae, raw, aiGen };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AnalyticsService', () => {
  // ----- ingest ------------------------------------------------------------
  describe('ingest', () => {
    it('creates an analytics event with all fields', async () => {
      const { svc, ae } = makeService();
      const created = { id: 'evt-1', tenantId: 'tenant-1', kind: 'PAGE_VIEW' };
      ae.create.mockResolvedValue(created);

      const result = await svc.ingest('tenant-1', {
        kind: AnalyticsEventKind.PAGE_VIEW,
        pageSlug: '/home',
        userKey: 'u1',
        sessionKey: 's1',
        referrer: 'https://google.com',
        userAgent: 'Mozilla/5.0',
        ip: '127.0.0.1',
        payload: { foo: 'bar' },
      });

      expect(ae.create).toHaveBeenCalledTimes(1);
      const arg = ae.create.mock.calls[0][0];
      expect(arg.data.tenantId).toBe('tenant-1');
      expect(arg.data.kind).toBe('PAGE_VIEW');
      expect(arg.data.pageSlug).toBe('/home');
      expect(arg.data.ip).toBe('127.0.0.1');
      expect(arg.data.payload).toEqual({ foo: 'bar' });
      expect(result.id).toBe('evt-1');
      expect(result.tenantId).toBe('tenant-1');
      expect(result.kind).toBe('PAGE_VIEW');
    });

    it('creates an event with only required fields', async () => {
      const { svc, ae } = makeService();
      ae.create.mockResolvedValue({ id: 'evt-2' });

      await svc.ingest('tenant-1', { kind: AnalyticsEventKind.CONVERSION });

      const arg = ae.create.mock.calls[0][0];
      expect(arg.data.tenantId).toBe('tenant-1');
      expect(arg.data.kind).toBe('CONVERSION');
      expect(arg.data.pageSlug).toBeUndefined();
    });
  });

  // ----- summary -----------------------------------------------------------
  describe('summary', () => {
    it('returns counts for views, conversions, aiGenerations, deployments', async () => {
      const { svc, ae, aiGen, prisma, tenants } = makeService();
      ae.count
        .mockResolvedValueOnce(100) // views
        .mockResolvedValueOnce(5);  // conversions
      aiGen.count.mockResolvedValue(12);
      prisma.deployment.count.mockResolvedValue(3);

      const result = await svc.summary('user-1', 'tenant-1', 30);

      expect(tenants.get).toHaveBeenCalledWith('user-1', 'tenant-1');
      expect(result.views).toBe(100);
      expect(result.conversions).toBe(5);
      expect(result.aiGenerations).toBe(12);
      expect(result.deployments).toBe(3);
      expect(result.since).toBeInstanceOf(Date);
    });

    it('uses default 30 days when days param omitted', async () => {
      const { svc, ae, aiGen, prisma } = makeService();
      ae.count.mockResolvedValue(0);
      aiGen.count.mockResolvedValue(0);
      prisma.deployment.count.mockResolvedValue(0);

      const before = Date.now();
      const result = await svc.summary('user-1', 'tenant-1');
      const expectedSince = before - 30 * 86_400_000;

      expect(result.since.getTime()).toBeGreaterThanOrEqual(expectedSince - 1000);
      expect(result.since.getTime()).toBeLessThanOrEqual(expectedSince + 1000);
    });

    it('returns zeros when no data exists', async () => {
      const { svc, ae, aiGen, prisma } = makeService();
      ae.count.mockResolvedValue(0);
      aiGen.count.mockResolvedValue(0);
      prisma.deployment.count.mockResolvedValue(0);

      const result = await svc.summary('user-1', 'tenant-1');

      expect(result.views).toBe(0);
      expect(result.conversions).toBe(0);
      expect(result.aiGenerations).toBe(0);
      expect(result.deployments).toBe(0);
    });
  });

  // ----- timeline ----------------------------------------------------------
  describe('timeline', () => {
    it('returns grouped event counts by kind', async () => {
      const { svc, ae, tenants } = makeService();
      ae.groupBy.mockResolvedValue([
        { kind: 'PAGE_VIEW', _count: { _all: 50 } },
        { kind: 'CONVERSION', _count: { _all: 3 } },
      ]);

      const result = await svc.timeline('user-1', 'tenant-1', 14);

      expect(tenants.get).toHaveBeenCalledWith('user-1', 'tenant-1');
      expect(result.since).toBeInstanceOf(Date);
      expect(result.byKind).toEqual([
        { kind: 'PAGE_VIEW', count: 50 },
        { kind: 'CONVERSION', count: 3 },
      ]);
    });

    it('returns empty byKind array when no events exist', async () => {
      const { svc, ae } = makeService();
      ae.groupBy.mockResolvedValue([]);

      const result = await svc.timeline('user-1', 'tenant-1');

      expect(result.byKind).toEqual([]);
    });

    it('uses default 14 days', async () => {
      const { svc, ae } = makeService();
      ae.groupBy.mockResolvedValue([]);

      const before = Date.now();
      const result = await svc.timeline('user-1', 'tenant-1');
      const expectedSince = before - 14 * 86_400_000;

      expect(result.since.getTime()).toBeGreaterThanOrEqual(expectedSince - 1000);
      expect(result.since.getTime()).toBeLessThanOrEqual(expectedSince + 1000);
    });
  });

  // ----- timeseries --------------------------------------------------------
  describe('timeseries', () => {
    it('returns daily views and conversions from raw query', async () => {
      const { svc, raw, tenants } = makeService();
      raw.mockResolvedValue([
        { day: '2025-01-01', views: BigInt(10), conversions: BigInt(2) },
        { day: '2025-01-02', views: BigInt(20), conversions: BigInt(0) },
      ]);

      const result = await svc.timeseries('user-1', 'tenant-1', 28);

      expect(tenants.get).toHaveBeenCalledWith('user-1', 'tenant-1');
      expect(result).toEqual([
        { day: '2025-01-01', views: 10, conversions: 2 },
        { day: '2025-01-02', views: 20, conversions: 0 },
      ]);
    });

    it('returns empty array when no rows', async () => {
      const { svc, raw } = makeService();
      raw.mockResolvedValue([]);

      const result = await svc.timeseries('user-1', 'tenant-1');

      expect(result).toEqual([]);
    });

    it('converts bigint values to numbers', async () => {
      const { svc, raw } = makeService();
      raw.mockResolvedValue([
        { day: '2025-06-01', views: BigInt(999), conversions: BigInt(42) },
      ]);

      const result = await svc.timeseries('user-1', 'tenant-1');

      expect(typeof result[0].views).toBe('number');
      expect(typeof result[0].conversions).toBe('number');
      expect(result[0].views).toBe(999);
      expect(result[0].conversions).toBe(42);
    });
  });

  // ----- topPages ----------------------------------------------------------
  describe('topPages', () => {
    it('returns top pages with conversion rates', async () => {
      const { svc, raw, tenants } = makeService();
      raw.mockResolvedValue([
        { pageSlug: '/home', views: BigInt(100), conversions: BigInt(10) },
        { pageSlug: '/about', views: BigInt(50), conversions: BigInt(0) },
      ]);

      const result = await svc.topPages('user-1', 'tenant-1', 28, 10);

      expect(tenants.get).toHaveBeenCalledWith('user-1', 'tenant-1');
      expect(result).toEqual([
        { path: '/home', views: 100, conversions: 10, conversionRate: 10 },
        { path: '/about', views: 50, conversions: 0, conversionRate: 0 },
      ]);
    });

    it('returns empty array when no pages found', async () => {
      const { svc, raw } = makeService();
      raw.mockResolvedValue([]);

      const result = await svc.topPages('user-1', 'tenant-1');

      expect(result).toEqual([]);
    });

    it('handles zero views with 0 conversionRate', async () => {
      const { svc, raw } = makeService();
      raw.mockResolvedValue([
        { pageSlug: '/test', views: BigInt(0), conversions: BigInt(0) },
      ]);

      const result = await svc.topPages('user-1', 'tenant-1');

      expect(result[0].conversionRate).toBe(0);
    });

    it('rounds conversionRate to two decimal places', async () => {
      const { svc, raw } = makeService();
      raw.mockResolvedValue([
        { pageSlug: '/pricing', views: BigInt(3), conversions: BigInt(1) },
      ]);

      const result = await svc.topPages('user-1', 'tenant-1');

      // 1/3 * 100 = 33.33...  -> rounded to 33.33
      expect(result[0].conversionRate).toBe(33.33);
    });
  });

  // ----- referrers ---------------------------------------------------------
  describe('referrers', () => {
    it('returns referrer counts from raw query', async () => {
      const { svc, raw, tenants } = makeService();
      raw.mockResolvedValue([
        { referrer: 'https://google.com', count: BigInt(50) },
        { referrer: 'https://twitter.com', count: BigInt(10) },
      ]);

      const result = await svc.referrers('user-1', 'tenant-1', 28, 10);

      expect(tenants.get).toHaveBeenCalledWith('user-1', 'tenant-1');
      expect(result).toEqual([
        { referrer: 'https://google.com', count: 50 },
        { referrer: 'https://twitter.com', count: 10 },
      ]);
    });

    it('returns empty array when no referrers', async () => {
      const { svc, raw } = makeService();
      raw.mockResolvedValue([]);

      const result = await svc.referrers('user-1', 'tenant-1');

      expect(result).toEqual([]);
    });

    it('converts bigint count to number', async () => {
      const { svc, raw } = makeService();
      raw.mockResolvedValue([
        { referrer: 'https://example.com', count: BigInt(7) },
      ]);

      const result = await svc.referrers('user-1', 'tenant-1');

      expect(typeof result[0].count).toBe('number');
      expect(result[0].count).toBe(7);
    });
  });

  // ----- tenant access check -----------------------------------------------
  describe('tenant access checks', () => {
    it('propagates error when tenants.get rejects (summary)', async () => {
      const { svc, tenants } = makeService();
      tenants.get.mockRejectedValue(new Error('Not found'));

      try {
        await svc.summary('user-1', 'bad-tenant');
        fail('Expected summary to throw');
      } catch (err: unknown) {
        expect((err as Error).message).toBe('Not found');
      }
    });

    it('propagates error when tenants.get rejects (timeline)', async () => {
      const { svc, tenants } = makeService();
      tenants.get.mockRejectedValue(new Error('Forbidden'));

      try {
        await svc.timeline('user-1', 'bad-tenant');
        fail('Expected timeline to throw');
      } catch (err: unknown) {
        expect((err as Error).message).toBe('Forbidden');
      }
    });

    it('propagates error when tenants.get rejects (timeseries)', async () => {
      const { svc, tenants } = makeService();
      tenants.get.mockRejectedValue(new Error('Access denied'));

      try {
        await svc.timeseries('user-1', 'bad-tenant');
        fail('Expected timeseries to throw');
      } catch (err: unknown) {
        expect((err as Error).message).toBe('Access denied');
      }
    });

    it('propagates error when tenants.get rejects (topPages)', async () => {
      const { svc, tenants } = makeService();
      tenants.get.mockRejectedValue(new Error('Nope'));

      try {
        await svc.topPages('user-1', 'bad-tenant');
        fail('Expected topPages to throw');
      } catch (err: unknown) {
        expect((err as Error).message).toBe('Nope');
      }
    });

    it('propagates error when tenants.get rejects (referrers)', async () => {
      const { svc, tenants } = makeService();
      tenants.get.mockRejectedValue(new Error('Nope'));

      try {
        await svc.referrers('user-1', 'bad-tenant');
        fail('Expected referrers to throw');
      } catch (err: unknown) {
        expect((err as Error).message).toBe('Nope');
      }
    });
  });
});
