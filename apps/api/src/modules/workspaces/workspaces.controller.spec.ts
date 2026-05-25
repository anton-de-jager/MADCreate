import { Role } from '@prisma/client';
import { WorkspacesController } from './workspaces.controller';
import { WorkspacesService } from './workspaces.service';

// ---------------------------------------------------------------------------
// Mock WorkspacesService interface
// ---------------------------------------------------------------------------

interface MockWorkspacesService {
  acceptInvite: jest.Mock;
  listMine: jest.Mock;
  get: jest.Mock;
  update: jest.Mock;
  invite: jest.Mock;
  members: jest.Mock;
  stats: jest.Mock;
  leave: jest.Mock;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockWorkspacesService(): MockWorkspacesService {
  return {
    acceptInvite: jest.fn(),
    listMine: jest.fn(),
    get: jest.fn(),
    update: jest.fn(),
    invite: jest.fn(),
    members: jest.fn(),
    stats: jest.fn(),
    leave: jest.fn(),
  };
}

function makeController() {
  const workspaces = mockWorkspacesService();
  const ctrl = new WorkspacesController(workspaces as unknown as WorkspacesService);
  return { ctrl, workspaces };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

const user = { sub: 'user-1', email: 'test@example.com' };

describe('WorkspacesController', () => {
  // =========================================================================
  // Delegation tests
  // =========================================================================

  describe('acceptInvite', () => {
    it('delegates to workspaces.acceptInvite() extracting dto.token', async () => {
      const { ctrl, workspaces } = makeController();
      const expected = { id: 'inv-1', accepted: true };
      workspaces.acceptInvite.mockResolvedValue(expected);

      const result = await ctrl.acceptInvite(user, { token: 'tok-abc' });

      expect(workspaces.acceptInvite).toHaveBeenCalledWith('user-1', 'tok-abc');
      expect(result as unknown).toBe(expected);
    });
  });

  describe('list', () => {
    it('delegates to workspaces.listMine()', async () => {
      const { ctrl, workspaces } = makeController();
      const expected = [{ id: 'ws-1', name: 'My Workspace' }];
      workspaces.listMine.mockResolvedValue(expected);

      const result = await ctrl.list(user);

      expect(workspaces.listMine).toHaveBeenCalledWith('user-1');
      expect(result as unknown).toBe(expected);
    });
  });

  describe('get', () => {
    it('delegates to workspaces.get()', async () => {
      const { ctrl, workspaces } = makeController();
      const expected = { id: 'ws-1', name: 'My Workspace' };
      workspaces.get.mockResolvedValue(expected);

      const result = await ctrl.get(user, 'ws-1');

      expect(workspaces.get).toHaveBeenCalledWith('user-1', 'ws-1');
      expect(result as unknown).toBe(expected);
    });
  });

  describe('update', () => {
    it('delegates to workspaces.update() with dto', async () => {
      const { ctrl, workspaces } = makeController();
      const dto = { name: 'Updated', billingEmail: 'billing@test.com' };
      const expected = { id: 'ws-1', ...dto };
      workspaces.update.mockResolvedValue(expected);

      const result = await ctrl.update(user, 'ws-1', dto);

      expect(workspaces.update).toHaveBeenCalledWith('user-1', 'ws-1', dto);
      expect(result as unknown).toBe(expected);
    });
  });

  describe('invite', () => {
    it('delegates to workspaces.invite() with dto', async () => {
      const { ctrl, workspaces } = makeController();
      const dto = { email: 'new@example.com', role: Role.EDITOR };
      const expected = { id: 'inv-1', email: 'new@example.com' };
      workspaces.invite.mockResolvedValue(expected);

      const result = await ctrl.invite(user, 'ws-1', dto);

      expect(workspaces.invite).toHaveBeenCalledWith('user-1', 'ws-1', dto);
      expect(result as unknown).toBe(expected);
    });
  });

  describe('members', () => {
    it('delegates to workspaces.members()', async () => {
      const { ctrl, workspaces } = makeController();
      const expected = [{ userId: 'user-1', role: 'OWNER' }];
      workspaces.members.mockResolvedValue(expected);

      const result = await ctrl.members(user, 'ws-1');

      expect(workspaces.members).toHaveBeenCalledWith('user-1', 'ws-1');
      expect(result as unknown).toBe(expected);
    });
  });

  describe('stats', () => {
    it('delegates to workspaces.stats()', async () => {
      const { ctrl, workspaces } = makeController();
      const expected = { tenants: 3, sites: 5 };
      workspaces.stats.mockResolvedValue(expected);

      const result = await ctrl.stats(user, 'ws-1');

      expect(workspaces.stats).toHaveBeenCalledWith('user-1', 'ws-1');
      expect(result as unknown).toBe(expected);
    });
  });

  describe('leave', () => {
    it('delegates to workspaces.leave()', async () => {
      const { ctrl, workspaces } = makeController();
      const expected = { success: true };
      workspaces.leave.mockResolvedValue(expected);

      const result = await ctrl.leave(user, 'ws-1');

      expect(workspaces.leave).toHaveBeenCalledWith('user-1', 'ws-1');
      expect(result as unknown).toBe(expected);
    });
  });
});
