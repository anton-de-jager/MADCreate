import { ConfigService } from '@nestjs/config';
import { SftpAdapter } from './sftp.adapter';
import type { DeploymentInput } from './adapter.interface';

// ---------------------------------------------------------------------------
// ssh2-sftp-client mock
// ---------------------------------------------------------------------------

const mockConnect = jest.fn().mockResolvedValue(undefined);
const mockMkdir = jest.fn().mockResolvedValue(undefined);
const mockPut = jest.fn().mockResolvedValue(undefined);
const mockEnd = jest.fn().mockResolvedValue(undefined);

jest.mock('ssh2-sftp-client', () => {
  return jest.fn().mockImplementation(() => ({
    connect: mockConnect,
    mkdir: mockMkdir,
    put: mockPut,
    end: mockEnd,
  }));
});

// ---------------------------------------------------------------------------
// node:fs mock – avoid real disk I/O
// ---------------------------------------------------------------------------

jest.mock('node:fs', () => {
  const readFile = jest.fn().mockResolvedValue(Buffer.from('fake-key'));
  const stat = jest.fn().mockResolvedValue({ size: 1024 });
  const readdir = jest.fn();
  return { promises: { readFile, readdir, stat } };
});

// Grab handles to the mocked fs functions after jest.mock hoisting
const mockFs = require('node:fs').promises;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Set up readdir to return a simple file tree: index.html + assets/style.css */
function setupReaddirMock() {
  let callCount = 0;
  mockFs.readdir.mockImplementation(() => {
    callCount++;
    if (callCount === 1) {
      return Promise.resolve([
        { name: 'index.html', isDirectory: () => false, isFile: () => true },
        { name: 'assets', isDirectory: () => true, isFile: () => false },
      ]);
    }
    return Promise.resolve([
      { name: 'style.css', isDirectory: () => false, isFile: () => true },
    ]);
  });
}

function makeConfig(overrides: Record<string, unknown> = {}): ConfigService {
  const store: Record<string, unknown> = {
    'deployments.sftp.host': 'sftp.example.com',
    'deployments.sftp.port': 22,
    'deployments.sftp.user': 'deployer',
    'deployments.sftp.pass': 's3cret',
    'deployments.sftp.keyPath': undefined,
    'deployments.sftp.remotePath': '/var/www/sites',
    ...overrides,
  };
  return { get: jest.fn((key: string) => store[key]) } as unknown as ConfigService;
}

function makeStaticExport(artefactUrl = 'file:///tmp/export/site-1') {
  return {
    deploy: jest.fn().mockResolvedValue({
      artefactUrl,
      log: 'Static export OK',
    }),
  };
}

