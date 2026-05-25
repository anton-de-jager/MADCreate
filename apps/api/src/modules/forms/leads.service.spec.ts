import { NotFoundException } from '@nestjs/common';
import { LeadsService } from './leads.service';
import {
  createMockPrisma,
  createMockTenantsService,
  type PrismaService,
  type TenantsService,
} from '../../test/mock-helpers';

function makeService() {
  const prisma = createMockPrisma();
  const tenants = createMockTenantsService();
  tenants.get.mockResolvedValue({ id: 'tenant-1' });
  const svc = new LeadsService(
    prisma as unknown as PrismaService,
    tenants as unknown as TenantsService,
  );
  return { svc, prisma, tenants };
}

describe('LeadsService', () => {
  // -----------------------------------------------------------------------
  // list
  // -----------------------------------------------------------------------
  describe('list()', () => {
    it('asserts tenant access and returns leads', async () => {
      const { svc, prisma, tenants } = makeService();
      const leads = [{ id: 'lead-1' }, { id: 'lead-2' }];
      prisma.lead.findMany.mockResolvedValue(leads);

      const result = await svc.list('user-1', 'tenant-1');

      expect(tenants.get).toHaveBeenCalledWith('user-1', 'tenant-1');
      const arg = prisma.lead.findMany.mock.calls[0][0];
      expect(arg.where.tenantId).toBe('tenant-1');
      expect(arg.where.deletedAt).toBeNull();
      expect(arg.orderBy.createdAt).toBe('desc');
      expect(arg.take).toBe(200);
      expect((result as unknown[]).length).toBe(2);
    });

    it('passes status filter when provided', async () => {
      const { svc, prisma } = makeService();
      prisma.lead.findMany.mockResolvedValue([]);

      await svc.list('user-1', 'tenant-1', { status: 'new' });

      const arg = prisma.lead.findMany.mock.calls[0][0];
      expect(arg.where.status).toBe('new');
    });

    it('uses default limit 200 when none specified', async () => {
      const { svc, prisma } = makeService();
      prisma.lead.findMany.mockResolvedValue([]);

      await svc.list('user-1', 'tenant-1');

      const arg = prisma.lead.findMany.mock.calls[0][0];
      expect(arg.take).toBe(200);
    });

    it('uses custom limit when provided', async () => {
      const { svc, prisma } = makeService();
      prisma.lead.findMany.mockResolvedValue([]);

      await svc.list('user-1', 'tenant-1', { limit: 50 });

      const arg = prisma.lead.findMany.mock.calls[0][0];
      expect(arg.take).toBe(50);
    });
  });

  // -----------------------------------------------------------------------
  // update
  // -----------------------------------------------------------------------
  describe('update()', () => {
    it('performs partial update with only defined fields', async () => {
      const { svc, prisma } = makeService();
      prisma.lead.findFirst.mockResolvedValue({ id: 'lead-1', tenantId: 'tenant-1' });
      prisma.lead.update.mockResolvedValue({ id: 'lead-1', status: 'contacted' });

      const result = await svc.update('user-1', 'tenant-1', 'lead-1', { status: 'contacted' });

      expect(prisma.lead.findFirst).toHaveBeenCalledWith({
        where: { id: 'lead-1', tenantId: 'tenant-1', deletedAt: null },
      });
      const updateArg = prisma.lead.update.mock.calls[0][0];
      expect(updateArg.where.id).toBe('lead-1');
      expect(updateArg.data.status).toBe('contacted');
      // Fields not in the dto should be absent from the data object
      expect(updateArg.data.name).toBeUndefined();
      expect(updateArg.data.email).toBeUndefined();
      expect(updateArg.data.phone).toBeUndefined();
      expect((result as { id: string }).id).toBe('lead-1');
    });

    it('throws NotFoundException when lead not found', async () => {
      const { svc, prisma } = makeService();
      prisma.lead.findFirst.mockResolvedValue(null);

      try {
        await svc.update('user-1', 'tenant-1', 'lead-1', { status: 'contacted' });
        fail('Expected update to throw');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(NotFoundException);
      }
    });

    it('throws NotFoundException when lead belongs to different tenant', async () => {
      const { svc, prisma } = makeService();
      // findFirst with tenantId filter returns null for mismatched tenant
      prisma.lead.findFirst.mockResolvedValue(null);

      try {
        await svc.update('user-1', 'tenant-1', 'lead-99', { name: 'New' });
        fail('Expected update to throw');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(NotFoundException);
      }
      expect(prisma.lead.update).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // remove
  // -----------------------------------------------------------------------
  describe('remove()', () => {
    it('soft-deletes with deletedAt', async () => {
      const { svc, prisma, tenants } = makeService();
      prisma.lead.update.mockResolvedValue({});

      await svc.remove('user-1', 'tenant-1', 'lead-1');

      expect(tenants.get).toHaveBeenCalledWith('user-1', 'tenant-1');
      const arg = prisma.lead.update.mock.calls[0][0];
      expect(arg.where.id).toBe('lead-1');
      expect(arg.data.deletedAt).toBeInstanceOf(Date);
    });
  });
});
