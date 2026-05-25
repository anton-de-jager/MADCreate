import { TemplatesController } from './templates.controller';
import { TemplatesService } from './templates.service';

interface MockTemplatesService {
  listPublic: jest.Mock;
  get: jest.Mock;
  instantiate: jest.Mock;
}

function mockTemplatesService(): MockTemplatesService {
  return { listPublic: jest.fn(), get: jest.fn(), instantiate: jest.fn() };
}

function makeController() {
  const service = mockTemplatesService();
  const ctrl = new TemplatesController(service as unknown as TemplatesService);
  return { ctrl, service };
}

describe('TemplatesController', () => {
  describe('list', () => {
    it('delegates to service.listPublic() with category, industry, and search', async () => {
      const { ctrl, service } = makeController();
      const expected = [{ slug: 'tpl-1' }];
      service.listPublic.mockResolvedValue(expected);

      const result = await ctrl.list('marketing', 'tech', 'landing');

      expect(service.listPublic).toHaveBeenCalledWith({
        category: 'marketing',
        industry: 'tech',
        search: 'landing',
      });
      expect(result as unknown).toBe(expected);
    });

    it('passes undefined for optional query params when not provided', async () => {
      const { ctrl, service } = makeController();
      service.listPublic.mockResolvedValue([]);

      await ctrl.list(undefined, undefined, undefined);

      expect(service.listPublic).toHaveBeenCalledWith({
        category: undefined,
        industry: undefined,
        search: undefined,
      });
    });
  });

  describe('get', () => {
    it('delegates to service.get() with the slug param', async () => {
      const { ctrl, service } = makeController();
      const expected = { slug: 'my-template', name: 'My Template' };
      service.get.mockResolvedValue(expected);

      const result = await ctrl.get('my-template');

      expect(service.get).toHaveBeenCalledWith('my-template');
      expect(result as unknown).toBe(expected);
    });
  });

  describe('instantiate', () => {
    it('delegates to service.instantiate() with tenantId and slug', async () => {
      const { ctrl, service } = makeController();
      const expected = { id: 'new-site-id' };
      service.instantiate.mockResolvedValue(expected);

      const result = await ctrl.instantiate('my-template', 'tenant-123');

      expect(service.instantiate).toHaveBeenCalledWith('tenant-123', 'my-template');
      expect(result as unknown).toBe(expected);
    });
  });
});