function makeInput(config: Record<string, unknown> = {}): DeploymentInput {
  return { tenantId: 'tenant-1', siteId: 'site-1', config };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SftpAdapter', () => {
  let adapter: SftpAdapter;
  let configService: ConfigService;
  let staticExport: ReturnType<typeof makeStaticExport>;

  beforeEach(() => {
    mockConnect.mockReset().mockResolvedValue(undefined);
    mockMkdir.mockReset().mockResolvedValue(undefined);
    mockPut.mockReset().mockResolvedValue(undefined);
    mockEnd.mockReset().mockResolvedValue(undefined);
    mockFs.readFile.mockReset().mockResolvedValue(Buffer.from('fake-key'));
    mockFs.stat.mockReset().mockResolvedValue({ size: 1024 });
    mockFs.readdir.mockReset();
    setupReaddirMock();

    configService = makeConfig();
    staticExport = makeStaticExport();
    adapter = new SftpAdapter(configService, staticExport as never);
  });

  // -------------------------------------------------------------------------
  // Missing config
  // -------------------------------------------------------------------------

  describe('missing config', () => {
    it('throws when host is missing', async () => {
      configService = makeConfig({ 'deployments.sftp.host': '' });
      adapter = new SftpAdapter(configService, staticExport as never);

      await expect(adapter.deploy(makeInput())).rejects.toThrow('SFTP not configured');
    });

    it('throws when user is missing', async () => {
      configService = makeConfig({ 'deployments.sftp.user': '' });
      adapter = new SftpAdapter(configService, staticExport as never);

      await expect(adapter.deploy(makeInput())).rejects.toThrow('SFTP not configured');
    });

    it('throws when remotePath is missing', async () => {
      configService = makeConfig({ 'deployments.sftp.remotePath': '' });
      adapter = new SftpAdapter(configService, staticExport as never);

      await expect(adapter.deploy(makeInput())).rejects.toThrow('SFTP not configured');
    });

    it('throws when neither password nor keyPath is set', async () => {
      configService = makeConfig({
        'deployments.sftp.pass': undefined,
        'deployments.sftp.keyPath': undefined,
      });
      adapter = new SftpAdapter(configService, staticExport as never);

      await expect(adapter.deploy(makeInput())).rejects.toThrow('SFTP not configured');
    });
  });

  // -------------------------------------------------------------------------
  // Static export failure
  // -------------------------------------------------------------------------

  describe('static export failure', () => {
    it('throws when static export produces no artefactUrl', async () => {
      staticExport.deploy.mockResolvedValueOnce({
        artefactUrl: undefined,
        log: 'Static export OK',
      });

      await expect(adapter.deploy(makeInput())).rejects.toThrow(
        'Static export produced no local artefact',
      );
    });
  });

  // -------------------------------------------------------------------------
  // Successful upload
  // -------------------------------------------------------------------------

  describe('successful upload', () => {
    it('connects, uploads files recursively, and returns result', async () => {
      const result = await adapter.deploy(makeInput());

      // Connects with correct params
      expect(mockConnect).toHaveBeenCalledWith(
        expect.objectContaining({
          host: 'sftp.example.com',
          port: 22,
          username: 'deployer',
          password: 's3cret',
          readyTimeout: 20_000,
        }),
      );

      // Creates tenant subdirectory
      expect(mockMkdir).toHaveBeenCalledWith('/var/www/sites/tenant-1', true);

      // Uploads files via put
      expect(mockPut).toHaveBeenCalled();

      // Returns sftp:// artefactUrl
      expect(result.artefactUrl).toContain('sftp://deployer@sftp.example.com/var/www/sites/tenant-1');

      // Log contains connection and upload info
      expect(result.log).toContain('Connected to sftp.example.com:22');
      expect(result.log).toContain('Uploaded');
      expect(result.log).toContain('KB');

      // Version is a timestamp string
      expect(result.version).toBeDefined();
      expect(Number(result.version)).toBeGreaterThan(0);
    });

    it('uses keyPath instead of password when configured', async () => {
      configService = makeConfig({
        'deployments.sftp.pass': undefined,
        'deployments.sftp.keyPath': '/home/user/.ssh/id_rsa',
      });
      adapter = new SftpAdapter(configService, staticExport as never);

      await adapter.deploy(makeInput());

      expect(mockConnect).toHaveBeenCalledWith(
        expect.objectContaining({
          privateKey: Buffer.from('fake-key'),
          password: undefined,
        }),
      );
    });

    it('passes per-deployment sftp config overriding env defaults', async () => {
      const input = makeInput({
        sftp: {
          host: 'custom.host.com',
          user: 'custom-user',
          password: 'custom-pass',
          remotePath: '/custom/path',
          port: 2222,
        },
      });

      await adapter.deploy(input);

      expect(mockConnect).toHaveBeenCalledWith(
        expect.objectContaining({
          host: 'custom.host.com',
          port: 2222,
          username: 'custom-user',
          password: 'custom-pass',
        }),
      );
    });

    it('delegates to staticExport.deploy first', async () => {
      await adapter.deploy(makeInput());

      expect(staticExport.deploy).toHaveBeenCalledTimes(1);
      expect(staticExport.deploy).toHaveBeenCalledWith(makeInput());
    });
  });

  // -------------------------------------------------------------------------
  // Connection error handling
  // -------------------------------------------------------------------------

  describe('connection errors', () => {
    it('propagates SFTP connection errors', async () => {
      mockConnect.mockRejectedValueOnce(new Error('ECONNREFUSED'));

      await expect(adapter.deploy(makeInput())).rejects.toThrow('ECONNREFUSED');
    });

    it('propagates upload errors', async () => {
      mockPut.mockRejectedValueOnce(new Error('Permission denied'));

      await expect(adapter.deploy(makeInput())).rejects.toThrow('Permission denied');
    });
  });

  // -------------------------------------------------------------------------
  // Cleanup (disconnect in finally)
  // -------------------------------------------------------------------------

  describe('cleanup', () => {
    it('calls client.end() after successful upload', async () => {
      await adapter.deploy(makeInput());

      expect(mockEnd).toHaveBeenCalledTimes(1);
    });

    it('calls client.end() even when upload fails', async () => {
      mockPut.mockRejectedValueOnce(new Error('upload failed'));

      await expect(adapter.deploy(makeInput())).rejects.toThrow('upload failed');
      expect(mockEnd).toHaveBeenCalledTimes(1);
    });

    it('calls client.end() even when connect fails', async () => {
      mockConnect.mockRejectedValueOnce(new Error('connect failed'));

      await expect(adapter.deploy(makeInput())).rejects.toThrow('connect failed');
      expect(mockEnd).toHaveBeenCalledTimes(1);
    });

    it('swallows errors from client.end() silently', async () => {
      mockEnd.mockRejectedValueOnce(new Error('end failed'));

      // Should not throw from end() error
      const result = await adapter.deploy(makeInput());
      expect(result.artefactUrl).toBeDefined();
    });
  });
});
