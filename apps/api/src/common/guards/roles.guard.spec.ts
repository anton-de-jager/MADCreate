import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { ROLES_KEY } from '../decorators/roles.decorator';
import type { Role, JwtPayload } from '@madcreate/shared';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeContext(user?: Partial<JwtPayload>): ExecutionContext {
  return {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
}

function makeGuard(roles: Role[] | undefined) {
  const reflector = {
    getAllAndOverride: jest.fn().mockReturnValue(roles),
  } as unknown as Reflector;

  const guard = new RolesGuard(reflector);
  return { guard, reflector };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('RolesGuard', () => {
  // -----------------------------------------------------------------------
  // No roles required
  // -----------------------------------------------------------------------
  describe('no roles required', () => {
    it('returns true when no @Roles decorator is present (undefined)', () => {
      const { guard } = makeGuard(undefined);
      const ctx = makeContext(); // no user needed

      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('returns true when @Roles decorator has empty array', () => {
      const { guard } = makeGuard([]);
      const ctx = makeContext();

      expect(guard.canActivate(ctx)).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // No user on request
  // -----------------------------------------------------------------------
  describe('no user on request', () => {
    it('throws ForbiddenException when user is undefined', () => {
      const { guard } = makeGuard(['ADMIN']);
      const ctx = makeContext(undefined);

      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(ctx)).toThrow('Authentication required');
    });
  });

  // -----------------------------------------------------------------------
  // SuperAdmin bypass
  // -----------------------------------------------------------------------
  describe('superAdmin bypass', () => {
    it('returns true for superAdmin regardless of required role', () => {
      const { guard } = makeGuard(['WORKSPACE_OWNER']);
      const ctx = makeContext({ superAdmin: true, role: 'VIEWER' as Role });

      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('returns true for superAdmin even with no workspace role', () => {
      const { guard } = makeGuard(['ADMIN']);
      const ctx = makeContext({ superAdmin: true });

      expect(guard.canActivate(ctx)).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // Sufficient role
  // -----------------------------------------------------------------------
  describe('sufficient role', () => {
    it('returns true when user role equals required role', () => {
      const { guard } = makeGuard(['ADMIN']);
      const ctx = makeContext({ role: 'ADMIN' as Role });

      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('returns true when user role exceeds required role', () => {
      const { guard } = makeGuard(['EDITOR']);
      const ctx = makeContext({ role: 'WORKSPACE_OWNER' as Role });

      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('returns true when user meets at least one of multiple required roles', () => {
      const { guard } = makeGuard(['ADMIN', 'VIEWER'] as Role[]);
      const ctx = makeContext({ role: 'VIEWER' as Role });

      expect(guard.canActivate(ctx)).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // Insufficient role
  // -----------------------------------------------------------------------
  describe('insufficient role', () => {
    it('throws ForbiddenException when user role is below required role', () => {
      const { guard } = makeGuard(['ADMIN']);
      const ctx = makeContext({ role: 'EDITOR' as Role });

      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(ctx)).toThrow(/Requires role/);
    });

    it('throws ForbiddenException when user has no role on token', () => {
      const { guard } = makeGuard(['VIEWER']);
      const ctx = makeContext({ superAdmin: false });

      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(ctx)).toThrow('No workspace role on token');
    });
  });

  // -----------------------------------------------------------------------
  // Reflector integration
  // -----------------------------------------------------------------------
  describe('reflector integration', () => {
    it('calls reflector.getAllAndOverride with ROLES_KEY and handler/class', () => {
      const { guard, reflector } = makeGuard(undefined);
      const ctx = makeContext();

      guard.canActivate(ctx);

      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, [
        ctx.getHandler(),
        ctx.getClass(),
      ]);
    });
  });
});
