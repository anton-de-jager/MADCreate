import { CallHandler, ExecutionContext } from '@nestjs/common';
import { of, lastValueFrom } from 'rxjs';
import { AuditInterceptor } from './audit.interceptor';
import { PrismaService } from '../../prisma/prisma.service';

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

const AuditAction = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  PUBLISH: 'PUBLISH',
  GENERATE: 'GENERATE',
  DEPLOY: 'DEPLOY',
  INVITE: 'INVITE',
} as const;

function mockPrisma(): PrismaService {
  return {
    auditLog: { create: jest.fn().mockResolvedValue({ id: 'audit-1' }) },
  } as unknown as PrismaService;
}

function mockRequest(overrides: Record<string, unknown> = {}) {
  return {
    method: 'POST',
    originalUrl: '/v1/pages',
    url: '/v1/pages',
    ip: '127.0.0.1',
    headers: { 'user-agent': 'jest-test' },
    query: {},
    body: {},
    user: { sub: 'user-1' },
    ...overrides,
  };
}

function mockCtx(req: unknown): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
}

function mockCallHandler(data: unknown = { ok: true }): CallHandler {
  return { handle: () => of(data) };
}

/* ------------------------------------------------------------------ */
/*  Tests                                                             */
/* ------------------------------------------------------------------ */

