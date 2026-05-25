import { NotFoundException } from '@nestjs/common';
import { LayoutsService } from './layouts.service';
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
  const svc = new LayoutsService(
    prisma as unknown as PrismaService,
    tenants as unknown as TenantsService,
  );
  return { svc, prisma, tenants };
}

const fakeLayout = {
  id: 'layout-1',
  tenantId: 'tenant-1',
  name: 'Default Layout',
  schema: { regions: ['header', 'main', 'footer'] },
  isDefault: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

describe('LayoutsService', () => {
  // -----------------------------------------------------------------------
  // list
  // -----------------------------------------------------------------------
  describe('list', () => {
    it('asserts tenant access and returns layouts', async () => {
      const { svc, prisma, tenants } = makeService();
      prisma.layout.findMany.mockResolvedValue([fakeLayout]);

      const result = await svc.list('user-1', 'tenant-1');

      expect(tenants.get).toHaveBeenCalledWith('user-1', 'tenant-1');
      expect(prisma.layout.findMany).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-1', deletedAt: null },
        orderBy: { updatedAt: 'desc' },
      });
      expect(result).toEqual([fakeLayout]);
    });

    it('returns empty array when no layouts exist', async () => {
      const { svc, prisma } = makeService();
      prisma.layout.findMany.mockResolvedValue([]);

      const result = await svc.list('user-1', 'tenant-1');

      expect(result).toEqual([]);
    });
  });

  // -----------------------------------------------------------------------
  // get
  // -----------------------------------------------------------------------
  describe('get', () => {
    it('returns layout and asserts tenant access', async () => {
      const { svc, prisma, tenants } = makeService();
      prisma.layout.findFirst.mockResolvedValue(fakeLayout);

      const result = await svc.get('user-1', 'layout-1');

      expect(prisma.layout.findFirst).toHaveBeenCalledWith({
        where: { id: 'layout-1', deletedAt: null },
      });
      expect(tenants.get).toHaveBeenCalledWith('user-1', 'tenant-1');
      expect(result).toEqual(fakeLayout);
    });

    it('throws NotFoundException when layout does not exist', async () => {
      const { svc, prisma } = makeService();
      prisma.layout.findFirst.mockResolvedValue(null);

      await expect(svc.get('user-1', 'missing')).rejects.toThrow(NotFoundException);
    });
  });

  // -----------------------------------------------------------------------
  // create
  // -----------------------------------------------------------------------
  describe('create', () => {
    it('creates a layout with name and schema', async () => {
      const { svc, prisma, tenants } = makeService();
      const dto = { name: 'Full Width', schema: { regions: ['main'] } };
      prisma.layout.create.mockResolvedValue({ id: 'layout-2', tenantId: 'tenant-1', ...dto, isDefault: false });

      const result = await svc.create('user-1', 'tenant-1', dto);

      expect(tenants.get).toHaveBeenCalledWith('user-1', 'tenant-1');
      expect(prisma.layout.create).toHaveBeenCalledWith({
        data: {
          tenantId: 'tenant-1',
          name: dto.name,
          schema: dto.schema,
          isDefault: false,
        },
      });
      expect(result.id).toBe('layout-2');
    });

    it('sets isDefault to true when provided', async () => {
      const { svc, prisma } = makeService();
      const dto = { name: 'Default', schema: {}, isDefault: true };
      prisma.layout.create.mockResolvedValue({ id: 'layout-3', tenantId: 'tenant-1', ...dto });

      await svc.create('user-1', 'tenant-1', dto);

      expect(prisma.layout.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ isDefault: true }),
      });
    });

    it('defaults isDefault to false when not provided', async () => {
      const { svc, prisma } = makeService();
      const dto = { name: 'Sidebar', schema: { regions: ['sidebar', 'main'] } };
      prisma.layout.create.mockResolvedValue({ id: 'layout-4', tenantId: 'tenant-1', ...dto, isDefault: false });

      await svc.create('user-1', 'tenant-1', dto);

      expect(prisma.layout.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ isDefault: false }),
      });
    });
  });

  // -----------------------------------------------------------------------
  // update
  // -----------------------------------------------------------------------
  describe('update', () => {
    it('performs a partial update with name only', async () => {
      const { svc, prisma } = makeService();
      prisma.layout.findFirst.mockResolvedValue(fakeLayout);
      prisma.layout.update.mockResolvedValue({ ...fakeLayout, name: 'Renamed' });

      const result = await svc.update('user-1', 'layout-1', { name: 'Renamed' });

      expect(prisma.layout.update).toHaveBeenCalledWith({
        where: { id: 'layout-1' },
        data: expect.objectContaining({ name: 'Renamed' }),
      });
      expect(result.name).toBe('Renamed');
    });

    it('casts schema to InputJsonValue when provided', async () => {
      const { svc, prisma } = makeService();
      prisma.layout.findFirst.mockResolvedValue(fakeLayout);
      const newSchema = { regions: ['header', 'sidebar', 'main'] };
      prisma.layout.update.mockResolvedValue({ ...fakeLayout, schema: newSchema });

      await svc.update('user-1', 'layout-1', { schema: newSchema });

      expect(prisma.layout.update).toHaveBeenCalledWith({
        where: { id: 'layout-1' },
        data: expect.objectContaining({ schema: newSchema }),
      });
    });

    it('omits schema from data when not provided', async () => {
      const { svc, prisma } = makeService();
      prisma.layout.findFirst.mockResolvedValue(fakeLayout);
      prisma.layout.update.mockResolvedValue({ ...fakeLayout, isDefault: true });

      await svc.update('user-1', 'layout-1', { isDefault: true });

      const callData = prisma.layout.update.mock.calls[0][0].data;
      expect(callData.schema).toBeUndefined();
    });

    it('throws NotFoundException when layout does not exist', async () => {
      const { svc, prisma } = makeService();
      prisma.layout.findFirst.mockResolvedValue(null);

      await expect(svc.update('user-1', 'missing', { name: 'X' })).rejects.toThrow(NotFoundException);
    });
  });
});
