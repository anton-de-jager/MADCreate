import { ConfigService } from '@nestjs/config';
import { StaticExportAdapter } from './static-export.adapter';
import { VercelAdapter } from './vercel.adapter';
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
    'deployments.vercel.token': 'test-token',
    'deployments.vercel.projectId': 'prj_123',
    'deployments.vercel.teamId': undefined,
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
  const adapter = new VercelAdapter(config, staticExport);
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

function mockUploadOk() {
  mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });
}

function mockDeployOk(url = 'my-deploy.vercel.app', id = 'dpl_abc123') {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: async () => ({ url, id }),
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('VercelAdapter', () => {
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
    it('throws when VERCEL_TOKEN is missing', async () => {
      const { adapter } = makeAdapter({ 'deployments.vercel.token': '' });
      await expect(adapter.deploy(baseInput)).rejects.toThrow(
        'Vercel not configured',
      );
    });

    it('throws when VERCEL_PROJECT_ID is missing', async () => {
      const { adapter } = makeAdapter({ 'deployments.vercel.projectId': '' });
      await expect(adapter.deploy(baseInput)).rejects.toThrow(
        'Vercel not configured',
      );
    });

    it('throws when both token and projectId are missing', async () => {
      const { adapter } = makeAdapter({
        'deployments.vercel.token': '',
        'deployments.vercel.projectId': '',
      });
      await expect(adapter.deploy(baseInput)).rejects.toThrow(
        'Vercel not configured',
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
  // File upload
  // -----------------------------------------------------------------------

  describe('file upload', () => {
    it('uploads each file with correct headers', async () => {
      mockFileSystem([{ name: 'index.html', content: '<h1>Hi</h1>' }]);
      mockUploadOk();
      mockDeployOk();
      const { adapter } = makeAdapter();

      await adapter.deploy(baseInput);

      expect(mockFetch).toHaveBeenCalledTimes(2); // 1 upload + 1 deploy
      const [uploadUrl, uploadOpts] = mockFetch.mock.calls[0];
      expect(uploadUrl).toBe('https://api.vercel.com/v2/files');
      expect(uploadOpts.method).toBe('POST');
      expect(uploadOpts.headers.Authorization).toBe('Bearer test-token');
      expect(uploadOpts.headers['Content-Type']).toBe('application/octet-stream');
      expect(uploadOpts.headers['x-vercel-digest']).toBeDefined();
    });

    it('uploads multiple files', async () => {
      mockFileSystem([
        { name: 'index.html', content: '<h1>Home</h1>' },
        { name: 'about.html', content: '<h1>About</h1>' },
      ]);
      mockUploadOk();
      mockUploadOk();
      mockDeployOk();
      const { adapter } = makeAdapter();

      await adapter.deploy(baseInput);

      // 2 uploads + 1 deploy
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('includes teamId query param when configured', async () => {
      mockFileSystem();
      mockUploadOk();
      mockDeployOk();
      const { adapter } = makeAdapter({ 'deployments.vercel.teamId': 'team_xyz' });

      await adapter.deploy(baseInput);

      const [uploadUrl] = mockFetch.mock.calls[0];
      expect(uploadUrl).toContain('?teamId=team_xyz');
      const [deployUrl] = mockFetch.mock.calls[1];
      expect(deployUrl).toContain('?teamId=team_xyz');
    });

    it('throws when upload returns non-ok status', async () => {
      mockFileSystem();
      mockFetch.mockResolvedValueOnce({ ok: false, status: 413 });
      const { adapter } = makeAdapter();

      await expect(adapter.deploy(baseInput)).rejects.toThrow(
        /Vercel upload failed.*413/,
      );
    });
  });

  // -----------------------------------------------------------------------
  // Deployment creation
  // -----------------------------------------------------------------------

  describe('deployment creation', () => {
    it('sends correct deployment payload', async () => {
      mockFileSystem([{ name: 'index.html', content: '<h1>Hi</h1>' }]);
      mockUploadOk();
      mockDeployOk();
      const { adapter } = makeAdapter();

      await adapter.deploy(baseInput);

      const [deployUrl, deployOpts] = mockFetch.mock.calls[1];
      expect(deployUrl).toBe('https://api.vercel.com/v13/deployments');
      expect(deployOpts.method).toBe('POST');

      const body = JSON.parse(deployOpts.body);
      expect(body.name).toBe('madcreate-tenant-1');
      expect(body.project).toBe('prj_123');
      expect(body.target).toBe('production');
      expect(body.files).toHaveLength(1);
      expect(body.files[0]).toEqual(
        expect.objectContaining({ file: 'index.html', sha: expect.any(String), size: expect.any(Number) }),
      );
    });

    it('returns correct DeploymentResult on success', async () => {
      mockFileSystem();
      mockUploadOk();
      mockDeployOk('my-app.vercel.app', 'dpl_42');
      const { adapter } = makeAdapter();

      const result = await adapter.deploy(baseInput);

      expect(result.artefactUrl).toBe('https://my-app.vercel.app');
      expect(result.version).toBe('dpl_42');
      expect(result.log).toContain('Vercel deployment dpl_42');
    });

    it('throws when deployment API returns an error', async () => {
      mockFileSystem();
      mockUploadOk();
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: { message: 'Invalid project' } }),
      });
      const { adapter } = makeAdapter();

      await expect(adapter.deploy(baseInput)).rejects.toThrow(
        /Vercel deploy failed.*Invalid project/,
      );
    });

    it('includes status code in error when no error message returned', async () => {
      mockFileSystem();
      mockUploadOk();
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({}),
      });
      const { adapter } = makeAdapter();

      await expect(adapter.deploy(baseInput)).rejects.toThrow(
        /Vercel deploy failed.*500/,
      );
    });
  });

  // -----------------------------------------------------------------------
  // Config from input overrides
  // -----------------------------------------------------------------------

  describe('config from input overrides', () => {
    it('uses vercel config from input.config when provided', async () => {
      mockFileSystem();
      mockUploadOk();
      mockDeployOk();
      // env has no vercel config
      const { adapter } = makeAdapter({
        'deployments.vercel.token': '',
        'deployments.vercel.projectId': '',
      });

      const input: DeploymentInput = {
        tenantId: 'tenant-1',
        config: {
          vercel: { token: 'input-token', projectId: 'prj_input' },
        },
      };

      await adapter.deploy(input);

      const [, uploadOpts] = mockFetch.mock.calls[0];
      expect(uploadOpts.headers.Authorization).toBe('Bearer input-token');
    });
  });
});
