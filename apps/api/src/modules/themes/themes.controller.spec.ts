import { ThemesController } from './themes.controller';
import { ThemesService } from './themes.service';

// ---------------------------------------------------------------------------
// Mock ThemesService interface
// ---------------------------------------------------------------------------

interface MockThemesService {
  list: jest.Mock;
  get: jest.Mock;
  create: jest.Mock;
  update: jest.Mock;
  remove: jest.Mock;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockThemesService(): MockThemesService {
  return {
    list: jest.fn(),
    get: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };
}

function makeController() {
  const themes = mockThemesService();
  const ctrl = new ThemesController(themes as unknown as ThemesService);
  return { ctrl, themes };
}

const user = { sub: 'user-1', email: 'test@example.com' };

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ThemesController', () => {
  describe('list', () => {
    it('delegates to themes.list() with userId and tenantId', async () => {
      const { ctrl, themes } = makeController();
      const expected = [{ id: 'th-1', name: 'Default' }];
      themes.list.mockResolvedValue(expected);

      const result = await ctrl.list(user, 'tenant-1');

      expect(themes.list).toHaveBeenCalledWith('user-1', 'tenant-1');
      expect(result as unknown).toBe(expected);
    });
  });

  describe('get', () => {
    it('delegates to themes.get() with userId and id', async () => {
      const { ctrl, themes } = makeController();
      const expected = { id: 'th-1', name: 'Default', tokens: { primary: '#000' } };
      themes.get.mockResolvedValue(expected);

      const result = await ctrl.get(user, 'th-1');

      expect(themes.get).toHaveBeenCalledWith('user-1', 'th-1');
      expect(result as unknown).toBe(expected);
    });
  });

  describe('create', () => {
    it('delegates to themes.create() with userId, tenantId, and dto', async () => {
      const { ctrl, themes } = makeController();
      const dto = { name: 'Dark Theme', tokens: { primary: '#fff' } };
      const expected = { id: 'th-2', ...dto };
      themes.create.mockResolvedValue(expected);

      const result = await ctrl.create(user, 'tenant-1', dto);

      expect(themes.create).toHaveBeenCalledWith('user-1', 'tenant-1', dto);
      expect(result as unknown).toBe(expected);
    });
  });

  describe('update', () => {
    it('delegates to themes.update() with userId, id, and dto', async () => {
      const { ctrl, themes } = makeController();
      const dto = { name: 'Updated Theme', isActive: true };
      const expected = { id: 'th-1', ...dto };
      themes.update.mockResolvedValue(expected);

      const result = await ctrl.update(user, 'th-1', dto);

      expect(themes.update).toHaveBeenCalledWith('user-1', 'th-1', dto);
      expect(result as unknown).toBe(expected);
    });

    it('delegates with partial dto (only tokens)', async () => {
      const { ctrl, themes } = makeController();
      const dto = { tokens: { primary: '#123' } };
      themes.update.mockResolvedValue({ id: 'th-1', ...dto });

      await ctrl.update(user, 'th-1', dto);

      expect(themes.update).toHaveBeenCalledWith('user-1', 'th-1', dto);
    });
  });

  describe('remove', () => {
    it('delegates to themes.remove() with userId and id', async () => {
      const { ctrl, themes } = makeController();
      const expected = { id: 'th-1', deletedAt: new Date() };
      themes.remove.mockResolvedValue(expected);

      const result = await ctrl.remove(user, 'th-1');

      expect(themes.remove).toHaveBeenCalledWith('user-1', 'th-1');
      expect(result as unknown).toBe(expected);
    });
  });
});
