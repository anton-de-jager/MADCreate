import { LayoutsController } from './layouts.controller';
import { LayoutsService } from './layouts.service';

// ---------------------------------------------------------------------------
// Mock LayoutsService interface
// ---------------------------------------------------------------------------

interface MockLayoutsService {
  list: jest.Mock;
  get: jest.Mock;
  create: jest.Mock;
  update: jest.Mock;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockLayoutsService(): MockLayoutsService {
  return {
    list: jest.fn(),
    get: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };
}

function makeController() {
  const layouts = mockLayoutsService();
  const ctrl = new LayoutsController(layouts as unknown as LayoutsService);
  return { ctrl, layouts };
}

const user = { sub: 'user-1', email: 'test@example.com' };

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('LayoutsController', () => {
  describe('list', () => {
    it('delegates to layouts.list() with user sub and tenantId', async () => {
      const { ctrl, layouts } = makeController();
      const expected = [{ id: 'l-1', name: 'Default' }];
      layouts.list.mockResolvedValue(expected);

      const result = await ctrl.list(user, 'tenant-1');

      expect(layouts.list).toHaveBeenCalledWith('user-1', 'tenant-1');
      expect(result as unknown).toBe(expected);
    });
  });

  describe('get', () => {
    it('delegates to layouts.get() with user sub and id', async () => {
      const { ctrl, layouts } = makeController();
      const expected = { id: 'l-1', name: 'Default', schema: {} };
      layouts.get.mockResolvedValue(expected);

      const result = await ctrl.get(user, 'l-1');

      expect(layouts.get).toHaveBeenCalledWith('user-1', 'l-1');
      expect(result as unknown).toBe(expected);
    });
  });

  describe('create', () => {
    it('delegates to layouts.create() with user sub, tenantId, and dto', async () => {
      const { ctrl, layouts } = makeController();
      const dto = { name: 'New Layout', schema: { sections: [] }, isDefault: false };
      const expected = { id: 'l-2', ...dto };
      layouts.create.mockResolvedValue(expected);

      const result = await ctrl.create(user, 'tenant-1', dto);

      expect(layouts.create).toHaveBeenCalledWith('user-1', 'tenant-1', dto);
      expect(result as unknown).toBe(expected);
    });

    it('delegates to layouts.create() without optional isDefault', async () => {
      const { ctrl, layouts } = makeController();
      const dto = { name: 'Minimal Layout', schema: { sections: [] } };
      layouts.create.mockResolvedValue({ id: 'l-3', ...dto });

      await ctrl.create(user, 'tenant-1', dto);

      expect(layouts.create).toHaveBeenCalledWith('user-1', 'tenant-1', dto);
    });
  });

  describe('update', () => {
    it('delegates to layouts.update() with user sub, id, and dto', async () => {
      const { ctrl, layouts } = makeController();
      const dto = { name: 'Updated Layout', schema: { sections: ['hero'] }, isDefault: true };
      const expected = { id: 'l-1', ...dto };
      layouts.update.mockResolvedValue(expected);

      const result = await ctrl.update(user, 'l-1', dto);

      expect(layouts.update).toHaveBeenCalledWith('user-1', 'l-1', dto);
      expect(result as unknown).toBe(expected);
    });

    it('delegates to layouts.update() with partial dto', async () => {
      const { ctrl, layouts } = makeController();
      const dto = { name: 'Renamed' };
      layouts.update.mockResolvedValue({ id: 'l-1', name: 'Renamed' });

      await ctrl.update(user, 'l-1', dto);

      expect(layouts.update).toHaveBeenCalledWith('user-1', 'l-1', dto);
    });
  });
});
