import { NotFoundException } from '@nestjs/common';
import { DeploymentsService, CreateDeploymentDto } from './deployments.service';
import { DeploymentStatus, DeploymentTarget } from '@prisma/client';
import {
  createMockPrisma,
  createMockTenantsService,
  createMockQueue,
  type PrismaService,
  type TenantsService,
  type Queue,
} from '../../test/mock-helpers';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeService() {
  const prisma = createMockPrisma();
  const tenants = createMockTenantsService();
  const queue = createMockQueue();
  tenants.get.mockResolvedValue({ id: 'tenant-1', name: 'Acme' });
  queue.add.mockResolvedValue(undefined);
  const svc = new DeploymentsService(
    prisma as unknown as PrismaService,
    tenants as unknown as TenantsService,
    queue as unknown as Queue,
  );
  return { svc, prisma, tenants, queue };
}

const fakeDeployment = {
  id: 'dep-1',
  tenantId: 'tenant-1',
  siteId: 'site-1',
  target: 'VERCEL' as DeploymentTarget,
  status: DeploymentStatus.PENDING,
  triggeredBy: 'user-1',
  config: {},
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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('DeploymentsService', () => {
  // ----- list --------------------------------------------------------------
  describe('list', () => {
    it('verifies tenant access and returns deployments', async () => {
      const { svc, prisma, tenants } = makeService();
      prisma.deployment.findMany.mockResolvedValue([fakeDeployment]);

      const result = await svc.list('user-1', 'tenant-1');

      expect(tenants.get).toHaveBeenCalledWith('user-1', 'tenant-1');
      expect(prisma.deployment.findMany).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-1' },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      expect(result).toEqual([fakeDeployment]);
    });

    it('throws when tenant access check fails', async () => {
      const { svc, tenants } = makeService();
      tenants.get.mockRejectedValue(new NotFoundException());

      try {
        await svc.list('user-1', 'bad-tenant');
        fail('Expected list to throw');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(NotFoundException);
      }
    });
  });

  // ----- get ---------------------------------------------------------------
  describe('get', () => {
    it('returns the deployment when found and tenant access is valid', async () => {
      const { svc, prisma, tenants } = makeService();
      prisma.deployment.findUnique.mockResolvedValue(fakeDeployment);

      const result = await svc.get('user-1', 'dep-1');

      expect(prisma.deployment.findUnique).toHaveBeenCalledWith({ where: { id: 'dep-1' } });
      expect(tenants.get).toHaveBeenCalledWith('user-1', 'tenant-1');
      expect(result).toEqual(fakeDeployment);
    });

    it('throws NotFoundException when deployment does not exist', async () => {
      const { svc, prisma } = makeService();
      prisma.deployment.findUnique.mockResolvedValue(null);

      try {
        await svc.get('user-1', 'no-dep');
        fail('Expected get to throw');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(NotFoundException);
      }
    });

    it('throws when tenant access check fails', async () => {
      const { svc, prisma, tenants } = makeService();
      prisma.deployment.findUnique.mockResolvedValue(fakeDeployment);
      tenants.get.mockRejectedValue(new NotFoundException());

      try {
        await svc.get('user-1', 'dep-1');
        fail('Expected get to throw');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(NotFoundException);
      }
    });
  });

  // ----- trigger -----------------------------------------------------------
  describe('trigger', () => {
    it('creates a deployment and enqueues a job', async () => {
      const { svc, prisma, tenants, queue } = makeService();
      prisma.deployment.create.mockResolvedValue(fakeDeployment);

      const dto: CreateDeploymentDto = { siteId: 'site-1', target: 'VERCEL' as DeploymentTarget, config: { foo: 'bar' } };
      const result = await svc.trigger('user-1', 'tenant-1', dto);

      expect(tenants.get).toHaveBeenCalledWith('user-1', 'tenant-1');
      expect(prisma.deployment.create).toHaveBeenCalledWith({
        data: {
          tenantId: 'tenant-1',
          siteId: 'site-1',
          target: 'VERCEL',
          status: DeploymentStatus.PENDING,
          triggeredBy: 'user-1',
          config: { foo: 'bar' },
        },
      });
      expect(queue.add).toHaveBeenCalledWith('run', { deploymentId: 'dep-1' }, { jobId: 'dep-1' });
      expect(result.id).toBe('dep-1');
    });

    it('defaults config to empty object when not provided', async () => {
      const { svc, prisma } = makeService();
      prisma.deployment.create.mockResolvedValue(fakeDeployment);

      const dto: CreateDeploymentDto = { target: 'VERCEL' as DeploymentTarget };
      await svc.trigger('user-1', 'tenant-1', dto);

      const createArg = prisma.deployment.create.mock.calls[0][0];
      expect(createArg.data.config).toEqual({});
    });
  });

  // ----- cancel ------------------------------------------------------------
  describe('cancel', () => {
    it('cancels a PENDING deployment', async () => {
      const { svc, prisma } = makeService();
      const pending = { ...fakeDeployment, status: DeploymentStatus.PENDING };
      prisma.deployment.findUnique.mockResolvedValue(pending);
      const cancelled = { ...pending, status: DeploymentStatus.CANCELLED };
      prisma.deployment.update.mockResolvedValue(cancelled);

      const result = await svc.cancel('user-1', 'dep-1');

      expect(prisma.deployment.update).toHaveBeenCalledTimes(1);
      const updateArg = prisma.deployment.update.mock.calls[0][0];
      expect(updateArg.where).toEqual({ id: 'dep-1' });
      expect(updateArg.data.status).toBe(DeploymentStatus.CANCELLED);
      expect(updateArg.data.finishedAt).toBeDefined();
      expect(result.status).toBe(DeploymentStatus.CANCELLED);
    });

    it('cancels a RUNNING deployment', async () => {
      const { svc, prisma } = makeService();
      const running = { ...fakeDeployment, status: DeploymentStatus.RUNNING };
      prisma.deployment.findUnique.mockResolvedValue(running);
      const cancelled = { ...running, status: DeploymentStatus.CANCELLED };
      prisma.deployment.update.mockResolvedValue(cancelled);

      const result = await svc.cancel('user-1', 'dep-1');

      expect(prisma.deployment.update).toHaveBeenCalledTimes(1);
      expect(result.status).toBe(DeploymentStatus.CANCELLED);
    });

    it('returns deployment unchanged when status is already terminal', async () => {
      const { svc, prisma } = makeService();
      const succeeded = { ...fakeDeployment, status: DeploymentStatus.SUCCESS };
      prisma.deployment.findUnique.mockResolvedValue(succeeded);

      const result = await svc.cancel('user-1', 'dep-1');

      expect(prisma.deployment.update).not.toHaveBeenCalled();
      expect(result.status).toBe(DeploymentStatus.SUCCESS);
    });

    it('throws NotFoundException when deployment does not exist', async () => {
      const { svc, prisma } = makeService();
      prisma.deployment.findUnique.mockResolvedValue(null);

      try {
        await svc.cancel('user-1', 'no-dep');
        fail('Expected cancel to throw');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(NotFoundException);
      }
    });
  });
});
