import { ForbiddenException } from '@nestjs/common';
import { AdminService } from './admin.service';
import { createMockPrisma, type PrismaService } from '../../test/mock-helpers';
import type { JwtPayload } from '@madcreate/shared';

function makeService() {
  const prisma = createMockPrisma();
  const svc = new AdminService(prisma as unknown as PrismaService);
  return { svc, prisma };
}

describe('AdminService', () => {
  // -----------------------------------------------------------------------
  // assertSuperAdmin
  // -----------------------------------------------------------------------
  describe('assertSuperAdmin', () => {
    it('passes for a super-admin user', () => {
      const { svc } = makeService();
      const user: JwtPayload = { sub: 'u1', email: 'a@test.com', superAdmin: true };
      expect(() => svc.assertSuperAdmin(user)).not.toThrow();
    });

    it('throws ForbiddenException for a non-admin user', () => {
      const { svc } = makeService();
      const user: JwtPayload = { sub: 'u1', email: 'a@test.com', superAdmin: false };
      expect(() => svc.assertSuperAdmin(user)).toThrow(ForbiddenException);
    });

    it('throws ForbiddenException for undefined user', () => {
      const { svc } = makeService();
      expect(() => svc.assertSuperAdmin(undefined)).toThrow(ForbiddenException);
    });
  });

  // -----------------------------------------------------------------------
  // overview
  // -----------------------------------------------------------------------
  describe('overview', () => {
    it('returns all 7 count values', async () => {
      const { svc, prisma } = makeService();
      prisma.workspace.count.mockResolvedValue(10);
      prisma.tenant.count.mockResolvedValue(20);
      prisma.user.count.mockResolvedValue(30);
      prisma.site.count.mockResolvedValue(40);
      prisma.deployment.count.mockResolvedValue(50);
      prisma.aIGeneration.count.mockResolvedValue(60);
      prisma.domain.count.mockResolvedValue(70);

      const result = await svc.overview();

      expect(result).toEqual({
        workspaces: 10,
        tenants: 20,
        users: 30,
        sites: 40,
        deployments: 50,
        aiGenerations: 60,
        customDomains: 70,
      });
      expect(prisma.workspace.count).toHaveBeenCalledTimes(1);
      expect(prisma.tenant.count).toHaveBeenCalledTimes(1);
      expect(prisma.user.count).toHaveBeenCalledTimes(1);
      expect(prisma.site.count).toHaveBeenCalledTimes(1);
      expect(prisma.deployment.count).toHaveBeenCalledTimes(1);
      expect(prisma.aIGeneration.count).toHaveBeenCalledTimes(1);
      expect(prisma.domain.count).toHaveBeenCalledTimes(1);
    });
  });

  // -----------------------------------------------------------------------
  // listTenants
  // -----------------------------------------------------------------------
  describe('listTenants', () => {
    const fakeTenant = {
      id: 't1',
      slug: 'my-tenant',
      name: 'My Tenant',
      status: 'LIVE' as const,
      createdAt: new Date('2025-01-01'),
      workspace: {
        id: 'w1',
        name: 'Workspace 1',
        slug: 'ws-1',
        members: [{ user: { email: 'owner@test.com' } }],
      },
      sites: [{ id: 's1' }, { id: 's2' }],
      deployments: [{ createdAt: new Date('2025-06-01') }],
    };

    it('returns mapped tenant summaries', async () => {
      const { svc, prisma } = makeService();
      prisma.tenant.findMany.mockResolvedValue([fakeTenant]);

      const result = await svc.listTenants();

      expect(result.length).toBe(1);
      expect(result[0].id).toBe('t1');
      expect(result[0].slug).toBe('my-tenant');
      expect(result[0].name).toBe('My Tenant');
      expect(result[0].status).toBe('LIVE');
      expect(result[0].workspace).toEqual({ id: 'w1', name: 'Workspace 1', slug: 'ws-1' });
      expect(result[0].ownerEmail).toBe('owner@test.com');
      expect(result[0].siteCount).toBe(2);
      expect(result[0].lastDeploy).toEqual(new Date('2025-06-01'));
    });

    it('passes search and status filters to prisma', async () => {
      const { svc, prisma } = makeService();
      prisma.tenant.findMany.mockResolvedValue([]);

      await svc.listTenants('acme', 'LIVE');

      const call = prisma.tenant.findMany.mock.calls[0][0];
      expect(call.where.deletedAt).toBeNull();
      expect(call.where.OR).toEqual([{ slug: { contains: 'acme' } }, { name: { contains: 'acme' } }]);
      expect(call.where.status).toBe('LIVE');
    });

    it('returns null ownerEmail when no workspace owner exists', async () => {
      const { svc, prisma } = makeService();
      const noOwner = { ...fakeTenant, workspace: { ...fakeTenant.workspace, members: [] } };
      prisma.tenant.findMany.mockResolvedValue([noOwner]);

      const result = await svc.listTenants();
      expect(result[0].ownerEmail).toBeNull();
    });

    it('returns null lastDeploy when no deployments exist', async () => {
      const { svc, prisma } = makeService();
      const noDeploy = { ...fakeTenant, deployments: [] };
      prisma.tenant.findMany.mockResolvedValue([noDeploy]);

      const result = await svc.listTenants();
      expect(result[0].lastDeploy).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // listFeatureFlags
  // -----------------------------------------------------------------------
  describe('listFeatureFlags', () => {
    it('returns flags sorted by key', async () => {
      const { svc, prisma } = makeService();
      const flags = [
        { id: 'f1', key: 'alpha', enabled: true },
        { id: 'f2', key: 'beta', enabled: false },
      ];
      prisma.featureFlag.findMany.mockResolvedValue(flags);

      const result = await svc.listFeatureFlags();

      expect(result.length).toBe(2);
      expect(result[0].key).toBe('alpha');
      expect(result[1].key).toBe('beta');
      expect(prisma.featureFlag.findMany).toHaveBeenCalledWith({ orderBy: { key: 'asc' } });
    });
  });

  // -----------------------------------------------------------------------
  // setFlag
  // -----------------------------------------------------------------------
  describe('setFlag', () => {
    it('uses upsert for workspace-scoped flag', async () => {
      const { svc, prisma } = makeService();
      const flag = { id: 'f1', key: 'beta', enabled: true, workspaceId: 'w1' };
      prisma.featureFlag.upsert.mockResolvedValue(flag);

      const result = await svc.setFlag('beta', true, 'w1');

      expect(result.id).toBe('f1');
      expect(prisma.featureFlag.upsert).toHaveBeenCalledWith({
        where: { workspaceId_key: { workspaceId: 'w1', key: 'beta' } },
        update: { enabled: true },
        create: { key: 'beta', enabled: true, workspaceId: 'w1' },
      });
    });

    it('creates new flag when no global flag exists', async () => {
      const { svc, prisma } = makeService();
      prisma.featureFlag.findFirst.mockResolvedValue(null);
      const created = { id: 'f2', key: 'gamma', enabled: false };
      prisma.featureFlag.create.mockResolvedValue(created);

      const result = await svc.setFlag('gamma', false);

      expect(result.id).toBe('f2');
      expect(prisma.featureFlag.findFirst).toHaveBeenCalledWith({ where: { key: 'gamma', workspaceId: null } });
      expect(prisma.featureFlag.create).toHaveBeenCalledWith({ data: { key: 'gamma', enabled: false } });
    });

    it('updates existing global flag when found', async () => {
      const { svc, prisma } = makeService();
      const existing = { id: 'f3', key: 'delta', enabled: false, workspaceId: null };
      prisma.featureFlag.findFirst.mockResolvedValue(existing);
      const updated = { ...existing, enabled: true };
      prisma.featureFlag.update.mockResolvedValue(updated);

      const result = await svc.setFlag('delta', true);

      expect(result.enabled).toBe(true);
      expect(prisma.featureFlag.update).toHaveBeenCalledWith({
        where: { id: 'f3' },
        data: { enabled: true },
      });
    });
  });

  // -----------------------------------------------------------------------
  // suspendTenant / unsuspendTenant / softDeleteTenant
  // -----------------------------------------------------------------------
  describe('suspendTenant', () => {
    it('sets status to ARCHIVED', async () => {
      const { svc, prisma } = makeService();
      prisma.tenant.update.mockResolvedValue({ id: 't1', status: 'ARCHIVED' });

      await svc.suspendTenant('t1');

      expect(prisma.tenant.update).toHaveBeenCalledWith({ where: { id: 't1' }, data: { status: 'ARCHIVED' } });
    });
  });

  describe('unsuspendTenant', () => {
    it('sets status to DRAFT', async () => {
      const { svc, prisma } = makeService();
      prisma.tenant.update.mockResolvedValue({ id: 't1', status: 'DRAFT' });

      await svc.unsuspendTenant('t1');

      expect(prisma.tenant.update).toHaveBeenCalledWith({ where: { id: 't1' }, data: { status: 'DRAFT' } });
    });
  });

  describe('softDeleteTenant', () => {
    it('sets deletedAt to a Date', async () => {
      const { svc, prisma } = makeService();
      prisma.tenant.update.mockResolvedValue({ id: 't1' });

      await svc.softDeleteTenant('t1');

      expect(prisma.tenant.update).toHaveBeenCalledTimes(1);
      const call = prisma.tenant.update.mock.calls[0][0];
      expect(call.where).toEqual({ id: 't1' });
      expect(call.data.deletedAt).toBeInstanceOf(Date);
    });
  });
});
