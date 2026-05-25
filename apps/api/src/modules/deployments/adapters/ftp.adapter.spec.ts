import { ConfigService } from '@nestjs/config';
import { FtpAdapter } from './ftp.adapter';
import { StaticExportAdapter } from './static-export.adapter';
import type { DeploymentInput, DeploymentResult } from './adapter.interface';

// ---------------------------------------------------------------------------
// basic-ftp mock
// ---------------------------------------------------------------------------

const mockAccess = jest.fn().mockResolvedValue(undefined);
const mockEnsureDir = jest.fn().mockResolvedValue(undefined);
const mockClearWorkingDir = jest.fn().mockResolvedValue(undefined);
const mockUploadFromDir = jest.fn().mockResolvedValue(undefined);
const mockClose = jest.fn();

jest.mock('basic-ftp', () => ({
  Client: jest.fn().mockImplementation(() => ({
    ftp: { verbose: false },
    access: mockAccess,
    ensureDir: mockEnsureDir,
    clearWorkingDir: mockClearWorkingDir,
    uploadFromDir: mockUploadFromDir,
    close: mockClose,
  })),
}));

// ---------------------------------------------------------------------------
// fs mock – used by summarize()
// ---------------------------------------------------------------------------

jest.mock('node:fs', () => ({
  promises: {
    readdir: jest.fn().mockResolvedValue([
      { name: 'index.html', isDirectory: () => false },
      { name: 'style.css', isDirectory: () => false },
    ]),
    stat: jest.fn().mockResolvedValue({ size: 512 }),
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeConfigService(overrides: Record<string, unknown> = {}): ConfigService {
  const defaults: Record<string, unknown> = {
    'deployments.ftp.host': undefined,
    'deployments.ftp.port': undefined,
    'deployments.ftp.user': undefined,
    'deployments.ftp.pass': undefined,
    'deployments.ftp.remotePath': undefined,
  };
  const merged = { ...defaults, ...overrides };
  return { get: jest.fn((key: string) => merged[key]) } as unknown as ConfigService;
}

function makeStaticExport(result?: Partial<DeploymentResult>): StaticExportAdapter {
  return {
    deploy: jest.fn().mockResolvedValue({
      artefactUrl: 'file:///tmp/export/tenant-1',
      log: 'Static export complete.',
      ...result,
    }),
  } as unknown as StaticExportAdapter;
}

function makeInput(config: Record<string, unknown> = {}): DeploymentInput {
  return { tenantId: 'tenant-1', siteId: 'site-1', config };
}

const ftpConfig = {
  host: 'ftp.example.com',
  user: 'deploy',
  password: 's3cret',
  remotePath: '/var/www',
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('FtpAdapter', () => {
  let adapter: FtpAdapter;
  let configService: ConfigService;
  let staticExport: StaticExportAdapter;

  beforeEach(() => {
    jest.clearAllMocks();
    configService = makeConfigService();
    staticExport = makeStaticExport();
    adapter = new FtpAdapter(configService, staticExport);
  });

  // -------------------------------------------------------------------------
  // Missing config
  // -------------------------------------------------------------------------

  describe('missing config', () => {
    it('throws when no FTP config is supplied and env vars are absent', async () => {
      await expect(adapter.deploy(makeInput())).rejects.toThrow(
        'FTP not configured',
      );
    });

    it('throws when host is missing', async () => {
      await expect(
        adapter.deploy(makeInput({ ftp: { ...ftpConfig, host: '' } })),
      ).rejects.toThrow('FTP not configured');
    });

    it('throws when user is missing', async () => {
      await expect(
        adapter.deploy(makeInput({ ftp: { ...ftpConfig, user: '' } })),
      ).rejects.toThrow('FTP not configured');
    });

    it('throws when password is missing', async () => {
      await expect(
        adapter.deploy(makeInput({ ftp: { ...ftpConfig, password: '' } })),
      ).rejects.toThrow('FTP not configured');
    });

    it('throws when remotePath is missing', async () => {
      await expect(
        adapter.deploy(makeInput({ ftp: { ...ftpConfig, remotePath: '' } })),
      ).rejects.toThrow('FTP not configured');
    });
  });

  // -------------------------------------------------------------------------
  // Successful upload
  // -------------------------------------------------------------------------

  describe('successful upload', () => {
    it('connects, uploads, and returns an ftp artefact URL', async () => {
      const result = await adapter.deploy(makeInput({ ftp: ftpConfig }));

      expect(staticExport.deploy).toHaveBeenCalledTimes(1);
      expect(mockAccess).toHaveBeenCalledWith(
        expect.objectContaining({
          host: 'ftp.example.com',
          port: 21,
          user: 'deploy',
          password: 's3cret',
          secure: false,
        }),
      );
      expect(mockEnsureDir).toHaveBeenCalledWith('/var/www/tenant-1');
      expect(mockClearWorkingDir).toHaveBeenCalled();
      expect(mockUploadFromDir).toHaveBeenCalledWith('/tmp/export/tenant-1');

      expect(result.artefactUrl).toBe('ftp://deploy@ftp.example.com/var/www/tenant-1');
      expect(result.log).toContain('Connected to ftp://ftp.example.com:21');
      expect(result.log).toContain('Uploaded 2 files');
      expect(result.version).toBeDefined();
    });

    it('uses secure flag when configured', async () => {
      const result = await adapter.deploy(
        makeInput({ ftp: { ...ftpConfig, secure: true } }),
      );

      expect(mockAccess).toHaveBeenCalledWith(
        expect.objectContaining({ secure: true }),
      );
      expect(result.artefactUrl).toContain('ftps://');
      expect(result.log).toContain('ftps://');
    });

    it('uses custom port when supplied', async () => {
      await adapter.deploy(
        makeInput({ ftp: { ...ftpConfig, port: 2121 } }),
      );

      expect(mockAccess).toHaveBeenCalledWith(
        expect.objectContaining({ port: 2121 }),
      );
    });

    it('falls back to env config when input.config.ftp is undefined', async () => {
      configService = makeConfigService({
        'deployments.ftp.host': 'env.example.com',
        'deployments.ftp.user': 'envuser',
        'deployments.ftp.pass': 'envpass',
        'deployments.ftp.remotePath': '/env/www',
      });
      adapter = new FtpAdapter(configService, staticExport);

      const result = await adapter.deploy(makeInput());

      expect(mockAccess).toHaveBeenCalledWith(
        expect.objectContaining({ host: 'env.example.com', user: 'envuser' }),
      );
      expect(result.artefactUrl).toContain('env.example.com');
    });

    it('strips trailing slashes from remotePath', async () => {
      await adapter.deploy(
        makeInput({ ftp: { ...ftpConfig, remotePath: '/var/www///' } }),
      );

      expect(mockEnsureDir).toHaveBeenCalledWith('/var/www/tenant-1');
    });
  });

  // -------------------------------------------------------------------------
  // Static export failure
  // -------------------------------------------------------------------------

  describe('static export failure', () => {
    it('throws when static export returns no artefactUrl', async () => {
      staticExport = makeStaticExport({ artefactUrl: undefined });
      adapter = new FtpAdapter(configService, staticExport);

      await expect(
        adapter.deploy(makeInput({ ftp: ftpConfig })),
      ).rejects.toThrow('Static export produced no local artefact');
    });
  });

  // -------------------------------------------------------------------------
  // Connection errors
  // -------------------------------------------------------------------------

  describe('connection errors', () => {
    it('throws when FTP access fails', async () => {
      mockAccess.mockRejectedValueOnce(new Error('ECONNREFUSED'));

      await expect(
        adapter.deploy(makeInput({ ftp: ftpConfig })),
      ).rejects.toThrow('ECONNREFUSED');
    });

    it('throws when upload fails', async () => {
      mockUploadFromDir.mockRejectedValueOnce(new Error('Transfer failed'));

      await expect(
        adapter.deploy(makeInput({ ftp: ftpConfig })),
      ).rejects.toThrow('Transfer failed');
    });
  });

  // -------------------------------------------------------------------------
  // Cleanup (finally block)
  // -------------------------------------------------------------------------

  describe('cleanup', () => {
    it('closes the client after a successful upload', async () => {
      await adapter.deploy(makeInput({ ftp: ftpConfig }));

      expect(mockClose).toHaveBeenCalledTimes(1);
    });

    it('closes the client even when access fails', async () => {
      mockAccess.mockRejectedValueOnce(new Error('ECONNREFUSED'));

      await expect(
        adapter.deploy(makeInput({ ftp: ftpConfig })),
      ).rejects.toThrow();

      expect(mockClose).toHaveBeenCalledTimes(1);
    });

    it('closes the client even when upload fails', async () => {
      mockUploadFromDir.mockRejectedValueOnce(new Error('Transfer failed'));

      await expect(
        adapter.deploy(makeInput({ ftp: ftpConfig })),
      ).rejects.toThrow();

      expect(mockClose).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------------------
  // clearWorkingDir failure is swallowed
  // -------------------------------------------------------------------------

  describe('clearWorkingDir soft failure', () => {
    it('continues when clearWorkingDir rejects', async () => {
      mockClearWorkingDir.mockRejectedValueOnce(new Error('Not empty'));

      const result = await adapter.deploy(makeInput({ ftp: ftpConfig }));

      expect(result.artefactUrl).toBeDefined();
      expect(mockUploadFromDir).toHaveBeenCalled();
    });
  });
});
