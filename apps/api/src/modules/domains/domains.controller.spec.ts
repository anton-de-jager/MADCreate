import { DomainsController } from './domains.controller';
import { DomainsService } from './domains.service';
import type { JwtPayload } from '@madcreate/shared';

// ---------------------------------------------------------------------------
// Mock DomainsService interface
// ---------------------------------------------------------------------------

interface MockDomainsService {
  list: jest.Mock;
  add: jest.Mock;
  instructions: jest.Mock;
  verify: jest.Mock;
  remove: jest.Mock;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockDomainsService(): MockDomainsService {
  return {
    list: jest.fn(),
    add: jest.fn(),
    instructions: jest.fn(),
    verify: jest.fn(),
    remove: jest.fn(),
  };
}

function makeController() {
  const domains = mockDomainsService();
  const ctrl = new DomainsController(domains as unknown as DomainsService);
  return { ctrl, domains };
}

const user = { sub: 'user-1', email: 'test@example.com' } as unknown as JwtPayload;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('DomainsController', () => {
  describe('list', () => {
    it('delegates to domains.list() with user sub and tenantId', async () => {
      const { ctrl, domains } = makeController();
      const expected = [{ id: 'd-1', hostname: 'example.com' }];
      domains.list.mockResolvedValue(expected);

      const result = await ctrl.list(user, 'tenant-1');

      expect(domains.list).toHaveBeenCalledWith('user-1', 'tenant-1');
      expect(result as unknown).toBe(expected);
    });
  });

  describe('add', () => {
    it('delegates to domains.add() with user sub, tenantId, and dto', async () => {
      const { ctrl, domains } = makeController();
      const dto = { hostname: 'example.com', type: 'CNAME' as const };
      const expected = { id: 'd-1', hostname: 'example.com', type: 'CNAME' as const };
      domains.add.mockResolvedValue(expected);

      const result = await ctrl.add(user, 'tenant-1', dto);

      expect(domains.add).toHaveBeenCalledWith('user-1', 'tenant-1', dto);
      expect(result as unknown).toBe(expected);
    });
  });

  describe('instructions', () => {
    it('delegates to domains.instructions() with user sub and id', async () => {
      const { ctrl, domains } = makeController();
      const expected = { records: [{ type: 'CNAME', name: '@', value: 'proxy.example.com' }] };
      domains.instructions.mockResolvedValue(expected);

      const result = await ctrl.instructions(user, 'd-1');

      expect(domains.instructions).toHaveBeenCalledWith('user-1', 'd-1');
      expect(result as unknown).toBe(expected);
    });
  });

  describe('verify', () => {
    it('delegates to domains.verify() with user sub and id', async () => {
      const { ctrl, domains } = makeController();
      const expected = { id: 'd-1', verified: true };
      domains.verify.mockResolvedValue(expected);

      const result = await ctrl.verify(user, 'd-1');

      expect(domains.verify).toHaveBeenCalledWith('user-1', 'd-1');
      expect(result as unknown).toBe(expected);
    });
  });

  describe('remove', () => {
    it('delegates to domains.remove() with user sub and id', async () => {
      const { ctrl, domains } = makeController();
      const expected = { id: 'd-1', deleted: true };
      domains.remove.mockResolvedValue(expected);

      const result = await ctrl.remove(user, 'd-1');

      expect(domains.remove).toHaveBeenCalledWith('user-1', 'd-1');
      expect(result as unknown).toBe(expected);
    });
  });
});
