import type { JwtPayload } from '@madcreate/shared';
import { LeadsController } from './leads.controller';
import { LeadsService } from './leads.service';
import { UpdateLeadDto } from './dto/update-lead.dto';

// ---------------------------------------------------------------------------
// Mock LeadsService interface
// ---------------------------------------------------------------------------

interface MockLeadsService {
  list: jest.Mock;
  update: jest.Mock;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockLeadsService(): MockLeadsService {
  return {
    list: jest.fn(),
    update: jest.fn(),
  };
}

function makeController() {
  const service = mockLeadsService();
  const ctrl = new LeadsController(service as unknown as LeadsService);
  return { ctrl, service };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('LeadsController', () => {
  // =========================================================================
  // list
  // =========================================================================

  describe('list', () => {
    it('delegates to service.list() with user sub, tenantId, and status filter', async () => {
      const { ctrl, service } = makeController();
      const user: JwtPayload = { sub: 'user-1', email: 'user@example.com' };
      const tenantId = 'tenant-1';
      const status = 'new';
      const expected = [{ id: 'lead-1', status: 'new' }];
      service.list.mockResolvedValue(expected);

      const result = await ctrl.list(user, tenantId, status);

      expect(service.list).toHaveBeenCalledWith('user-1', tenantId, { status });
      expect(result as unknown).toBe(expected);
    });

    it('passes undefined status when not provided', async () => {
      const { ctrl, service } = makeController();
      const user: JwtPayload = { sub: 'user-1', email: 'user@example.com' };
      const tenantId = 'tenant-1';
      const expected = [{ id: 'lead-1' }];
      service.list.mockResolvedValue(expected);

      const result = await ctrl.list(user, tenantId, undefined);

      expect(service.list).toHaveBeenCalledWith('user-1', tenantId, { status: undefined });
      expect(result as unknown).toBe(expected);
    });
  });

  // =========================================================================
  // update
  // =========================================================================

  describe('update', () => {
    it('delegates to service.update() with user sub, tenantId, id, and dto', async () => {
      const { ctrl, service } = makeController();
      const user: JwtPayload = { sub: 'user-1', email: 'user@example.com' };
      const tenantId = 'tenant-1';
      const id = 'lead-1';
      const dto: UpdateLeadDto = { status: 'contacted' };
      const expected = { id: 'lead-1', status: 'contacted' };
      service.update.mockResolvedValue(expected);

      const result = await ctrl.update(user, tenantId, id, dto);

      expect(service.update).toHaveBeenCalledWith('user-1', tenantId, id, dto);
      expect(result as unknown).toBe(expected);
    });
  });
});
