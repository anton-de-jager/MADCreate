import type { JwtPayload } from '@madcreate/shared';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

// ---------------------------------------------------------------------------
// Mock UsersService interface
// ---------------------------------------------------------------------------

interface MockUsersService {
  me: jest.Mock;
  updateProfile: jest.Mock;
  deleteAccount: jest.Mock;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fakeUser(sub = 'user-1'): JwtPayload {
  return { sub, email: 'test@example.com' };
}

function mockUsersService(): MockUsersService {
  return {
    me: jest.fn(),
    updateProfile: jest.fn(),
    deleteAccount: jest.fn(),
  };
}

function makeController() {
  const service = mockUsersService();
  const ctrl = new UsersController(service as unknown as UsersService);
  return { ctrl, service };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('UsersController', () => {
  // =========================================================================
  // me
  // =========================================================================

  describe('me', () => {
    it('delegates to service.me() with user sub', async () => {
      const { ctrl, service } = makeController();
      const expected = { id: 'user-1', email: 'test@example.com' };
      service.me.mockResolvedValue(expected);

      const result = await ctrl.me(fakeUser());

      expect(service.me).toHaveBeenCalledWith('user-1');
      expect(result as unknown).toBe(expected);
    });
  });

  // =========================================================================
  // updateMe
  // =========================================================================

  describe('updateMe', () => {
    it('delegates to service.updateProfile() with user sub and dto', async () => {
      const { ctrl, service } = makeController();
      const dto = { firstName: 'John', lastName: 'Doe' };
      const expected = { id: 'user-1', firstName: 'John', lastName: 'Doe' };
      service.updateProfile.mockResolvedValue(expected);

      const result = await ctrl.updateMe(fakeUser(), dto);

      expect(service.updateProfile).toHaveBeenCalledWith('user-1', dto);
      expect(result as unknown).toBe(expected);
    });
  });

  // =========================================================================
  // deleteMe
  // =========================================================================

  describe('deleteMe', () => {
    it('delegates to service.deleteAccount() with user sub', async () => {
      const { ctrl, service } = makeController();
      const expected = { success: true };
      service.deleteAccount.mockResolvedValue(expected);

      const result = await ctrl.deleteMe(fakeUser());

      expect(service.deleteAccount).toHaveBeenCalledWith('user-1');
      expect(result as unknown).toBe(expected);
    });
  });
});
