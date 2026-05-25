import { HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import type { JwtPayload } from '@madcreate/shared';
import type {
  RegisterDto,
  LoginDto,
  RefreshDto,
  RequestPasswordResetDto,
  ResetPasswordDto,
  VerifyEmailDto,
  ChangePasswordDto,
  MagicLinkRequestDto,
  MagicLinkConsumeDto,
} from './dto/auth.dto';

// ---------------------------------------------------------------------------
// Mock AuthService interface
// ---------------------------------------------------------------------------

interface MockAuthService {
  register: jest.Mock;
  login: jest.Mock;
  refresh: jest.Mock;
  logout: jest.Mock;
  requestPasswordReset: jest.Mock;
  resetPassword: jest.Mock;
  verifyEmail: jest.Mock;
  changePassword: jest.Mock;
  requestMagicLink: jest.Mock;
  consumeMagicLink: jest.Mock;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockAuthService(): MockAuthService {
  return {
    register: jest.fn(),
    login: jest.fn(),
    refresh: jest.fn(),
    logout: jest.fn(),
    requestPasswordReset: jest.fn(),
    resetPassword: jest.fn(),
    verifyEmail: jest.fn(),
    changePassword: jest.fn(),
    requestMagicLink: jest.fn(),
    consumeMagicLink: jest.fn(),
  };
}

function fakeReq(overrides: Partial<{ ip: string; userAgent: string }> = {}): Pick<Request, 'ip' | 'header'> {
  return {
    ip: overrides.ip ?? '127.0.0.1',
    header: jest.fn((h: string) => (h === 'user-agent' ? (overrides.userAgent ?? 'TestAgent') : undefined)) as Request['header'],
  };
}

const jwtUser: JwtPayload = {
  sub: 'user-1',
  email: 'alice@example.com',
  wsid: 'ws-1',
  role: 'WORKSPACE_OWNER',
  superAdmin: false,
};

function makeController() {
  const auth = mockAuthService();
  const ctrl = new AuthController(auth as unknown as AuthService);
  return { ctrl, auth };
}

// ---------------------------------------------------------------------------
// Decorator / metadata helpers
// ---------------------------------------------------------------------------

const reflector = new Reflector();

function getMethodMeta(key: string, method: Function) {
  return reflector.get(key, method);
}

function getHttpCode(method: Function): number | undefined {
  return Reflect.getMetadata('__httpCode__', method);
}

function getThrottleConfig(method: Function) {
  const limit = (name: string) => Reflect.getMetadata(`THROTTLER:LIMIT${name}`, method);
  const ttl   = (name: string) => Reflect.getMetadata(`THROTTLER:TTL${name}`, method);
  // Only return config if at least one throttler is present
  if (limit('short') === undefined) return undefined;
  return {
    short:  { limit: limit('short'),  ttl: ttl('short') },
    medium: { limit: limit('medium'), ttl: ttl('medium') },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AuthController', () => {
  // =========================================================================
  // Delegation tests
  // =========================================================================

  describe('register', () => {
    it('delegates to auth.register with dto and meta', async () => {
      const { ctrl, auth } = makeController();
      const dto: RegisterDto = { email: 'a@b.com', password: 'Str0ng!', firstName: 'A' };
      const req = fakeReq();
      const expected = { user: { id: '1' }, tokens: { accessToken: 'at' } };
      auth.register.mockResolvedValue(expected);

      const result = await ctrl.register(dto, req as Request);

      expect(auth.register).toHaveBeenCalledWith(dto, { userAgent: 'TestAgent', ip: '127.0.0.1' });
      expect(result).toBe(expected);
    });
  });

  describe('login', () => {
    it('delegates to auth.login with dto and meta', async () => {
      const { ctrl, auth } = makeController();
      const dto: LoginDto = { email: 'a@b.com', password: 'Str0ng!' };
      const req = fakeReq({ ip: '10.0.0.1', userAgent: 'Chrome' });
      const expected = { user: { id: '1' }, tokens: { accessToken: 'at' } };
      auth.login.mockResolvedValue(expected);

      const result = await ctrl.login(dto, req as Request);

      expect(auth.login).toHaveBeenCalledWith(dto, { userAgent: 'Chrome', ip: '10.0.0.1' });
      expect(result).toBe(expected);
    });
  });

  describe('refresh', () => {
    it('delegates to auth.refresh with token and meta', async () => {
      const { ctrl, auth } = makeController();
      const dto: RefreshDto = { refreshToken: 'rt-abc' };
      const req = fakeReq();
      const expected = { tokens: { accessToken: 'at2', refreshToken: 'rt2' } };
      auth.refresh.mockResolvedValue(expected);

      const result = await ctrl.refresh(dto, req as Request);

      expect(auth.refresh).toHaveBeenCalledWith('rt-abc', { userAgent: 'TestAgent', ip: '127.0.0.1' });
      expect(result).toBe(expected);
    });
  });

  describe('logout', () => {
    it('delegates to auth.logout with user.sub', async () => {
      const { ctrl, auth } = makeController();
      auth.logout.mockResolvedValue(undefined);

      await ctrl.logout(jwtUser);

      expect(auth.logout).toHaveBeenCalledWith('user-1');
    });

    it('returns undefined (204 No Content)', async () => {
      const { ctrl, auth } = makeController();
      auth.logout.mockResolvedValue(undefined);

      const result = await ctrl.logout(jwtUser);

      expect(result).toBeUndefined();
    });
  });

  describe('requestPasswordReset', () => {
    it('delegates to auth.requestPasswordReset and returns { accepted: true }', async () => {
      const { ctrl, auth } = makeController();
      const dto: RequestPasswordResetDto = { email: 'a@b.com' };
      auth.requestPasswordReset.mockResolvedValue(undefined);

      const result = await ctrl.requestPasswordReset(dto);

      expect(auth.requestPasswordReset).toHaveBeenCalledWith('a@b.com');
      expect(result).toEqual({ accepted: true });
    });
  });

  describe('resetPassword', () => {
    it('delegates to auth.resetPassword and returns { reset: true }', async () => {
      const { ctrl, auth } = makeController();
      const dto: ResetPasswordDto = { token: 'tok', password: 'NewStr0ng!' };
      auth.resetPassword.mockResolvedValue(undefined);

      const result = await ctrl.resetPassword(dto);

      expect(auth.resetPassword).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ reset: true });
    });
  });

  describe('verifyEmail', () => {
    it('delegates to auth.verifyEmail and returns { verified: true }', async () => {
      const { ctrl, auth } = makeController();
      const dto: VerifyEmailDto = { token: 'v-tok' };
      auth.verifyEmail.mockResolvedValue(undefined);

      const result = await ctrl.verifyEmail(dto);

      expect(auth.verifyEmail).toHaveBeenCalledWith('v-tok');
      expect(result).toEqual({ verified: true });
    });
  });

  describe('changePassword', () => {
    it('delegates to auth.changePassword and returns { changed: true }', async () => {
      const { ctrl, auth } = makeController();
      const dto: ChangePasswordDto = { currentPassword: 'old', newPassword: 'new' };
      auth.changePassword.mockResolvedValue(undefined);

      const result = await ctrl.changePassword(jwtUser, dto);

      expect(auth.changePassword).toHaveBeenCalledWith('user-1', dto);
      expect(result).toEqual({ changed: true });
    });
  });

  describe('requestMagicLink', () => {
    it('delegates to auth.requestMagicLink and returns { accepted: true }', async () => {
      const { ctrl, auth } = makeController();
      const dto: MagicLinkRequestDto = { email: 'a@b.com' };
      auth.requestMagicLink.mockResolvedValue(undefined);

      const result = await ctrl.requestMagicLink(dto);

      expect(auth.requestMagicLink).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ accepted: true });
    });
  });

  describe('consumeMagicLink', () => {
    it('delegates to auth.consumeMagicLink with token and meta', async () => {
      const { ctrl, auth } = makeController();
      const dto: MagicLinkConsumeDto = { token: 'ml-tok' };
      const req = fakeReq({ ip: '192.168.1.1', userAgent: 'Safari' });
      const expected = { user: { id: '1' }, tokens: { accessToken: 'at' } };
      auth.consumeMagicLink.mockResolvedValue(expected);

      const result = await ctrl.consumeMagicLink(dto, req as Request);

      expect(auth.consumeMagicLink).toHaveBeenCalledWith('ml-tok', { userAgent: 'Safari', ip: '192.168.1.1' });
      expect(result).toBe(expected);
    });
  });

  // =========================================================================
  // Decorator metadata tests
  // =========================================================================

  describe('decorator metadata', () => {
    const proto = AuthController.prototype;

    describe('@Public()', () => {
      it.each([
        'register',
        'login',
        'refresh',
        'requestPasswordReset',
        'resetPassword',
        'verifyEmail',
        'requestMagicLink',
        'consumeMagicLink',
      ])('%s is marked @Public', (method) => {
        expect(getMethodMeta(IS_PUBLIC_KEY, proto[method])).toBe(true);
      });

      it.each(['logout', 'changePassword'])('%s is NOT marked @Public', (method) => {
        expect(getMethodMeta(IS_PUBLIC_KEY, proto[method])).toBeFalsy();
      });
    });

    describe('@HttpCode()', () => {
      it('login returns 200 OK', () => {
        expect(getHttpCode(proto.login)).toBe(HttpStatus.OK);
      });

      it('logout returns 204 NO_CONTENT', () => {
        expect(getHttpCode(proto.logout)).toBe(HttpStatus.NO_CONTENT);
      });

      it('requestPasswordReset returns 202 ACCEPTED', () => {
        expect(getHttpCode(proto.requestPasswordReset)).toBe(HttpStatus.ACCEPTED);
      });

      it('resetPassword returns 200 OK', () => {
        expect(getHttpCode(proto.resetPassword)).toBe(HttpStatus.OK);
      });

      it('verifyEmail returns 200 OK', () => {
        expect(getHttpCode(proto.verifyEmail)).toBe(HttpStatus.OK);
      });

      it('changePassword returns 200 OK', () => {
        expect(getHttpCode(proto.changePassword)).toBe(HttpStatus.OK);
      });

      it('requestMagicLink returns 202 ACCEPTED', () => {
        expect(getHttpCode(proto.requestMagicLink)).toBe(HttpStatus.ACCEPTED);
      });

      it('consumeMagicLink returns 200 OK', () => {
        expect(getHttpCode(proto.consumeMagicLink)).toBe(HttpStatus.OK);
      });
    });

    describe('@Throttle()', () => {
      it.each([
        'register',
        'login',
        'requestPasswordReset',
        'changePassword',
        'requestMagicLink',
      ])('%s has strict throttle (short: 5/60s)', (method) => {
        const cfg = getThrottleConfig(proto[method]);
        expect(cfg).toBeDefined();
        expect(cfg!.short?.limit).toBe(5);
        expect(cfg!.short?.ttl).toBe(60_000);
        expect(cfg!.medium?.limit).toBe(20);
        expect(cfg!.medium?.ttl).toBe(3_600_000);
      });

      it.each([
        'refresh',
        'resetPassword',
        'verifyEmail',
        'consumeMagicLink',
      ])('%s has moderate throttle (short: 10/60s)', (method) => {
        const cfg = getThrottleConfig(proto[method]);
        expect(cfg).toBeDefined();
        expect(cfg!.short?.limit).toBe(10);
        expect(cfg!.short?.ttl).toBe(60_000);
      });
    });
  });
});
