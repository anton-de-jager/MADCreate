import { DeploymentStatus, DeploymentTarget } from '@prisma/client';
import { DeploymentProcessor } from './deployment.processor';
import {
  createMockPrisma,
  type PrismaService,
} from '../../test/mock-helpers';
import type { DeploymentAdapter, DeploymentResult } from './adapters/adapter.interface';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface MockDeploymentsService {
  emitChange: jest.Mock;
}

function createMockDeploymentsService(): MockDeploymentsService {
  return { emitChange: jest.fn() };
}

function createMockAdapter(): { deploy: jest.Mock<Promise<DeploymentResult>, [unknown]> } {
  return { deploy: jest.fn() };
}

function makeProcessor() {
  const prisma = createMockPrisma();
  const deploymentsService = createMockDeploymentsService();

  const adapters = {
    internal: createMockAdapter(),
    staticExport: createMockAdapter(),
    ftp: createMockAdapter(),
    sftp: createMockAdapter(),
    webhook: createMockAdapter(),
    cloudflarePages: createMockAdapter(),
    vercel: createMockAdapter(),
    digitalOcean: createMockAdapter(),
    docker: createMockAdapter(),
  };

  const processor = new DeploymentProcessor(
    prisma as unknown as PrismaService,
    deploymentsService as unknown as import('./deployments.service').DeploymentsService,
    adapters.internal as unknown as import('./adapters/internal.adapter').InternalAdapter,
    adapters.staticExport as unknown as import('./adapters/static-export.adapter').StaticExportAdapter,
    adapters.ftp as unknown as import('./adapters/ftp.adapter').FtpAdapter,
    adapters.sftp as unknown as import('./adapters/sftp.adapter').SftpAdapter,
    adapters.webhook as unknown as import('./adapters/webhook.adapter').WebhookAdapter,
    adapters.cloudflarePages as unknown as import('./adapters/cloudflare-pages.adapter').CloudflarePagesAdapter,
    adapters.vercel as unknown as import('./adapters/vercel.adapter').VercelAdapter,
    adapters.digitalOcean as unknown as import('./adapters/digital-ocean.adapter').DigitalOceanAdapter,
    adapters.docker as unknown as import('./adapters/docker.adapter').DockerAdapter,
  );

  return { processor, prisma, deploymentsService, adapters };
}

const fakeDeployment = {
  id: 'dep-1',
  tenantId: 'tenant-1',
  siteId: 'site-1',
  target: 'VERCEL' as DeploymentTarget,
  status: DeploymentStatus.PENDING,
  triggeredBy: 'user-1',
  config: { projectId: 'proj-123' },
  createdAt: new Date(),
  finishedAt: null,
  log: null,
  artefactUrl: null,
  startedAt: null,
  durationMs: null,
  updatedAt: new Date(),
  error: null,
  version: null,
};

