import { ConfigService } from '@nestjs/config';
import { StaticExportAdapter } from './static-export.adapter';
import { CloudflarePagesAdapter } from './cloudflare-pages.adapter';
import type { DeploymentInput, DeploymentResult } from './adapter.interface';

// ---------------------------------------------------------------------------
// fs mock – avoid real disk I/O
// ---------------------------------------------------------------------------

jest.mock('node:fs', () => ({
  promises: {
    readdir: jest.fn(),
    readFile: jest.fn(),
  },
}));

import { promises as mockFs } from 'node:fs';

// ---------------------------------------------------------------------------
// fetch mock
// ---------------------------------------------------------------------------

const mockFetch = jest.fn() as jest.Mock;
let fetchSpy: jest.SpyInstance;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeConfigService(overrides: Record<string, string | undefined> = {}): ConfigService {
  const map: Record<string, string | undefined> = {
    'deployments.cloudflarePages.apiToken': 'cf-test-token',
    'deployments.cloudflarePages.accountId': 'acc_123',
    'deployments.cloudflarePages.projectName': 'my-project',
    ...overrides,
  };
  return { get: jest.fn((key: string) => map[key]) } as unknown as ConfigService;
}

function makeStaticExport(result?: Partial<DeploymentResult>): StaticExportAdapter {
  return {
    deploy: jest.fn().mockResolvedValue({
      artefactUrl: 'file:///tmp/export',
      log: 'Exported 1 pages',
      ...result,
    }),
  } as unknown as StaticExportAdapter;
}

function makeAdapter(
  configOverrides?: Record<string, string | undefined>,
  staticResult?: Partial<DeploymentResult>,
) {
  const config = makeConfigService(configOverrides);
  const staticExport = makeStaticExport(staticResult);
  const adapter = new CloudflarePagesAdapter(config, staticExport);
  return { adapter, config, staticExport };
}

const baseInput: DeploymentInput = {
  tenantId: 'tenant-1',
  config: {},
};

function mockFileSystem(files: Array<{ name: string; content: string }> = [{ name: 'index.html', content: '<html></html>' }]) {
  (mockFs.readdir as jest.Mock).mockResolvedValue(
    files.map((f) => ({ name: f.name, isDirectory: () => false })),
  );
  for (const f of files) {
    (mockFs.readFile as jest.Mock).mockResolvedValueOnce(Buffer.from(f.content));
  }
}

