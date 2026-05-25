import { NotFoundException } from '@nestjs/common';
import { IntegrationsService } from './integrations.service';
import {
  createMockPrisma,
  createMockTenantsService,
  type MockPrisma,
  type PrismaService,
  type TenantsService,
} from '../../test/mock-helpers';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeService() {
  const prisma = createMockPrisma();
  const tenants = createMockTenantsService();
  tenants.get.mockResolvedValue({ id: 'tenant-1', workspaceId: 'ws-1' });

  const catalog = prisma.integrationCatalog;
  const ti = prisma.tenantIntegration;

  const svc = new IntegrationsService(
    prisma as unknown as PrismaService,
    tenants as unknown as TenantsService,
  );
  return { svc, prisma, tenants, catalog, ti };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('IntegrationsService', () => {
  // ----- catalog -----------------------------------------------------------
  describe('catalog', () => {
    it('returns all enabled catalog entries ordered by category and name', async () => {
      const { svc, catalog } = makeService();
      const entries = [
        { id: 'c1', key: 'analytics', name: 'Analytics', category: 'analytics', isEnabled: true },
        { id: 'c2', key: 'chat', name: 'Chat Widget', category: 'communication', isEnabled: true },
      ];
      catalog.findMany.mockResolvedValue(entries);

      const result = await svc.catalog();

      expect(catalog.findMany).toHaveBeenCalledTimes(1);
      expect(catalog.findMany).toHaveBeenCalledWith({
        where: { isEnabled: true },
        orderBy: [{ category: 'asc' }, { name: 'asc' }],
      });
      expect(result.length).toBe(2);
      expect(result[0].key).toBe('analytics');
      expect(result[1].key).toBe('chat');
    });

    it('returns empty array when no catalog entries exist', async () => {
      const { svc, catalog } = makeService();
      catalog.findMany.mockResolvedValue([]);

      const result = await svc.catalog();

      expect(result.length).toBe(0);
    });
  });

  // ----- installed ---------------------------------------------------------
  describe('installed', () => {
    it('returns installed integrations for a tenant', async () => {
      const { svc, ti, tenants } = makeService();
      const installed = [
        { id: 'ti-1', tenantId: 'tenant-1', catalogId: 'c1', catalog: { key: 'analytics' } },
      ];
      ti.findMany.mockResolvedValue(installed);

      const result = await svc.installed('user-1', 'tenant-1');

      expect(tenants.get).toHaveBeenCalledWith('user-1', 'tenant-1');
      expect(ti.findMany).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-1', deletedAt: null },
        include: { catalog: true },
      });
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('ti-1');
    });

    it('returns empty array when no integrations installed', async () => {
      const { svc, ti } = makeService();
      ti.findMany.mockResolvedValue([]);

      const result = await svc.installed('user-1', 'tenant-1');

      expect(result.length).toBe(0);
    });

    it('propagates error when tenants.get rejects', async () => {
      const { svc, tenants } = makeService();
      tenants.get.mockRejectedValue(new Error('Not found'));

      try {
        await svc.installed('user-1', 'bad-tenant');
        fail('Expected installed to throw');
      } catch (err: unknown) {
        expect((err as Error).message).toBe('Not found');
      }
    });
  });

  // ----- install -----------------------------------------------------------
  describe('install', () => {
    it('installs an integration by catalog key', async () => {
      const { svc, catalog, ti, tenants } = makeService();
      const catalogEntry = { id: 'c1', key: 'analytics' };
      catalog.findUnique.mockResolvedValue(catalogEntry);
      const created = { id: 'ti-1', tenantId: 'tenant-1', catalogId: 'c1', config: {}, isEnabled: true };
      ti.upsert.mockResolvedValue(created);

      const result = await svc.install('user-1', 'tenant-1', { catalogKey: 'analytics' });

      expect(tenants.get).toHaveBeenCalledWith('user-1', 'tenant-1');
      expect(catalog.findUnique).toHaveBeenCalledWith({ where: { key: 'analytics' } });
      expect(ti.upsert).toHaveBeenCalledWith({
        where: { tenantId_catalogId: { tenantId: 'tenant-1', catalogId: 'c1' } },
        update: { config: {}, isEnabled: true, deletedAt: null },
        create: { tenantId: 'tenant-1', catalogId: 'c1', config: {} },
      });
      expect(result.id).toBe('ti-1');
      expect(result.isEnabled).toBe(true);
    });

    it('passes custom config when provided', async () => {
      const { svc, catalog, ti } = makeService();
      catalog.findUnique.mockResolvedValue({ id: 'c2', key: 'chat' });
      ti.upsert.mockResolvedValue({ id: 'ti-2' });

      const config = { apiKey: 'abc123', theme: 'dark' };
      await svc.install('user-1', 'tenant-1', { catalogKey: 'chat', config });

      const upsertArg = ti.upsert.mock.calls[0][0];
      expect(upsertArg.update.config).toEqual(config);
      expect(upsertArg.create.config).toEqual(config);
    });

    it('defaults config to empty object when not provided', async () => {
      const { svc, catalog, ti } = makeService();
      catalog.findUnique.mockResolvedValue({ id: 'c1', key: 'analytics' });
      ti.upsert.mockResolvedValue({ id: 'ti-1' });

      await svc.install('user-1', 'tenant-1', { catalogKey: 'analytics' });

      const upsertArg = ti.upsert.mock.calls[0][0];
      expect(upsertArg.update.config).toEqual({});
      expect(upsertArg.create.config).toEqual({});
    });

    it('throws NotFoundException when catalog key is not found', async () => {
      const { svc, catalog } = makeService();
      catalog.findUnique.mockResolvedValue(null);

      try {
        await svc.install('user-1', 'tenant-1', { catalogKey: 'nonexistent' });
        fail('Expected install to throw');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(NotFoundException);
      }
    });

    it('throws NotFoundException with descriptive message', async () => {
      const { svc, catalog } = makeService();
      catalog.findUnique.mockResolvedValue(null);

      try {
        await svc.install('user-1', 'tenant-1', { catalogKey: 'nonexistent' });
        fail('Expected install to throw');
      } catch (err: unknown) {
        expect((err as NotFoundException).message).toBe('Integration not in catalog');
      }
    });

    it('propagates error when tenants.get rejects', async () => {
      const { svc, tenants } = makeService();
      tenants.get.mockRejectedValue(new Error('Forbidden'));

      try {
        await svc.install('user-1', 'bad-tenant', { catalogKey: 'analytics' });
        fail('Expected install to throw');
      } catch (err: unknown) {
        expect((err as Error).message).toBe('Forbidden');
      }
    });

    it('re-enables a previously uninstalled integration via upsert', async () => {
      const { svc, catalog, ti } = makeService();
      catalog.findUnique.mockResolvedValue({ id: 'c1', key: 'analytics' });
      const reEnabled = { id: 'ti-1', isEnabled: true, deletedAt: null };
      ti.upsert.mockResolvedValue(reEnabled);

      const result = await svc.install('user-1', 'tenant-1', { catalogKey: 'analytics' });

      const upsertArg = ti.upsert.mock.calls[0][0];
      expect(upsertArg.update.isEnabled).toBe(true);
      expect(upsertArg.update.deletedAt).toBeNull();
      expect(result.isEnabled).toBe(true);
      expect(result.deletedAt).toBeNull();
    });
  });

  // ----- uninstall ---------------------------------------------------------
  describe('uninstall', () => {
    it('soft-deletes a tenant integration by id', async () => {
      const { svc, ti, tenants } = makeService();
      const updated = { id: 'ti-1', isEnabled: false, deletedAt: new Date() };
      ti.update.mockResolvedValue(updated);

      const result = await svc.uninstall('user-1', 'tenant-1', 'ti-1');

      expect(tenants.get).toHaveBeenCalledWith('user-1', 'tenant-1');
      expect(ti.update).toHaveBeenCalledTimes(1);
      const updateArg = ti.update.mock.calls[0][0];
      expect(updateArg.where).toEqual({ id: 'ti-1' });
      expect(updateArg.data.isEnabled).toBe(false);
      expect(updateArg.data.deletedAt).toBeInstanceOf(Date);
      expect(result.id).toBe('ti-1');
      expect(result.isEnabled).toBe(false);
    });

    it('propagates error when tenants.get rejects', async () => {
      const { svc, tenants } = makeService();
      tenants.get.mockRejectedValue(new Error('Access denied'));

      try {
        await svc.uninstall('user-1', 'bad-tenant', 'ti-1');
        fail('Expected uninstall to throw');
      } catch (err: unknown) {
        expect((err as Error).message).toBe('Access denied');
      }
    });

    it('propagates Prisma error when integration id does not exist', async () => {
      const { svc, ti } = makeService();
      ti.update.mockRejectedValue(new Error('Record to update not found'));

      try {
        await svc.uninstall('user-1', 'tenant-1', 'nonexistent');
        fail('Expected uninstall to throw');
      } catch (err: unknown) {
        expect((err as Error).message).toBe('Record to update not found');
      }
    });
  });
});
