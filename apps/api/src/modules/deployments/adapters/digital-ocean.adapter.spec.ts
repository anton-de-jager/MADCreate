import { ConfigService } from '@nestjs/config';
import { DigitalOceanAdapter } from './digital-ocean.adapter';
import type { DeploymentInput } from './adapter.interface';

// ---------------------------------------------------------------------------
// fetch mock
// ---------------------------------------------------------------------------

const mockFetch = jest.fn() as jest.Mock;
let fetchSpy: jest.SpyInstance;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeAdapter(configOverrides: Record<string, string | undefined> = {}) {
  const configMap: Record<string, string | undefined> = {
    'deployments.digitalOcean.token': 'env-token',
    'deployments.digitalOcean.appId': 'env-app-id',
    ...configOverrides,
  };
  const config = { get: jest.fn((key: string) => configMap[key]) } as unknown as ConfigService;
  const adapter = new DigitalOceanAdapter(config);
  return { adapter, config };
}

const defaultInput: DeploymentInput = {
  tenantId: 'tenant-1',
  config: {},
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('DigitalOceanAdapter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetchSpy = jest.spyOn(globalThis, 'fetch').mockImplementation(mockFetch);
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  // -----------------------------------------------------------------------
  // Missing config
  // -----------------------------------------------------------------------

  describe('missing config', () => {
    it('throws when DIGITALOCEAN_TOKEN is missing from env and input', async () => {
      const { adapter } = makeAdapter({
        'deployments.digitalOcean.token': undefined,
        'deployments.digitalOcean.appId': 'env-app-id',
      });

      await expect(adapter.deploy(defaultInput)).rejects.toThrow(
        'DigitalOcean not configured',
      );
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('throws when DIGITALOCEAN_APP_ID is missing from env and input', async () => {
      const { adapter } = makeAdapter({
        'deployments.digitalOcean.token': 'env-token',
        'deployments.digitalOcean.appId': undefined,
      });

      await expect(adapter.deploy(defaultInput)).rejects.toThrow(
        'DigitalOcean not configured',
      );
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('throws when both token and appId are missing', async () => {
      const { adapter } = makeAdapter({
        'deployments.digitalOcean.token': undefined,
        'deployments.digitalOcean.appId': undefined,
      });

      await expect(adapter.deploy(defaultInput)).rejects.toThrow(
        'DigitalOcean not configured',
      );
    });
  });

  // -----------------------------------------------------------------------
  // Successful deployment
  // -----------------------------------------------------------------------

  describe('successful deployment', () => {
    it('triggers a deployment and returns version + log', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          deployment: { id: 'deploy-42', phase: 'PENDING_BUILD' },
        }),
      });

      const { adapter } = makeAdapter();
      const result = await adapter.deploy(defaultInput);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.digitalocean.com/v2/apps/env-app-id/deployments',
        {
          method: 'POST',
          headers: {
            Authorization: 'Bearer env-token',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ force_build: true }),
        },
      );
      expect(result.version).toBe('deploy-42');
      expect(result.log).toContain('deploy-42');
      expect(result.log).toContain('tenant-1');
    });

    it('uses config from input.config.digitalOcean over env vars', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          deployment: { id: 'deploy-99', phase: 'DEPLOYING' },
        }),
      });

      const { adapter } = makeAdapter();
      const input: DeploymentInput = {
        tenantId: 'tenant-2',
        config: { digitalOcean: { token: 'input-token', appId: 'input-app' } },
      };
      const result = await adapter.deploy(input);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.digitalocean.com/v2/apps/input-app/deployments',
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: 'Bearer input-token' }),
        }),
      );
      expect(result.version).toBe('deploy-99');
    });

    it('falls back to json.id when deployment.id is absent', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'fallback-id' }),
      });

      const { adapter } = makeAdapter();
      const result = await adapter.deploy(defaultInput);

      expect(result.version).toBe('fallback-id');
    });
  });

  // -----------------------------------------------------------------------
  // API error handling
  // -----------------------------------------------------------------------

  describe('API error handling', () => {
    it('throws with API error message when response is not ok', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ id: 'unauthorized', message: 'Unable to authenticate you' }),
      });

      const { adapter } = makeAdapter();
      await expect(adapter.deploy(defaultInput)).rejects.toThrow(
        'DigitalOcean deploy failed: Unable to authenticate you',
      );
    });

    it('throws with status code when API returns no message', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({}),
      });

      const { adapter } = makeAdapter();
      await expect(adapter.deploy(defaultInput)).rejects.toThrow(
        'DigitalOcean deploy failed: 500',
      );
    });

    it('propagates network errors from fetch', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const { adapter } = makeAdapter();
      await expect(adapter.deploy(defaultInput)).rejects.toThrow('Network error');
    });
  });
});
