import { NotFoundException } from '@nestjs/common';
import { ThemesService } from './themes.service';
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
  const svc = new ThemesService(
    prisma as unknown as PrismaService,
    tenants as unknown as TenantsService,
  );
  return { svc, prisma, tenants };
}

const fakeTheme = {
  id: 'theme-1',
  tenantId: 'tenant-1',
  name: 'Default',
  tokens: { colors: {} },
  isActive: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

describe('ThemesService', () => {
  // -------------------------------------------------------------------
  // list
  // -------------------------------------------------------------------
  describe('list', () => {
    it('asserts tenant access and returns themes', async () => {
      const { svc, prisma, tenants } = makeService();
      prisma.theme.findMany.mockResolvedValue([fakeTheme]);

      const result = await svc.list('user-1', 'tenant-1');

      expect(tenants.get).toHaveBeenCalledWith('user-1', 'tenant-1');
      expect(prisma.theme.findMany).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-1', deletedAt: null },
        orderBy: { updatedAt: 'desc' },
      });
      expect(result).toEqual([fakeTheme]);
    });
  });

  // -------------------------------------------------------------------
  // get
  // -------------------------------------------------------------------
  describe('get', () => {
    it('returns theme and asserts tenant access', async () => {
      const { svc, prisma, tenants } = makeService();
      prisma.theme.findFirst.mockResolvedValue(fakeTheme);

      const result = await svc.get('user-1', 'theme-1');

      expect(prisma.theme.findFirst).toHaveBeenCalledWith({
        where: { id: 'theme-1', deletedAt: null },
      });
      expect(tenants.get).toHaveBeenCalledWith('user-1', 'tenant-1');
      expect(result).toEqual(fakeTheme);
    });

    it('throws NotFoundException when theme does not exist', async () => {
      const { svc, prisma } = makeService();
      prisma.theme.findFirst.mockResolvedValue(null);

      await expect(svc.get('user-1', 'missing')).rejects.toThrow(NotFoundException);
    });
  });

  // -------------------------------------------------------------------
  // create
  // -------------------------------------------------------------------
  describe('create', () => {
    it('creates a theme with name and tokens', async () => {
      const { svc, prisma, tenants } = makeService();
      const dto = { name: 'Brand', tokens: { colors: { primary: '#fff' } } };
      prisma.theme.create.mockResolvedValue({ id: 'theme-2', tenantId: 'tenant-1', ...dto });

      const result = await svc.create('user-1', 'tenant-1', dto);

      expect(tenants.get).toHaveBeenCalledWith('user-1', 'tenant-1');
      expect(prisma.theme.create).toHaveBeenCalledWith({
        data: { tenantId: 'tenant-1', name: dto.name, tokens: dto.tokens },
      });
      expect(result.id).toBe('theme-2');
    });
  });

  // -------------------------------------------------------------------
  // update
  // -------------------------------------------------------------------
  describe('update', () => {
    it('performs a partial update', async () => {
      const { svc, prisma } = makeService();
      prisma.theme.findFirst.mockResolvedValue(fakeTheme);
      prisma.theme.update.mockResolvedValue({ ...fakeTheme, name: 'Renamed' });

      const result = await svc.update('user-1', 'theme-1', { name: 'Renamed' });

      expect(prisma.theme.update).toHaveBeenCalledWith({
        where: { id: 'theme-1' },
        data: { name: 'Renamed' },
      });
      expect(result.name).toBe('Renamed');
    });

    it('deactivates all other themes when isActive is true', async () => {
      const { svc, prisma } = makeService();
      prisma.theme.findFirst.mockResolvedValue(fakeTheme);
      prisma.theme.updateMany.mockResolvedValue({ count: 1 });
      prisma.theme.update.mockResolvedValue({ ...fakeTheme, isActive: true });

      await svc.update('user-1', 'theme-1', { isActive: true });

      expect(prisma.theme.updateMany).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-1', isActive: true },
        data: { isActive: false },
      });
      expect(prisma.theme.update).toHaveBeenCalledWith({
        where: { id: 'theme-1' },
        data: { isActive: true },
      });
    });

    it('does not call updateMany when isActive is not set', async () => {
      const { svc, prisma } = makeService();
      prisma.theme.findFirst.mockResolvedValue(fakeTheme);
      prisma.theme.update.mockResolvedValue({ ...fakeTheme, tokens: { colors: { bg: '#000' } } });

      await svc.update('user-1', 'theme-1', { tokens: { colors: { bg: '#000' } } });

      expect(prisma.theme.updateMany).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------
  // remove
  // -------------------------------------------------------------------
  describe('remove', () => {
    it('soft-deletes the theme', async () => {
      const { svc, prisma } = makeService();
      prisma.theme.findFirst.mockResolvedValue(fakeTheme);
      prisma.theme.update.mockResolvedValue({ ...fakeTheme, deletedAt: new Date() });

      await svc.remove('user-1', 'theme-1');

      expect(prisma.theme.update).toHaveBeenCalledWith({
        where: { id: 'theme-1' },
        data: { deletedAt: expect.any(Date) },
      });
    });
  });
});
