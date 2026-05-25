import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import type { JwtPayload } from '@madcreate/shared';

// ---------------------------------------------------------------------------
// Mock AnalyticsService interface
// ---------------------------------------------------------------------------

interface MockAnalyticsService {
  ingest: jest.Mock;
  summary: jest.Mock;
  timeline: jest.Mock;
  timeseries: jest.Mock;
  topPages: jest.Mock;
  referrers: jest.Mock;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockAnalyticsService(): MockAnalyticsService {
  return {
    ingest: jest.fn(),
    summary: jest.fn(),
    timeline: jest.fn(),
    timeseries: jest.fn(),
    topPages: jest.fn(),
    referrers: jest.fn(),
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
  const analytics = mockAnalyticsService();
  const ctrl = new AnalyticsController(analytics as unknown as AnalyticsService);
  return { ctrl, analytics };
}

function mockRequest(overrides: Record<string, any> = {}) {
  return {
    tenant: overrides.tenant ?? { id: 'ten-1' },
    header: overrides.header ?? jest.fn().mockReturnValue(undefined),
    ip: overrides.ip ?? '1.2.3.4',
    ...overrides,
  } as any;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AnalyticsController', () => {
  // =========================================================================
  // ingest (POST /analytics/ingest)
  // =========================================================================

  describe('ingest', () => {
    it('uses tenantId query param when provided', async () => {
      const { ctrl, analytics } = makeController();
      const expected = { ok: true };
      analytics.ingest.mockResolvedValue(expected);
      const req = mockRequest();
      const body = { kind: 'PAGE_VIEW', pageSlug: '/home', userKey: 'uk-1', sessionKey: 'sk-1' } as any;

      const result = await ctrl.ingest(req, body, 'tenant-query');

      expect(analytics.ingest).toHaveBeenCalledWith('tenant-query', {
        kind: 'PAGE_VIEW',
        pageSlug: '/home',
        userKey: 'uk-1',
        sessionKey: 'sk-1',
        referrer: undefined,
        userAgent: undefined,
        ip: '1.2.3.4',
        payload: undefined,
      });
      expect(result).toBe(expected);
    });

    it('falls back to req.tenant.id when tenantId query is not provided', async () => {
      const { ctrl, analytics } = makeController();
      const expected = { ok: true };
      analytics.ingest.mockResolvedValue(expected);
      const req = mockRequest({ tenant: { id: 'ten-from-req' } });
      const body = { kind: 'PAGE_VIEW' } as any;

      const result = await ctrl.ingest(req, body, undefined);

      expect(analytics.ingest).toHaveBeenCalledWith('ten-from-req', expect.objectContaining({
        kind: 'PAGE_VIEW',
      }));
      expect(result).toBe(expected);
    });

    it('returns { ok: false } when neither tenantId nor req.tenant exists', () => {
      const { ctrl, analytics } = makeController();
      const req = mockRequest({ tenant: undefined });
      const body = { kind: 'PAGE_VIEW' } as any;

      const result = ctrl.ingest(req, body, undefined);

      expect(result).toEqual({ ok: false });
      expect(analytics.ingest).not.toHaveBeenCalled();
    });

    it('passes referer and user-agent headers from request', async () => {
      const { ctrl, analytics } = makeController();
      analytics.ingest.mockResolvedValue({ ok: true });
      const headerFn = jest.fn().mockImplementation((name: string) => {
        if (name === 'referer') return 'https://google.com';
        if (name === 'user-agent') return 'Mozilla/5.0';
        return undefined;
      });
      const req = mockRequest({ header: headerFn });
      const body = { kind: 'PAGE_VIEW', payload: { extra: 'data' } } as any;

      await ctrl.ingest(req, body, 'ten-1');

      expect(analytics.ingest).toHaveBeenCalledWith('ten-1', expect.objectContaining({
        referrer: 'https://google.com',
        userAgent: 'Mozilla/5.0',
        payload: { extra: 'data' },
      }));
    });
  });

  // =========================================================================
  // summary (GET /analytics/summary)
  // =========================================================================

  describe('summary', () => {
    it('delegates with user.sub, tenantId, and parsed days', async () => {
      const { ctrl, analytics } = makeController();
      const expected = { views: 100 };
      analytics.summary.mockResolvedValue(expected);

      const result = await ctrl.summary(jwtUser, 'ten-1', '30');

      expect(analytics.summary).toHaveBeenCalledWith('user-1', 'ten-1', 30);
      expect(result).toBe(expected);
    });

    it('passes undefined when days is not provided', async () => {
      const { ctrl, analytics } = makeController();
      analytics.summary.mockResolvedValue({ views: 0 });

      await ctrl.summary(jwtUser, 'ten-1', undefined);

      expect(analytics.summary).toHaveBeenCalledWith('user-1', 'ten-1', undefined);
    });
  });

  // =========================================================================
  // timeline (GET /analytics/timeline)
  // =========================================================================

  describe('timeline', () => {
    it('delegates with user.sub, tenantId, and parsed days', async () => {
      const { ctrl, analytics } = makeController();
      const expected = [{ date: '2026-01-01', views: 10 }];
      analytics.timeline.mockResolvedValue(expected);

      const result = await ctrl.timeline(jwtUser, 'ten-1', '7');

      expect(analytics.timeline).toHaveBeenCalledWith('user-1', 'ten-1', 7);
      expect(result).toBe(expected);
    });

    it('passes undefined when days is not provided', async () => {
      const { ctrl, analytics } = makeController();
      analytics.timeline.mockResolvedValue([]);

      await ctrl.timeline(jwtUser, 'ten-1', undefined);

      expect(analytics.timeline).toHaveBeenCalledWith('user-1', 'ten-1', undefined);
    });
  });

  // =========================================================================
  // timeseries (GET /analytics/timeseries)
  // =========================================================================

  describe('timeseries', () => {
    it('delegates with user.sub, tenantId, and parsed days', async () => {
      const { ctrl, analytics } = makeController();
      const expected = [{ ts: '2026-01-01', count: 5 }];
      analytics.timeseries.mockResolvedValue(expected);

      const result = await ctrl.timeseries(jwtUser, 'ten-1', '14');

      expect(analytics.timeseries).toHaveBeenCalledWith('user-1', 'ten-1', 14);
      expect(result).toBe(expected);
    });

    it('passes undefined when days is not provided', async () => {
      const { ctrl, analytics } = makeController();
      analytics.timeseries.mockResolvedValue([]);

      await ctrl.timeseries(jwtUser, 'ten-1', undefined);

      expect(analytics.timeseries).toHaveBeenCalledWith('user-1', 'ten-1', undefined);
    });
  });

  // =========================================================================
  // topPages (GET /analytics/top-pages)
  // =========================================================================

  describe('topPages', () => {
    it('delegates with user.sub, tenantId, and parsed days', async () => {
      const { ctrl, analytics } = makeController();
      const expected = [{ slug: '/home', views: 50 }];
      analytics.topPages.mockResolvedValue(expected);

      const result = await ctrl.topPages(jwtUser, 'ten-1', '30');

      expect(analytics.topPages).toHaveBeenCalledWith('user-1', 'ten-1', 30);
      expect(result).toBe(expected);
    });

    it('passes undefined when days is not provided', async () => {
      const { ctrl, analytics } = makeController();
      analytics.topPages.mockResolvedValue([]);

      await ctrl.topPages(jwtUser, 'ten-1', undefined);

      expect(analytics.topPages).toHaveBeenCalledWith('user-1', 'ten-1', undefined);
    });
  });

  // =========================================================================
  // referrers (GET /analytics/referrers)
  // =========================================================================

  describe('referrers', () => {
    it('delegates with user.sub, tenantId, and parsed days', async () => {
      const { ctrl, analytics } = makeController();
      const expected = [{ referrer: 'google.com', count: 20 }];
      analytics.referrers.mockResolvedValue(expected);

      const result = await ctrl.referrers(jwtUser, 'ten-1', '7');

      expect(analytics.referrers).toHaveBeenCalledWith('user-1', 'ten-1', 7);
      expect(result).toBe(expected);
    });

    it('passes undefined when days is not provided', async () => {
      const { ctrl, analytics } = makeController();
      analytics.referrers.mockResolvedValue([]);

      await ctrl.referrers(jwtUser, 'ten-1', undefined);

      expect(analytics.referrers).toHaveBeenCalledWith('user-1', 'ten-1', undefined);
    });
  });
});
