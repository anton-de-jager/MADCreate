import { ConfigService } from '@nestjs/config';
import { DockerAdapter } from './docker.adapter';
import { StaticExportAdapter } from './static-export.adapter';
import type { DeploymentInput, DeploymentResult } from './adapter.interface';

// ---------------------------------------------------------------------------
// child_process mock
// ---------------------------------------------------------------------------

import { EventEmitter } from 'node:events';

const spawnMock = jest.fn();
jest.mock('node:child_process', () => ({ spawn: (...a: any[]) => spawnMock(...a) }));

// ---------------------------------------------------------------------------
// fs mock
// ---------------------------------------------------------------------------

const writeFileMock = jest.fn().mockResolvedValue(undefined);
jest.mock('node:fs', () => ({
  promises: { writeFile: (...a: any[]) => writeFileMock(...a) },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Creates a fake child-process that emits events on the next tick. */
function fakeProc(stdout = '', stderr = '', exitCode = 0, spawnError?: Error) {
  const proc: any = new EventEmitter();
  proc.stdout = new EventEmitter();
  proc.stderr = new EventEmitter();
  proc.stdin = { write: jest.fn(), end: jest.fn() };

  // Defer events so runDocker can attach listeners first
  process.nextTick(() => {
    if (spawnError) {
      proc.emit('error', spawnError);
      return;
    }
    if (stdout) proc.stdout.emit('data', Buffer.from(stdout));
    if (stderr) proc.stderr.emit('data', Buffer.from(stderr));
    proc.emit('close', exitCode);
  });

  return proc;
}

/**
 * Queue spawn behaviours.  Each entry describes what fakeProc should return
 * for the Nth call to spawn.  We use mockImplementation so fakeProc is
 * invoked lazily (at call-time), not eagerly (at setup-time).
 */
function queueSpawns(...specs: Array<{ stdout?: string; stderr?: string; exitCode?: number; spawnError?: Error }>) {
  const q = [...specs];
  spawnMock.mockImplementation(() => {
    const s = q.shift() ?? {};
    return fakeProc(s.stdout ?? '', s.stderr ?? '', s.exitCode ?? 0, s.spawnError);
  });
}

function makeAdapter(
  configOverrides: Record<string, string | undefined> = {},
  staticResult: Partial<DeploymentResult> = {},
) {
  const configMap: Record<string, string | undefined> = {
    'deployments.docker.image': undefined,
    'deployments.docker.registryUser': undefined,
    'deployments.docker.registryPass': undefined,
    'deployments.docker.baseImage': undefined,
    ...configOverrides,
  };
  const config = { get: jest.fn((key: string) => configMap[key]) } as unknown as ConfigService;

  const staticExport = {
    deploy: jest.fn().mockResolvedValue({
      artefactUrl: 'file:///tmp/site-out',
      log: 'static export ok',
      ...staticResult,
    }),
  } as unknown as StaticExportAdapter;

  const adapter = new DockerAdapter(config, staticExport);
  return { adapter, config, staticExport };
}

const defaultInput: DeploymentInput = {
  tenantId: 'tenant-1',
  config: {
    docker: { image: 'registry.example.com/madcreate/tenant' },
  },
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('DockerAdapter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // Missing config
  // -----------------------------------------------------------------------

  describe('missing config', () => {
    it('throws when docker.image is missing from both input and env', async () => {
      const { adapter } = makeAdapter();
      const input: DeploymentInput = { tenantId: 'tenant-1', config: {} };

      await expect(adapter.deploy(input)).rejects.toThrow(
        'Docker target requires deployment.config.docker.image',
      );
    });

    it('throws when input.config.docker is undefined and env image is unset', async () => {
      const { adapter } = makeAdapter();
      const input: DeploymentInput = { tenantId: 'tenant-1', config: {} };

      await expect(adapter.deploy(input)).rejects.toThrow(
        'Docker target requires',
      );
    });

    it('throws when static export produces no artefact', async () => {
      const { adapter } = makeAdapter({}, { artefactUrl: undefined });

      await expect(adapter.deploy(defaultInput)).rejects.toThrow(
        'Static export produced no local artefact',
      );
    });
  });

  // -----------------------------------------------------------------------
  // Successful image build & push
  // -----------------------------------------------------------------------

  describe('successful build & push', () => {
    it('builds and pushes an image, returning docker:// artefact URL', async () => {
      queueSpawns(
        { stdout: 'build output' },
        { stdout: 'push output' },
      );

      const { adapter, staticExport } = makeAdapter();
      const result = await adapter.deploy(defaultInput);

      // static export called first
      expect(staticExport.deploy).toHaveBeenCalledWith(defaultInput);

      // Dockerfile written
      expect(writeFileMock).toHaveBeenCalledWith(
        expect.stringContaining('Dockerfile'),
        expect.stringContaining('FROM nginx:1.27-alpine'),
        'utf8',
      );

      // docker build called
      expect(spawnMock).toHaveBeenCalledWith(
        'docker',
        expect.arrayContaining(['build', '-t']),
        expect.any(Object),
      );

      // docker push called
      expect(spawnMock).toHaveBeenCalledWith(
        'docker',
        expect.arrayContaining(['push']),
        expect.any(Object),
      );

      expect(result.artefactUrl).toMatch(/^docker:\/\/registry\.example\.com\/madcreate\/tenant:/);
      expect(result.version).toBeDefined();
      expect(result.log).toContain('static export ok');
    });

    it('uses image from env when input.config.docker.image is absent', async () => {
      queueSpawns({}, {});

      const { adapter } = makeAdapter({
        'deployments.docker.image': 'env-registry.io/img',
      });
      const input: DeploymentInput = {
        tenantId: 'tenant-1',
        config: { docker: {} },
      };

      const result = await adapter.deploy(input);

      expect(result.artefactUrl).toMatch(/^docker:\/\/env-registry\.io\/img:/);
    });

    it('uses custom baseImage when provided', async () => {
      queueSpawns({}, {});

      const { adapter } = makeAdapter();
      const input: DeploymentInput = {
        tenantId: 'tenant-1',
        config: {
          docker: { image: 'reg.io/app', baseImage: 'httpd:2.4-alpine' },
        },
      };

      await adapter.deploy(input);

      expect(writeFileMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('FROM httpd:2.4-alpine'),
        'utf8',
      );
    });

    it('uses custom tag when provided', async () => {
      queueSpawns({}, {});

      const { adapter } = makeAdapter();
      const input: DeploymentInput = {
        tenantId: 'tenant-1',
        config: {
          docker: { image: 'reg.io/app', tag: 'v1.0.0' },
        },
      };

      const result = await adapter.deploy(input);

      expect(result.artefactUrl).toBe('docker://reg.io/app:v1.0.0');
      expect(result.version).toBe('v1.0.0');
    });
  });

  // -----------------------------------------------------------------------
  // Registry login
  // -----------------------------------------------------------------------

  describe('registry login', () => {
    it('logs in before build when registryUser and registryPass are provided', async () => {
      queueSpawns(
        { stdout: 'login ok' },
        { stdout: 'build ok' },
        { stdout: 'push ok' },
      );

      const { adapter } = makeAdapter();
      const input: DeploymentInput = {
        tenantId: 'tenant-1',
        config: {
          docker: {
            image: 'registry.example.com/madcreate/tenant',
            registryUser: 'user',
            registryPass: 'pass',
          },
        },
      };

      await adapter.deploy(input);

      // login call should include --password-stdin and the registry host
      const loginCall = spawnMock.mock.calls[0];
      expect(loginCall[0]).toBe('docker');
      expect(loginCall[1]).toContain('login');
      expect(loginCall[1]).toContain('--username');
      expect(loginCall[1]).toContain('user');
      expect(loginCall[1]).toContain('registry.example.com');

      // password piped via stdin
      const loginProc = spawnMock.mock.results[0].value;
      expect(loginProc.stdin.write).toHaveBeenCalledWith('pass');
      expect(loginProc.stdin.end).toHaveBeenCalled();
    });

    it('skips login when registryUser / registryPass are absent', async () => {
      queueSpawns({}, {});

      const { adapter } = makeAdapter();
      await adapter.deploy(defaultInput);

      // Only 2 calls: build + push (no login)
      expect(spawnMock).toHaveBeenCalledTimes(2);
    });
  });

  // -----------------------------------------------------------------------
  // CLI error handling
  // -----------------------------------------------------------------------

  describe('CLI error handling', () => {
    it('rejects when docker build exits with non-zero code', async () => {
      queueSpawns({ stderr: 'build error output', exitCode: 1 });

      const { adapter } = makeAdapter();

      await expect(adapter.deploy(defaultInput)).rejects.toThrow(
        /docker build exited 1/,
      );
    });

    it('rejects when docker push exits with non-zero code', async () => {
      queueSpawns(
        { stdout: 'build ok' },
        { stderr: 'push denied', exitCode: 1 },
      );

      const { adapter } = makeAdapter();

      await expect(adapter.deploy(defaultInput)).rejects.toThrow(
        /docker push exited 1/,
      );
    });

    it('rejects when docker fails to spawn', async () => {
      queueSpawns({ spawnError: new Error('ENOENT: docker not found') });

      const { adapter } = makeAdapter();

      await expect(adapter.deploy(defaultInput)).rejects.toThrow(
        /failed to spawn/,
      );
    });

    it('includes stderr in error message on non-zero exit', async () => {
      queueSpawns({ stderr: 'permission denied', exitCode: 127 });

      const { adapter } = makeAdapter();

      await expect(adapter.deploy(defaultInput)).rejects.toThrow(
        'permission denied',
      );
    });
  });
});