describe('AuditInterceptor', () => {
  let prisma: PrismaService;
  let interceptor: AuditInterceptor;

  beforeEach(() => {
    prisma = mockPrisma();
    interceptor = new AuditInterceptor(prisma);
  });

  // ------------------------------------------------------------------
  // Skip rules
  // ------------------------------------------------------------------
  describe('skip rules', () => {
    it.each(['GET', 'HEAD', 'OPTIONS'])('skips %s requests', async (method) => {
      const req = mockRequest({ method });
      await lastValueFrom(interceptor.intercept(mockCtx(req), mockCallHandler()));
      expect(prisma.auditLog.create).not.toHaveBeenCalled();
    });

    it('skips /health endpoint', async () => {
      const req = mockRequest({ originalUrl: '/v1/health', url: '/v1/health' });
      await lastValueFrom(interceptor.intercept(mockCtx(req), mockCallHandler()));
      expect(prisma.auditLog.create).not.toHaveBeenCalled();
    });

    it('skips /auth/refresh endpoint', async () => {
      const req = mockRequest({ originalUrl: '/v1/auth/refresh', url: '/v1/auth/refresh' });
      await lastValueFrom(interceptor.intercept(mockCtx(req), mockCallHandler()));
      expect(prisma.auditLog.create).not.toHaveBeenCalled();
    });

    it('skips /claude-tasks/next endpoint', async () => {
      const req = mockRequest({ originalUrl: '/v1/claude-tasks/next', url: '/v1/claude-tasks/next' });
      await lastValueFrom(interceptor.intercept(mockCtx(req), mockCallHandler()));
      expect(prisma.auditLog.create).not.toHaveBeenCalled();
    });
  });

  // ------------------------------------------------------------------
  // Action inference from HTTP method
  // ------------------------------------------------------------------
  describe('action inference from HTTP method', () => {
    it('POST maps to CREATE', async () => {
      const req = mockRequest({ method: 'POST', originalUrl: '/v1/pages', url: '/v1/pages' });
      await lastValueFrom(interceptor.intercept(mockCtx(req), mockCallHandler()));
      await flushPromises();
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ action: AuditAction.CREATE }) }),
      );
    });

    it('PUT maps to UPDATE', async () => {
      const req = mockRequest({ method: 'PUT', originalUrl: '/v1/pages/1', url: '/v1/pages/1' });
      await lastValueFrom(interceptor.intercept(mockCtx(req), mockCallHandler()));
      await flushPromises();
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ action: AuditAction.UPDATE }) }),
      );
    });

    it('PATCH maps to UPDATE', async () => {
      const req = mockRequest({ method: 'PATCH', originalUrl: '/v1/pages/1', url: '/v1/pages/1' });
      await lastValueFrom(interceptor.intercept(mockCtx(req), mockCallHandler()));
      await flushPromises();
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ action: AuditAction.UPDATE }) }),
      );
    });

    it('DELETE maps to DELETE', async () => {
      const req = mockRequest({ method: 'DELETE', originalUrl: '/v1/pages/1', url: '/v1/pages/1' });
      await lastValueFrom(interceptor.intercept(mockCtx(req), mockCallHandler()));
      await flushPromises();
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ action: AuditAction.DELETE }) }),
      );
    });
  });

  // ------------------------------------------------------------------
  // Action inference — URL overrides
  // ------------------------------------------------------------------
  describe('action inference — URL overrides', () => {
    it('/auth/login maps to LOGIN', async () => {
      const req = mockRequest({ originalUrl: '/v1/auth/login', url: '/v1/auth/login' });
      await lastValueFrom(interceptor.intercept(mockCtx(req), mockCallHandler()));
      await flushPromises();
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ action: AuditAction.LOGIN }) }),
      );
    });

    it('/auth/logout maps to LOGOUT', async () => {
      const req = mockRequest({ originalUrl: '/v1/auth/logout', url: '/v1/auth/logout' });
      await lastValueFrom(interceptor.intercept(mockCtx(req), mockCallHandler()));
      await flushPromises();
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ action: AuditAction.LOGOUT }) }),
      );
    });

    it('/deploy maps to DEPLOY', async () => {
      const req = mockRequest({ originalUrl: '/v1/deploy', url: '/v1/deploy' });
      await lastValueFrom(interceptor.intercept(mockCtx(req), mockCallHandler()));
      await flushPromises();
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ action: AuditAction.DEPLOY }) }),
      );
    });

    it('/invites maps to INVITE', async () => {
      const req = mockRequest({ originalUrl: '/v1/invites', url: '/v1/invites' });
      await lastValueFrom(interceptor.intercept(mockCtx(req), mockCallHandler()));
      await flushPromises();
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ action: AuditAction.INVITE }) }),
      );
    });

    it('/invite (singular) maps to INVITE', async () => {
      const req = mockRequest({ originalUrl: '/v1/invite', url: '/v1/invite' });
      await lastValueFrom(interceptor.intercept(mockCtx(req), mockCallHandler()));
      await flushPromises();
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ action: AuditAction.INVITE }) }),
      );
    });

    it('/generate maps to GENERATE', async () => {
      const req = mockRequest({ originalUrl: '/v1/generate', url: '/v1/generate' });
      await lastValueFrom(interceptor.intercept(mockCtx(req), mockCallHandler()));
      await flushPromises();
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ action: AuditAction.GENERATE }) }),
      );
    });

    it('/ai/something maps to GENERATE', async () => {
      const req = mockRequest({ originalUrl: '/v1/ai/chat', url: '/v1/ai/chat' });
      await lastValueFrom(interceptor.intercept(mockCtx(req), mockCallHandler()));
      await flushPromises();
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ action: AuditAction.GENERATE }) }),
      );
    });

    it('/sites/123/publish maps to PUBLISH', async () => {
      const req = mockRequest({ originalUrl: '/v1/sites/123/publish', url: '/v1/sites/123/publish' });
      await lastValueFrom(interceptor.intercept(mockCtx(req), mockCallHandler()));
      await flushPromises();
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ action: AuditAction.PUBLISH }) }),
      );
    });
  });

  // ------------------------------------------------------------------
  // Entity inference
  // ------------------------------------------------------------------
  describe('entity inference', () => {
    it('extracts entity from /v1/pages/123', async () => {
      const req = mockRequest({ originalUrl: '/v1/pages/123', url: '/v1/pages/123' });
      await lastValueFrom(interceptor.intercept(mockCtx(req), mockCallHandler()));
      await flushPromises();
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ entity: 'pages' }) }),
      );
    });

    it('extracts entity from /v1/sites/abc/publish', async () => {
      const req = mockRequest({ originalUrl: '/v1/sites/abc/publish', url: '/v1/sites/abc/publish' });
      await lastValueFrom(interceptor.intercept(mockCtx(req), mockCallHandler()));
      await flushPromises();
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ entity: 'sites' }) }),
      );
    });

    it('strips query string before extracting entity', async () => {
      const req = mockRequest({
        originalUrl: '/v1/templates?tenantId=t1',
        url: '/v1/templates?tenantId=t1',
      });
      await lastValueFrom(interceptor.intercept(mockCtx(req), mockCallHandler()));
      await flushPromises();
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ entity: 'templates' }) }),
      );
    });

    it('returns "unknown" for root-level URL with no segments', async () => {
      const req = mockRequest({ originalUrl: '/', url: '/' });
      await lastValueFrom(interceptor.intercept(mockCtx(req), mockCallHandler()));
      await flushPromises();
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ entity: 'unknown' }) }),
      );
    });
  });

  // ------------------------------------------------------------------
  // Fire-and-forget write
  // ------------------------------------------------------------------
  describe('fire-and-forget write', () => {
    it('calls prisma.auditLog.create with correct data shape', async () => {
      const req = mockRequest({
        method: 'POST',
        originalUrl: '/v1/pages',
        url: '/v1/pages',
        ip: '10.0.0.1',
        headers: { 'user-agent': 'TestAgent/1.0' },
        user: { sub: 'user-42' },
        query: { tenantId: 'tenant-1' },
        body: { workspaceId: 'ws-1' },
      });
      await lastValueFrom(interceptor.intercept(mockCtx(req), mockCallHandler()));
      await flushPromises();

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          action: AuditAction.CREATE,
          entity: 'pages',
          userId: 'user-42',
          tenantId: 'tenant-1',
          workspaceId: 'ws-1',
          ip: '10.0.0.1',
          userAgent: 'TestAgent/1.0',
          meta: { method: 'POST', path: '/v1/pages', worker: false },
        },
      });
    });

    it('sets userId to null when req.user is undefined', async () => {
      const req = mockRequest({ user: undefined });
      await lastValueFrom(interceptor.intercept(mockCtx(req), mockCallHandler()));
      await flushPromises();
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ userId: null }) }),
      );
    });

    it('captures worker flag in meta', async () => {
      const req = mockRequest({ worker: true });
      await lastValueFrom(interceptor.intercept(mockCtx(req), mockCallHandler()));
      await flushPromises();
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            meta: expect.objectContaining({ worker: true }),
          }),
        }),
      );
    });

    it('reads tenantId from body when query does not have it', async () => {
      const req = mockRequest({ query: {}, body: { tenantId: 'body-tenant' } });
      await lastValueFrom(interceptor.intercept(mockCtx(req), mockCallHandler()));
      await flushPromises();
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ tenantId: 'body-tenant' }) }),
      );
    });

    it('prefers tenantId from query over body', async () => {
      const req = mockRequest({
        query: { tenantId: 'query-tenant' },
        body: { tenantId: 'body-tenant' },
      });
      await lastValueFrom(interceptor.intercept(mockCtx(req), mockCallHandler()));
      await flushPromises();
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ tenantId: 'query-tenant' }) }),
      );
    });

    it('still returns handler data to the caller', async () => {
      const req = mockRequest();
      const result = await lastValueFrom(
        interceptor.intercept(mockCtx(req), mockCallHandler({ id: 99 })),
      );
      expect(result).toEqual({ id: 99 });
    });
  });

  // ------------------------------------------------------------------
  // Failure tolerance
  // ------------------------------------------------------------------
  describe('audit failure tolerance', () => {
    it('does not break the request when prisma.auditLog.create rejects', async () => {
      (prisma.auditLog.create as jest.Mock).mockRejectedValueOnce(new Error('DB down'));

      const req = mockRequest();
      const result = await lastValueFrom(
        interceptor.intercept(mockCtx(req), mockCallHandler({ ok: true })),
      );
      await flushPromises();

      // The response is still returned despite the audit write failure.
      expect(result).toEqual({ ok: true });
    });

    it('logs a warning when the audit write fails', async () => {
      (prisma.auditLog.create as jest.Mock).mockRejectedValueOnce(new Error('DB down'));
      const warnSpy = jest.spyOn(interceptor['logger'], 'warn').mockImplementation();

      const req = mockRequest();
      await lastValueFrom(interceptor.intercept(mockCtx(req), mockCallHandler()));
      await flushPromises();

      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('DB down'));
      warnSpy.mockRestore();
    });
  });
});

/* ------------------------------------------------------------------ */
/*  Utility                                                           */
/* ------------------------------------------------------------------ */

function flushPromises() {
  return new Promise<void>((resolve) => setImmediate(resolve));
}
