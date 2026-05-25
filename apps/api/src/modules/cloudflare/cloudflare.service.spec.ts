import { CloudflareService } from './cloudflare.service';
import { createMockConfig, type ConfigService } from '../../test/mock-helpers';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeService(configured = true) {
  const config = createMockConfig();

  if (configured) {
    config.get.mockImplementation((key: string) => {
      if (key === 'cloudflare.apiToken') return 'cf-test-token';
      if (key === 'cloudflare.zoneId') return 'zone-123';
      return undefined;
    });
  } else {
    config.get.mockReturnValue(undefined);
  }

  const svc = new CloudflareService(config as unknown as ConfigService);
  return { svc, config };
}

/** Build a mock Response returned by global fetch. */
function mockFetchResponse(ok: boolean, json: unknown): Response {
  return {
    ok,
    status: ok ? 200 : 400,
    json: jest.fn().mockResolvedValue(json),
  } as unknown as Response;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CloudflareService', () => {
  const fetchSpy = jest.spyOn(globalThis, 'fetch');

  afterEach(() => {
    fetchSpy.mockReset();
  });

  // ----- No-creds graceful degradation -------------------------------------
  describe('when credentials are missing', () => {
    it('isConfigured() returns false', () => {
      const { svc } = makeService(false);
      expect(svc.isConfigured()).toBe(false);
    });

    it('upsertRecord returns null without calling fetch', async () => {
      const { svc } = makeService(false);
      const result = await svc.upsertRecord({ type: 'A', name: 'test.example.com', content: '1.2.3.4' });
      expect(result).toBeNull();
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('deleteRecord returns false without calling fetch', async () => {
      const { svc } = makeService(false);
      const result = await svc.deleteRecord('rec-1');
      expect(result).toBe(false);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('wireCustomDomain returns null ids without calling fetch', async () => {
      const { svc } = makeService(false);
      const result = await svc.wireCustomDomain('custom.example.com', 'platform.example.com', 'verify-tok');
      expect(result).toEqual({ cnameId: null, txtId: null });
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('ensureUniversalSsl returns false without calling fetch', async () => {
      const { svc } = makeService(false);
      const result = await svc.ensureUniversalSsl();
      expect(result).toBe(false);
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });

  // ----- isConfigured when creds present -----------------------------------
  describe('when credentials are present', () => {
    it('isConfigured() returns true', () => {
      const { svc } = makeService(true);
      expect(svc.isConfigured()).toBe(true);
    });
  });

  // ----- upsertRecord -----------------------------------------------------
  describe('upsertRecord', () => {
    it('creates a new record when none exists', async () => {
      const { svc } = makeService();

      // First call: list returns empty
      fetchSpy.mockResolvedValueOnce(
        mockFetchResponse(true, { success: true, result: [] }),
      );
      // Second call: POST creates
      fetchSpy.mockResolvedValueOnce(
        mockFetchResponse(true, { success: true, result: { id: 'new-rec-1', type: 'A', name: 'a.example.com', content: '1.2.3.4', ttl: 300 } }),
      );

      const id = await svc.upsertRecord({ type: 'A', name: 'a.example.com', content: '1.2.3.4' });

      expect(id).toBe('new-rec-1');
      expect(fetchSpy).toHaveBeenCalledTimes(2);
      // Second call should be POST (create)
      expect((fetchSpy.mock.calls[1][1] as RequestInit).method).toBe('POST');
    });

    it('updates an existing record when one is found', async () => {
      const { svc } = makeService();

      // First call: list returns existing record
      fetchSpy.mockResolvedValueOnce(
        mockFetchResponse(true, { success: true, result: [{ id: 'existing-1', type: 'A', name: 'a.example.com', content: '0.0.0.0', ttl: 300 }] }),
      );
      // Second call: PUT updates
      fetchSpy.mockResolvedValueOnce(
        mockFetchResponse(true, { success: true, result: { id: 'existing-1', type: 'A', name: 'a.example.com', content: '1.2.3.4', ttl: 300 } }),
      );

      const id = await svc.upsertRecord({ type: 'A', name: 'a.example.com', content: '1.2.3.4' });

      expect(id).toBe('existing-1');
      expect(fetchSpy).toHaveBeenCalledTimes(2);
      // Second call should be PUT (update)
      expect((fetchSpy.mock.calls[1][1] as RequestInit).method).toBe('PUT');
    });

    it('uses correct defaults for ttl and proxied', async () => {
      const { svc } = makeService();

      fetchSpy.mockResolvedValueOnce(
        mockFetchResponse(true, { success: true, result: [] }),
      );
      fetchSpy.mockResolvedValueOnce(
        mockFetchResponse(true, { success: true, result: { id: 'rec-1' } }),
      );

      await svc.upsertRecord({ type: 'CNAME', name: 'c.example.com', content: 'target.com' });

      const postBody = JSON.parse(fetchSpy.mock.calls[1][1]!.body as string);
      expect(postBody.ttl).toBe(300);
      expect(postBody.proxied).toBe(true); // CNAME defaults to proxied
    });

    it('sets proxied false for TXT records by default', async () => {
      const { svc } = makeService();

      fetchSpy.mockResolvedValueOnce(
        mockFetchResponse(true, { success: true, result: [] }),
      );
      fetchSpy.mockResolvedValueOnce(
        mockFetchResponse(true, { success: true, result: { id: 'rec-1' } }),
      );

      await svc.upsertRecord({ type: 'TXT', name: 't.example.com', content: 'v=test' });

      const postBody = JSON.parse(fetchSpy.mock.calls[1][1]!.body as string);
      expect(postBody.proxied).toBe(false); // TXT defaults to not proxied
    });
  });

  // ----- deleteRecord ------------------------------------------------------
  describe('deleteRecord', () => {
    it('returns true on successful deletion', async () => {
      const { svc } = makeService();

      fetchSpy.mockResolvedValueOnce(
        mockFetchResponse(true, { success: true }),
      );

      const result = await svc.deleteRecord('rec-to-delete');

      expect(result).toBe(true);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(fetchSpy.mock.calls[0][0]).toContain('/dns_records/rec-to-delete');
      expect((fetchSpy.mock.calls[0][1] as RequestInit).method).toBe('DELETE');
    });

    it('returns false when API reports failure', async () => {
      const { svc } = makeService();

      fetchSpy.mockResolvedValueOnce(
        mockFetchResponse(false, { success: false, errors: [{ message: 'Record not found' }] }),
      );

      const result = await svc.deleteRecord('no-such-rec');

      expect(result).toBe(false);
    });
  });

  // ----- API error handling ------------------------------------------------
  describe('API error handling', () => {
    it('returns null when CF API responds with an error status', async () => {
      const { svc } = makeService();

      fetchSpy.mockResolvedValueOnce(
        mockFetchResponse(false, { success: false, errors: [{ message: 'Authentication error' }] }),
      );
      fetchSpy.mockResolvedValueOnce(
        mockFetchResponse(false, { success: false, errors: [{ message: 'Authentication error' }] }),
      );

      const id = await svc.upsertRecord({ type: 'A', name: 'a.example.com', content: '1.2.3.4' });

      // The list call fails, so result should be null
      expect(id).toBeNull();
    });

    it('returns null when fetch throws a network error', async () => {
      const { svc } = makeService();

      fetchSpy.mockRejectedValueOnce(new Error('Network unreachable'));

      const id = await svc.upsertRecord({ type: 'A', name: 'a.example.com', content: '1.2.3.4' });

      expect(id).toBeNull();
    });

    it('deleteRecord returns false when fetch throws', async () => {
      const { svc } = makeService();

      fetchSpy.mockRejectedValueOnce(new Error('Connection timeout'));

      const result = await svc.deleteRecord('rec-1');

      expect(result).toBe(false);
    });
  });

  // ----- wireCustomDomain --------------------------------------------------
  describe('wireCustomDomain', () => {
    it('creates CNAME and TXT records in parallel', async () => {
      const { svc } = makeService();

      // CNAME lookup (empty) + CNAME create
      // TXT lookup (empty) + TXT create
      // These run in parallel, so we need 4 fetch calls total
      fetchSpy
        .mockResolvedValueOnce(mockFetchResponse(true, { success: true, result: [] }))
        .mockResolvedValueOnce(mockFetchResponse(true, { success: true, result: [] }))
        .mockResolvedValueOnce(mockFetchResponse(true, { success: true, result: { id: 'cname-1' } }))
        .mockResolvedValueOnce(mockFetchResponse(true, { success: true, result: { id: 'txt-1' } }));

      const result = await svc.wireCustomDomain('custom.example.com', 'platform.host', 'verify-123');

      expect(result.cnameId).toBe('cname-1');
      expect(result.txtId).toBe('txt-1');
    });
  });

  // ----- ensureUniversalSsl ------------------------------------------------
  describe('ensureUniversalSsl', () => {
    it('returns true on success', async () => {
      const { svc } = makeService();
      fetchSpy.mockResolvedValueOnce(
        mockFetchResponse(true, { success: true }),
      );

      const result = await svc.ensureUniversalSsl();
      expect(result).toBe(true);
    });

    it('returns false on API failure', async () => {
      const { svc } = makeService();
      fetchSpy.mockResolvedValueOnce(
        mockFetchResponse(false, { success: false, errors: [{ message: 'Zone not found' }] }),
      );

      const result = await svc.ensureUniversalSsl();
      expect(result).toBe(false);
    });
  });
});