function fakeJob(deploymentId = 'dep-1') {
  return { data: { deploymentId } } as import('bullmq').Job<{ deploymentId: string }>;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('DeploymentProcessor', () => {
  // ----- early return when deployment not found ----------------------------
  describe('process – deployment not found', () => {
    it('returns early without updating anything', async () => {
      const { processor, prisma, deploymentsService } = makeProcessor();
      prisma.deployment.findUnique.mockResolvedValue(null);

      const result = await processor.process(fakeJob('missing'));

      expect(prisma.deployment.findUnique).toHaveBeenCalledWith({ where: { id: 'missing' } });
      expect(prisma.deployment.update).not.toHaveBeenCalled();
      expect(deploymentsService.emitChange).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });
  });

  // ----- happy path -------------------------------------------------------
  describe('process – happy path (SUCCESS)', () => {
    it('sets RUNNING, calls adapter, then sets SUCCESS with duration', async () => {
      const { processor, prisma, deploymentsService, adapters } = makeProcessor();
      prisma.deployment.findUnique.mockResolvedValue(fakeDeployment);
      prisma.deployment.update.mockResolvedValue(fakeDeployment);
      adapters.vercel.deploy.mockResolvedValue({
        artefactUrl: 'https://example.com/build.zip',
        log: 'deployed OK',
        version: 'v1.2.3',
      });

      await processor.process(fakeJob());

      // First update → RUNNING
      const firstUpdate = prisma.deployment.update.mock.calls[0][0];
      expect(firstUpdate.where).toEqual({ id: 'dep-1' });
      expect(firstUpdate.data.status).toBe(DeploymentStatus.RUNNING);
      expect(firstUpdate.data.startedAt).toBeInstanceOf(Date);

      // Adapter called with correct input
      expect(adapters.vercel.deploy).toHaveBeenCalledWith({
        tenantId: 'tenant-1',
        siteId: 'site-1',
        config: { projectId: 'proj-123' },
      });

      // Second update → SUCCESS with duration tracking
      const secondUpdate = prisma.deployment.update.mock.calls[1][0];
      expect(secondUpdate.where).toEqual({ id: 'dep-1' });
      expect(secondUpdate.data.status).toBe(DeploymentStatus.SUCCESS);
      expect(secondUpdate.data.finishedAt).toBeInstanceOf(Date);
      expect(typeof secondUpdate.data.durationMs).toBe('number');
      expect(secondUpdate.data.durationMs).toBeGreaterThanOrEqual(0);
      expect(secondUpdate.data.artefactUrl).toBe('https://example.com/build.zip');
      expect(secondUpdate.data.log).toBe('deployed OK');
      expect(secondUpdate.data.version).toBe('v1.2.3');

      // SSE emitted twice (RUNNING + SUCCESS)
      expect(deploymentsService.emitChange).toHaveBeenCalledTimes(2);
    });

    it('handles adapter returning no optional fields', async () => {
      const { processor, prisma, adapters } = makeProcessor();
      prisma.deployment.findUnique.mockResolvedValue(fakeDeployment);
      prisma.deployment.update.mockResolvedValue(fakeDeployment);
      adapters.vercel.deploy.mockResolvedValue({});

      await processor.process(fakeJob());

      const secondUpdate = prisma.deployment.update.mock.calls[1][0];
      expect(secondUpdate.data.artefactUrl).toBeNull();
      expect(secondUpdate.data.log).toBeNull();
      expect(secondUpdate.data.version).toBeNull();
    });
  });

  // ----- failure path ------------------------------------------------------
  describe('process – failure path (FAILED)', () => {
    it('sets FAILED status and records error stack', async () => {
      const { processor, prisma, deploymentsService, adapters } = makeProcessor();
      prisma.deployment.findUnique.mockResolvedValue(fakeDeployment);
      prisma.deployment.update.mockResolvedValue(fakeDeployment);
      const deployError = new Error('Connection timeout');
      adapters.vercel.deploy.mockRejectedValue(deployError);

      await expect(processor.process(fakeJob())).rejects.toThrow('Connection timeout');

      // First update → RUNNING
      const firstUpdate = prisma.deployment.update.mock.calls[0][0];
      expect(firstUpdate.data.status).toBe(DeploymentStatus.RUNNING);

      // Second update → FAILED with duration
      const secondUpdate = prisma.deployment.update.mock.calls[1][0];
      expect(secondUpdate.data.status).toBe(DeploymentStatus.FAILED);
      expect(secondUpdate.data.finishedAt).toBeInstanceOf(Date);
      expect(typeof secondUpdate.data.durationMs).toBe('number');
      expect(secondUpdate.data.durationMs).toBeGreaterThanOrEqual(0);
      expect(secondUpdate.data.log).toBe(deployError.stack);

      // SSE emitted twice (RUNNING + FAILED)
      expect(deploymentsService.emitChange).toHaveBeenCalledTimes(2);
    });

    it('falls back to error message when stack is undefined', async () => {
      const { processor, prisma, adapters } = makeProcessor();
      prisma.deployment.findUnique.mockResolvedValue(fakeDeployment);
      prisma.deployment.update.mockResolvedValue(fakeDeployment);
      const err = { message: 'plain error', stack: undefined };
      adapters.vercel.deploy.mockRejectedValue(err);

      await expect(processor.process(fakeJob())).rejects.toBeDefined();

      const secondUpdate = prisma.deployment.update.mock.calls[1][0];
      expect(secondUpdate.data.log).toBe('plain error');
    });
  });

  // ----- adapter selection -------------------------------------------------
  describe('adapter selection (pick)', () => {
    const targets: Array<[DeploymentTarget, string]> = [
      ['INTERNAL' as DeploymentTarget, 'internal'],
      ['STATIC_EXPORT' as DeploymentTarget, 'staticExport'],
      ['SFTP' as DeploymentTarget, 'sftp'],
      ['FTP' as DeploymentTarget, 'ftp'],
      ['CUSTOM_WEBHOOK' as DeploymentTarget, 'webhook'],
      ['CLOUDFLARE_PAGES' as DeploymentTarget, 'cloudflarePages'],
      ['VERCEL' as DeploymentTarget, 'vercel'],
      ['DIGITAL_OCEAN' as DeploymentTarget, 'digitalOcean'],
      ['DOCKER' as DeploymentTarget, 'docker'],
    ];

    it.each(targets)('routes %s to the correct adapter', async (target, adapterKey) => {
      const { processor, prisma, adapters } = makeProcessor();
      const dep = { ...fakeDeployment, target };
      prisma.deployment.findUnique.mockResolvedValue(dep);
      prisma.deployment.update.mockResolvedValue(dep);
      const adapter = adapters[adapterKey as keyof typeof adapters];
      adapter.deploy.mockResolvedValue({});

      await processor.process(fakeJob());

      expect(adapter.deploy).toHaveBeenCalledTimes(1);
      // Ensure no other adapter was called
      for (const [key, a] of Object.entries(adapters)) {
        if (key !== adapterKey) {
          expect(a.deploy).not.toHaveBeenCalled();
        }
      }
    });
  });

  // ----- duration tracking -------------------------------------------------
  describe('duration tracking', () => {
    it('computes durationMs as finishedAt minus startedAt', async () => {
      const { processor, prisma, adapters } = makeProcessor();
      prisma.deployment.findUnique.mockResolvedValue(fakeDeployment);
      prisma.deployment.update.mockResolvedValue(fakeDeployment);
      adapters.vercel.deploy.mockResolvedValue({});

      await processor.process(fakeJob());

      const firstUpdate = prisma.deployment.update.mock.calls[0][0];
      const secondUpdate = prisma.deployment.update.mock.calls[1][0];
      const startedAt: Date = firstUpdate.data.startedAt;
      const finishedAt: Date = secondUpdate.data.finishedAt;
      const durationMs: number = secondUpdate.data.durationMs;

      expect(durationMs).toBe(finishedAt.getTime() - startedAt.getTime());
    });
  });
});
