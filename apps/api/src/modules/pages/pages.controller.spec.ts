import { PagesController } from './pages.controller';
import { PagesService } from './pages.service';
import { PageStatus } from '@prisma/client';
import type { JwtPayload } from '@madcreate/shared';

// ---------------------------------------------------------------------------
// Mock PagesService interface
// ---------------------------------------------------------------------------

interface MockPagesService {
  list: jest.Mock;
  get: jest.Mock;
  create: jest.Mock;
  update: jest.Mock;
  publish: jest.Mock;
  remove: jest.Mock;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockPagesService(): MockPagesService {
  return {
    list: jest.fn(),
    get: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    publish: jest.fn(),
    remove: jest.fn(),
  };
}

function makeController() {
  const pages = mockPagesService();
  const ctrl = new PagesController(pages as unknown as PagesService);
  return { ctrl, pages };
}

const user: JwtPayload = { sub: 'user-1', email: 'test@example.com' };

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PagesController', () => {
  describe('list', () => {
    it('delegates to pages.list() with userId and siteId', async () => {
      const { ctrl, pages } = makeController();
      const expected = [{ id: 'p-1', slug: 'home' }];
      pages.list.mockResolvedValue(expected);

      const result = await ctrl.list(user, 'site-1');

      expect(pages.list).toHaveBeenCalledWith('user-1', 'site-1');
      expect(result as unknown).toBe(expected);
    });
  });

  describe('get', () => {
    it('delegates to pages.get() with userId and id', async () => {
      const { ctrl, pages } = makeController();
      const expected = { id: 'p-1', slug: 'home', title: 'Home' };
      pages.get.mockResolvedValue(expected);

      const result = await ctrl.get(user, 'p-1');

      expect(pages.get).toHaveBeenCalledWith('user-1', 'p-1');
      expect(result as unknown).toBe(expected);
    });
  });

  describe('create', () => {
    it('delegates to pages.create() with userId, siteId, and dto', async () => {
      const { ctrl, pages } = makeController();
      const dto = { slug: 'about', title: 'About Us' };
      const expected = { id: 'p-2', slug: 'about', title: 'About Us' };
      pages.create.mockResolvedValue(expected);

      const result = await ctrl.create(user, 'site-1', dto);

      expect(pages.create).toHaveBeenCalledWith('user-1', 'site-1', dto);
      expect(result as unknown).toBe(expected);
    });

    it('delegates to pages.create() with optional fields', async () => {
      const { ctrl, pages } = makeController();
      const dto = { slug: 'contact', title: 'Contact', layoutId: 'lay-1', order: 3, schema: { sections: [] } };
      pages.create.mockResolvedValue({ id: 'p-3', ...dto });

      await ctrl.create(user, 'site-2', dto);

      expect(pages.create).toHaveBeenCalledWith('user-1', 'site-2', dto);
    });
  });

  describe('update', () => {
    it('delegates to pages.update() with userId, id, and dto', async () => {
      const { ctrl, pages } = makeController();
      const dto = { title: 'Updated Title' };
      const expected = { id: 'p-1', title: 'Updated Title' };
      pages.update.mockResolvedValue(expected);

      const result = await ctrl.update(user, 'p-1', dto);

      expect(pages.update).toHaveBeenCalledWith('user-1', 'p-1', dto);
      expect(result as unknown).toBe(expected);
    });

    it('delegates to pages.update() with all optional fields', async () => {
      const { ctrl, pages } = makeController();
      const dto = {
        slug: 'new-slug',
        title: 'New Title',
        metaTitle: 'Meta Title',
        metaDescription: 'Meta Desc',
        ogImageUrl: 'https://example.com/og.png',
        order: 2,
        layoutId: 'lay-2',
        schema: { hero: true },
        status: 'PUBLISHED' as PageStatus,
      };
      pages.update.mockResolvedValue({ id: 'p-1', ...dto });

      await ctrl.update(user, 'p-1', dto);

      expect(pages.update).toHaveBeenCalledWith('user-1', 'p-1', dto);
    });
  });

  describe('publish', () => {
    it('delegates to pages.publish() with userId and id', async () => {
      const { ctrl, pages } = makeController();
      const expected = { id: 'p-1', status: 'PUBLISHED' };
      pages.publish.mockResolvedValue(expected);

      const result = await ctrl.publish(user, 'p-1');

      expect(pages.publish).toHaveBeenCalledWith('user-1', 'p-1');
      expect(result as unknown).toBe(expected);
    });
  });

  describe('remove', () => {
    it('delegates to pages.remove() with userId and id', async () => {
      const { ctrl, pages } = makeController();
      const expected = { id: 'p-1', deletedAt: new Date() };
      pages.remove.mockResolvedValue(expected);

      const result = await ctrl.remove(user, 'p-1');

      expect(pages.remove).toHaveBeenCalledWith('user-1', 'p-1');
      expect(result as unknown).toBe(expected);
    });
  });
});
