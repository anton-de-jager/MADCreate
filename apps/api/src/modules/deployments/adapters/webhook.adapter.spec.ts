import { WebhookAdapter } from './webhook.adapter';
import type { DeploymentInput } from './adapter.interface';

// ---------------------------------------------------------------------------
// fetch mock – avoid real HTTP calls
// ---------------------------------------------------------------------------

const mockFetch = jest.fn() as jest.MockedFunction<typeof global.fetch>;
global.fetch = mockFetch;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeInput(config: Record<string, unknown> = {}): DeploymentInput {
  return { tenantId: 'tenant-1', siteId: 'site-1', config };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('WebhookAdapter', () => {
  let adapter: WebhookAdapter;

  beforeEach(() => {
    jest.clearAllMocks();
    adapter = new WebhookAdapter();
  });

  // -------------------------------------------------------------------------
  // Missing URL config
  // -------------------------------------------------------------------------

  describe('missing URL config', () => {
    it('returns early when config has no url', async () => {
      const result = await adapter.deploy(makeInput({}));

      expect(result).toEqual({ log: 'No webhook URL configured.' });
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('returns early when config is undefined', async () => {
      const result = await adapter.deploy({ tenantId: 'tenant-1', config: {} });

      expect(result).toEqual({ log: 'No webhook URL configured.' });
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('returns early when url is empty string', async () => {
      const result = await adapter.deploy(makeInput({ url: '' }));

      expect(result).toEqual({ log: 'No webhook URL configured.' });
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Successful webhook call
  // -------------------------------------------------------------------------

  describe('successful webhook call', () => {
    it('POSTs JSON payload to the configured URL', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue('OK'),
      } as unknown as Response);

      const result = await adapter.deploy(
        makeInput({ url: 'https://hooks.example.com/deploy' }),
      );

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, opts] = mockFetch.mock.calls[0];
      expect(url).toBe('https://hooks.example.com/deploy');
      expect(opts?.method).toBe('POST');
      expect(opts?.headers).toMatchObject({ 'content-type': 'application/json' });

      const body = JSON.parse(opts?.body as string);
      expect(body.tenantId).toBe('tenant-1');
      expect(body.siteId).toBe('site-1');
      expect(body.triggeredAt).toBeDefined();

      expect(result.log).toContain('https://hooks.example.com/deploy');
      expect(result.log).toContain('200');
      expect(result.artefactUrl).toBe('https://hooks.example.com/deploy');
    });

    it('uses PUT method when configured', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue(''),
      } as unknown as Response);

      await adapter.deploy(
        makeInput({ url: 'https://hooks.example.com/deploy', method: 'PUT' }),
      );

      const [, opts] = mockFetch.mock.calls[0];
      expect(opts?.method).toBe('PUT');
    });

    it('merges custom headers with content-type', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue(''),
      } as unknown as Response);

      await adapter.deploy(
        makeInput({
          url: 'https://hooks.example.com/deploy',
          headers: { Authorization: 'Bearer tok123' },
        }),
      );

      const [, opts] = mockFetch.mock.calls[0];
      expect(opts?.headers).toMatchObject({
        'content-type': 'application/json',
        Authorization: 'Bearer tok123',
      });
    });
  });

  // -------------------------------------------------------------------------
  // Non-ok response error handling
  // -------------------------------------------------------------------------

  describe('non-ok response', () => {
    it('throws an error with status and response body', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 422,
        text: jest.fn().mockResolvedValue('Unprocessable Entity'),
      } as unknown as Response);

      await expect(
        adapter.deploy(makeInput({ url: 'https://hooks.example.com/deploy' })),
      ).rejects.toThrow('Webhook responded 422: Unprocessable Entity');
    });

    it('throws on 500 server error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: jest.fn().mockResolvedValue('Internal Server Error'),
      } as unknown as Response);

      await expect(
        adapter.deploy(makeInput({ url: 'https://hooks.example.com/deploy' })),
      ).rejects.toThrow('Webhook responded 500');
    });

    it('handles text() rejection gracefully', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 502,
        text: jest.fn().mockRejectedValue(new Error('stream failed')),
      } as unknown as Response);

      await expect(
        adapter.deploy(makeInput({ url: 'https://hooks.example.com/deploy' })),
      ).rejects.toThrow('Webhook responded 502: ');
    });
  });
});