function mockDeployOk(url = 'https://abc123.pages.dev', id = 'deploy-id-1') {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: async () => ({ success: true, result: { url, id } }),
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CloudflarePagesAdapter', () => {
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
    it('throws when CLOUDFLARE_API_TOKEN is missing', async () => {
      const { adapter } = makeAdapter({ 'deployments.cloudflarePages.apiToken': '' });
      await expect(adapter.deploy(baseInput)).rejects.toThrow(
        'Cloudflare Pages not configured',
      );
    });

    it('throws when CLOUDFLARE_ACCOUNT_ID is missing', async () => {
      const { adapter } = makeAdapter({ 'deployments.cloudflarePages.accountId': '' });
      await expect(adapter.deploy(baseInput)).rejects.toThrow(
        'Cloudflare Pages not configured',
      );
    });

    it('throws when CLOUDFLARE_PROJECT_NAME is missing', async () => {
      const { adapter } = makeAdapter({ 'deployments.cloudflarePages.projectName': '' });
      await expect(adapter.deploy(baseInput)).rejects.toThrow(
        'Cloudflare Pages not configured',
      );
    });

    it('throws when all config values are missing', async () => {
      const { adapter } = makeAdapter({
        'deployments.cloudflarePages.apiToken': '',
        'deployments.cloudflarePages.accountId': '',
        'deployments.cloudflarePages.projectName': '',
      });
      await expect(adapter.deploy(baseInput)).rejects.toThrow(
        'Cloudflare Pages not configured',
      );
    });
  });

  // -----------------------------------------------------------------------
  // Static export failure
  // -----------------------------------------------------------------------

  describe('static export produces no artefact', () => {
    it('throws when artefactUrl is undefined', async () => {
      const { adapter } = makeAdapter(undefined, { artefactUrl: undefined });
      await expect(adapter.deploy(baseInput)).rejects.toThrow(
        'Static export produced no local artefact',
      );
    });
  });

  // -----------------------------------------------------------------------
  // File upload & deployment creation
  // -----------------------------------------------------------------------

  describe('file upload', () => {
    it('uploads files via multipart form to Cloudflare Pages API', async () => {
      mockFileSystem([{ name: 'index.html', content: '<h1>Hi</h1>' }]);
      mockDeployOk();
      const { adapter } = makeAdapter();

      await adapter.deploy(baseInput);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, opts] = mockFetch.mock.calls[0];
      expect(url).toBe(
        'https://api.cloudflare.com/client/v4/accounts/acc_123/pages/projects/my-project/deployments',
      );
      expect(opts.method).toBe('POST');
      expect(opts.headers.Authorization).toBe('Bearer cf-test-token');
      expect(opts.body).toBeInstanceOf(FormData);
    });

    it('uploads multiple files in a single form', async () => {
      mockFileSystem([
        { name: 'index.html', content: '<h1>Home</h1>' },
        { name: 'style.css', content: 'body {}' },
      ]);
      mockDeployOk();
      const { adapter } = makeAdapter();

      await adapter.deploy(baseInput);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [, opts] = mockFetch.mock.calls[0];
      const form: FormData = opts.body;
      // FormData should contain both files + manifest
      const keys = [...(form as any).keys()];
      expect(keys).toContain('index.html');
      expect(keys).toContain('style.css');
      expect(keys).toContain('manifest');
    });

    it('appends manifest JSON to form data', async () => {
      mockFileSystem();
      mockDeployOk();
      const { adapter } = makeAdapter();

      await adapter.deploy(baseInput);

      const [, opts] = mockFetch.mock.calls[0];
      const form: FormData = opts.body;
      const manifest = form.get('manifest');
      expect(manifest).toBe('{}');
    });
  });

  // -----------------------------------------------------------------------
  // Deployment creation (success)
  // -----------------------------------------------------------------------

  describe('deployment creation', () => {
    it('returns correct DeploymentResult on success', async () => {
      mockFileSystem();
      mockDeployOk('https://abc.pages.dev', 'dpl_42');
      const { adapter } = makeAdapter();

      const result = await adapter.deploy(baseInput);

      expect(result.artefactUrl).toBe('https://abc.pages.dev');
      expect(result.version).toBe('dpl_42');
      expect(result.log).toContain('Cloudflare Pages deployment dpl_42');
      expect(result.log).toContain('https://abc.pages.dev');
    });

    it('includes static export log in result', async () => {
      mockFileSystem();
      mockDeployOk();
      const { adapter } = makeAdapter(undefined, { log: 'Exported 3 pages' });

      const result = await adapter.deploy(baseInput);

      expect(result.log).toContain('Exported 3 pages');
    });
  });

  // -----------------------------------------------------------------------
  // API error handling
  // -----------------------------------------------------------------------

  describe('API error handling', () => {
    it('throws with error messages from Cloudflare response', async () => {
      mockFileSystem();
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          success: false,
          errors: [{ message: 'Invalid project name' }],
        }),
      });
      const { adapter } = makeAdapter();

      await expect(adapter.deploy(baseInput)).rejects.toThrow(
        /Cloudflare Pages upload failed.*Invalid project name/,
      );
    });

    it('joins multiple error messages with semicolons', async () => {
      mockFileSystem();
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          success: false,
          errors: [
            { message: 'Error one' },
            { message: 'Error two' },
          ],
        }),
      });
      const { adapter } = makeAdapter();

      await expect(adapter.deploy(baseInput)).rejects.toThrow(
        /Error one; Error two/,
      );
    });

    it('falls back to HTTP status code when no error messages', async () => {
      mockFileSystem();
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ success: false }),
      });
      const { adapter } = makeAdapter();

      await expect(adapter.deploy(baseInput)).rejects.toThrow(
        /Cloudflare Pages upload failed.*HTTP 500/,
      );
    });

    it('throws when response is ok but success is false', async () => {
      mockFileSystem();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: false,
          errors: [{ message: 'Unexpected failure' }],
        }),
      });
      const { adapter } = makeAdapter();

      await expect(adapter.deploy(baseInput)).rejects.toThrow(
        /Cloudflare Pages upload failed.*Unexpected failure/,
      );
    });
  });

  // -----------------------------------------------------------------------
  // Config from input overrides
  // -----------------------------------------------------------------------

  describe('config from input overrides', () => {
    it('uses cloudflare config from input.config when provided', async () => {
      mockFileSystem();
      mockDeployOk();
      // env has no cloudflare config
      const { adapter } = makeAdapter({
        'deployments.cloudflarePages.apiToken': '',
        'deployments.cloudflarePages.accountId': '',
        'deployments.cloudflarePages.projectName': '',
      });

      const input: DeploymentInput = {
        tenantId: 'tenant-1',
        config: {
          cloudflare: {
            apiToken: 'input-token',
            accountId: 'input-acc',
            projectName: 'input-project',
          },
        },
      };

      await adapter.deploy(input);

      const [url, opts] = mockFetch.mock.calls[0];
      expect(url).toContain('input-acc');
      expect(url).toContain('input-project');
      expect(opts.headers.Authorization).toBe('Bearer input-token');
    });
  });
});
