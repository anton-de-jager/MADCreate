import { ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface MockRequest {
  headers: Record<string, string>;
  query: Record<string, string>;
  worker?: boolean;
  [key: string]: unknown;
}

function makeRequest(overrides: Record<string, unknown> = {}): MockRequest {
  return {
    headers: {} as Record<string, string>,
    query: {} as Record<string, string>,
    ...overrides,
  } as MockRequest;
}

function makeContext(request: MockRequest): ExecutionContext {
  return {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

function makeGuard(
  reflectorOverride?: Partial<Reflector>,
  configOverride?: Record<string, string | undefined>,
) {
  const reflector = {
    getAllAndOverride: jest.fn().mockReturnValue(false),
    ...reflectorOverride,
  } as unknown as Reflector;

  const configService = {
    get: jest.fn((key: string) => configOverride?.[key]),
  } as unknown as ConfigService;

  // Directly mock the AuthGuard prototype's canActivate.
  // We store the real canActivate, then restore after constructing the spy.
  const realCanActivate = JwtAuthGuard.prototype.canActivate;

  // Create a fresh guard so we can spy on the parent call.
  const guard2 = new JwtAuthGuard(reflector, configService);
  const superSpy = jest
    .fn()
    .mockReturnValue(true); // default: Passport accepts

  // Replace the parent canActivate on the instance
  Object.getPrototypeOf(JwtAuthGuard.prototype).canActivate = superSpy;

  // Restore after each test via the return value
  return { guard: guard2, reflector, configService, superSpy, restore: () => {
    Object.getPrototypeOf(JwtAuthGuard.prototype).canActivate = realCanActivate;
  }};
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: Reflector;
  let superSpy: jest.Mock;
  let restore: () => void;

  const WORKER_TOKEN = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2';

  beforeEach(() => {
    const ctx = makeGuard(undefined, { 'claude.workerToken': WORKER_TOKEN });
    guard = ctx.guard;
    reflector = ctx.reflector;
    superSpy = ctx.superSpy;
    restore = ctx.restore;
  });

  afterEach(() => {
    restore();
    jest.restoreAllMocks();
  });

  // -----------------------------------------------------------------------
  // Public route bypass
  // -----------------------------------------------------------------------
  describe('public route bypass', () => {
    it('returns true when IS_PUBLIC_KEY metadata is true', () => {
      (reflector.getAllAndOverride as jest.Mock).mockReturnValue(true);
      const req = makeRequest();
      const ctx = makeContext(req);

      expect(guard.canActivate(ctx)).toBe(true);
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
        ctx.getHandler(),
        ctx.getClass(),
      ]);
      expect(superSpy).not.toHaveBeenCalled();
    });

    it('does not short-circuit when IS_PUBLIC_KEY is false', () => {
      (reflector.getAllAndOverride as jest.Mock).mockReturnValue(false);
      const req = makeRequest();
      const ctx = makeContext(req);

      guard.canActivate(ctx);
      expect(superSpy).toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // Worker-token authentication
  // -----------------------------------------------------------------------
  describe('worker token auth', () => {
    it('returns true and sets req.worker when valid worker token is presented', () => {
      const req = makeRequest({
        headers: { 'x-worker-token': WORKER_TOKEN },
      });
      const ctx = makeContext(req);

      expect(guard.canActivate(ctx)).toBe(true);
      expect(req.worker).toBe(true);
      expect(superSpy).not.toHaveBeenCalled();
    });

    it('rejects when worker token does not match', () => {
      const req = makeRequest({
        headers: { 'x-worker-token': 'wrong-token-value-of-same-length!!' },
      });
      const ctx = makeContext(req);

      guard.canActivate(ctx);
      // Should fall through to super.canActivate (Passport)
      expect(req.worker).toBeUndefined();
      expect(superSpy).toHaveBeenCalled();
    });

    it('rejects when worker token header is missing', () => {
      const req = makeRequest();
      const ctx = makeContext(req);

      guard.canActivate(ctx);
      expect(req.worker).toBeUndefined();
      expect(superSpy).toHaveBeenCalled();
    });

    it('rejects when configured worker token is undefined', () => {
      const noToken = makeGuard(undefined, { 'claude.workerToken': undefined });
      const req = makeRequest({
        headers: { 'x-worker-token': 'some-token' },
      });
      const ctx = makeContext(req);

      noToken.guard.canActivate(ctx);
      expect(req.worker).toBeUndefined();
      expect(noToken.superSpy).toHaveBeenCalled();
      noToken.restore();
    });

    it('rejects tokens of different lengths (timing-safe guard)', () => {
      const req = makeRequest({
        headers: { 'x-worker-token': 'short' },
      });
      const ctx = makeContext(req);

      guard.canActivate(ctx);
      expect(req.worker).toBeUndefined();
      expect(superSpy).toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // SSE query-param JWT fallback
  // -----------------------------------------------------------------------
  describe('query token promotion', () => {
    it('copies query token into Authorization header when no auth header exists', () => {
      const jwt = 'eyJhbGciOiJIUzI1NiJ9.test.payload';
      const req = makeRequest({ query: { token: jwt } });
      const ctx = makeContext(req);

      guard.canActivate(ctx);

      expect(req.headers.authorization).toBe(`Bearer ${jwt}`);
      expect(superSpy).toHaveBeenCalled();
    });

    it('does not overwrite existing Authorization header', () => {
      const jwt = 'eyJhbGciOiJIUzI1NiJ9.test.payload';
      const req = makeRequest({
        headers: { authorization: 'Bearer existing-token' },
        query: { token: jwt },
      });
      const ctx = makeContext(req);

      guard.canActivate(ctx);

      expect(req.headers.authorization).toBe('Bearer existing-token');
    });

    it('ignores empty query token string', () => {
      const req = makeRequest({ query: { token: '' } });
      const ctx = makeContext(req);

      guard.canActivate(ctx);

      expect(req.headers.authorization).toBeUndefined();
      expect(superSpy).toHaveBeenCalled();
    });

    it('ignores missing query token', () => {
      const req = makeRequest();
      const ctx = makeContext(req);

      guard.canActivate(ctx);

      expect(req.headers.authorization).toBeUndefined();
      expect(superSpy).toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // Rejection (delegates to Passport)
  // -----------------------------------------------------------------------
  describe('rejection', () => {
    it('delegates to super.canActivate when no bypass applies', () => {
      superSpy.mockReturnValue(false);
      const req = makeRequest();
      const ctx = makeContext(req);

      const result = guard.canActivate(ctx);

      expect(result).toBe(false);
      expect(superSpy).toHaveBeenCalledWith(ctx);
    });
  });
});
