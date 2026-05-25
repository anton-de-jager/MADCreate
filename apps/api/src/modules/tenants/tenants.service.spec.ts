import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { createMockPrisma, createMockWorkspacesService, type PrismaService, type WorkspacesService } from '../../test/mock-helpers';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeService() {
  const prisma = createMockPrisma();
  const workspaces = createMockWorkspacesService();
  prisma.$transaction.mockImplementation((arr: unknown[]) => Promise.resolve(arr));
  workspaces.assertMember.mockResolvedValue(undefined);
  workspaces.assertRole.mockResolvedValue(undefined);
  const svc = new TenantsService(
    prisma as unknown as PrismaService,
    workspaces as unknown as WorkspacesService,
  );
  return { svc, prisma, workspaces };
}

const fakeTenant = {
  id: 'tenant-1',
  workspaceId: 'ws-1',
  slug: 'acme',
  name: 'Acme',
  industry: 'Tech',
  description: null,
  deletedAt: null,
  createdAt: new Date(),
  domains: [],
  sites: [],
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('TenantsService', () => {
  // ----- list --------------------------------------------------------------
  describe('list', () => {
    it('returns tenants for a workspace after asserting membership', async () => {
      const { svc, prisma, workspaces } = makeService();
      prisma.tenant.findMany.mockResolvedValue([fakeTenant]);

      const result = await svc.list('user-1', 'ws-1');

      expect(workspaces.assertMember).toHaveBeenCalledWith('user-1', 'ws-1');
      const callArg = prisma.tenant.findMany.mock.calls[0][0];
      expect(callArg.where).toEqual({ workspaceId: 'ws-1', deletedAt: null });
      expect(result.length).toBe(1);
    });
  });

  // ----- get ---------------------------------------------------------------
  describe('get', () => {
    it('returns tenant by id and asserts membership', async () => {
      const { svc, prisma, workspaces } = makeService();
      prisma.tenant.findFirst.mockResolvedValue(fakeTenant);

      const result = await svc.get('user-1', 'tenant-1');

      expect(result.id).toBe('tenant-1');
      expect(workspaces.assertMember).toHaveBeenCalledWith('user-1', 'ws-1');
    });

    it('throws NotFoundException when tenant does not exist', async () => {
      const { svc, prisma } = makeService();
      prisma.tenant.findFirst.mockResolvedValue(null);

      try {
        await svc.get('user-1', 'missing');
        fail('Expected get to throw');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(NotFoundException);
      }
    });
  });

  // ----- create ------------------------------------------------------------
  describe('create', () => {
    it('creates a tenant with a unique slug', async () => {
      const { svc, prisma, workspaces } = makeService();
      prisma.tenant.findUnique.mockResolvedValue(null); // slug not taken
      prisma.tenant.create.mockResolvedValue(fakeTenant);

      const result = await svc.create('user-1', 'ws-1', { slug: 'acme', name: 'Acme' });

      expect(workspaces.assertRole).toHaveBeenCalledWith(
        'user-1',
        'ws-1',
        ['WORKSPACE_OWNER', 'ADMIN', 'EDITOR'],
      );
      expect(prisma.tenant.create).toHaveBeenCalledTimes(1);
      expect(result.id).toBe('tenant-1');
    });
  });

  // ----- update ------------------------------------------------------------
  describe('update', () => {
    it('updates the tenant after verifying access', async () => {
      const { svc, prisma } = makeService();
      prisma.tenant.findFirst.mockResolvedValue(fakeTenant);
      prisma.tenant.update.mockResolvedValue({ ...fakeTenant, name: 'Acme v2' });

      const result = await svc.update('user-1', 'tenant-1', { name: 'Acme v2' });

      expect(result.name).toBe('Acme v2');
      expect(prisma.tenant.update).toHaveBeenCalledWith({
        where: { id: 'tenant-1' },
        data: { name: 'Acme v2' },
      });
    });
  });

  // ----- remove ------------------------------------------------------------
  describe('remove', () => {
    it('soft-deletes tenant and child records in a transaction', async () => {
      const { svc, prisma, workspaces } = makeService();
      prisma.tenant.findFirst.mockResolvedValue(fakeTenant);
      const updatedTenant = { ...fakeTenant, deletedAt: new Date() };
      prisma.$transaction.mockResolvedValue([
        { count: 1 }, // sites
        { count: 2 }, // pages
        { count: 3 }, // sections
        { count: 1 }, // themes
        updatedTenant, // tenant
      ]);

      const result = await svc.remove('user-1', 'tenant-1');

      expect(workspaces.assertRole).toHaveBeenCalledWith('user-1', 'ws-1', ['WORKSPACE_OWNER', 'ADMIN']);
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(result.deletedAt).toBeDefined();
    });
  });

  // ----- purge -------------------------------------------------------------
  describe('purge', () => {
    it('hard-deletes a tenant that was soft-deleted long enough ago', async () => {
      const { svc, prisma } = makeService();
      prisma.user.findUnique.mockResolvedValue({ isSuperAdmin: true });
      const oldDeletedAt = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000); // 31 days ago
      prisma.tenant.findUnique.mockResolvedValue({ ...fakeTenant, deletedAt: oldDeletedAt });
      prisma.tenant.delete.mockResolvedValue({});

      const result = await svc.purge('admin-1', 'tenant-1');

      expect(result.id).toBe('tenant-1');
      expect(result.purged).toBe(true);
      expect(prisma.tenant.delete).toHaveBeenCalledWith({ where: { id: 'tenant-1' } });
    });

    it('throws Forbidden if user is not super admin', async () => {
      const { svc, prisma } = makeService();
      prisma.user.findUnique.mockResolvedValue({ isSuperAdmin: false });

      try {
        await svc.purge('user-1', 'tenant-1');
        fail('Expected purge to throw');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(ForbiddenException);
      }
    });

    it('throws BadRequest if tenant is not soft-deleted', async () => {
      const { svc, prisma } = makeService();
      prisma.user.findUnique.mockResolvedValue({ isSuperAdmin: true });
      prisma.tenant.findUnique.mockResolvedValue({ ...fakeTenant, deletedAt: null });

      try {
        await svc.purge('admin-1', 'tenant-1');
        fail('Expected purge to throw');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(BadRequestException);
      }
    });

    it('throws BadRequest if soft-delete is too recent', async () => {
      const { svc, prisma } = makeService();
      prisma.user.findUnique.mockResolvedValue({ isSuperAdmin: true });
      prisma.tenant.findUnique.mockResolvedValue({
        ...fakeTenant,
        deletedAt: new Date(), // just now
      });

      try {
        await svc.purge('admin-1', 'tenant-1');
        fail('Expected purge to throw');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(BadRequestException);
      }
    });

    it('throws NotFound if tenant does not exist', async () => {
      const { svc, prisma } = makeService();
      prisma.user.findUnique.mockResolvedValue({ isSuperAdmin: true });
      prisma.tenant.findUnique.mockResolvedValue(null);

      try {
        await svc.purge('admin-1', 'missing');
        fail('Expected purge to throw');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(NotFoundException);
      }
    });
  });

  // ----- purgeAll ----------------------------------------------------------
  describe('purgeAll', () => {
    it('hard-deletes all expired soft-deleted tenants', async () => {
      const { svc, prisma } = makeService();
      prisma.user.findUnique.mockResolvedValue({ isSuperAdmin: true });
      prisma.tenant.findMany.mockResolvedValue([{ id: 't1' }, { id: 't2' }]);
      prisma.tenant.deleteMany.mockResolvedValue({ count: 2 });

      const result = await svc.purgeAll('admin-1');

      expect(result.purged).toBe(2);
      expect(result.ids).toEqual(['t1', 't2']);
    });

    it('returns zero when nothing to purge', async () => {
      const { svc, prisma } = makeService();
      prisma.user.findUnique.mockResolvedValue({ isSuperAdmin: true });
      prisma.tenant.findMany.mockResolvedValue([]);

      const result = await svc.purgeAll('admin-1');

      expect(result.purged).toBe(0);
      expect(result.ids).toEqual([]);
    });
  });
});
