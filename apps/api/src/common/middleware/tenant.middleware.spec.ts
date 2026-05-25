import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantMiddleware } from './tenant.middleware';

// ---------------------------------------------------------------------------
// Mock helpers
// ---------------------------------------------------------------------------

const TENANT_FIXTURE = {
  id: 'tenant-uuid-1',
  slug: 'acme',
  workspaceId: 'ws-uuid-1',
};

function mockPrisma(overrides: {
  tenantFindFirst?: jest.Mock;
  domainFindUnique?: jest.Mock;
} = {}) {
  return {
    tenant: {
      findFirst: overrides.tenantFindFirst ?? jest.fn().mockResolvedValue(null),
    },
    domain: {
      findUnique: overrides.domainFindUnique ?? jest.fn().mockResolvedValue(null),
    },
  } as unknown as PrismaService;
}

function mockReq(headers: Record<string, string> = {}): Request {
  return {
    header: jest.fn((name: string) => headers[name.toLowerCase()]),
  } as unknown as Request;
}

function mockRes(): Response {
  return {} as unknown as Response;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('TenantMiddleware', () => {
  let next: NextFunction;

  beforeEach(() => {
    next = jest.fn();
  });

  // =========================================================================
  // Resolution via X-Tenant-Id header
  // =========================================================================

  describe('X-Tenant-Id header', () => {
    it('resolves tenant by id and attaches it to req.tenant', async () => {
      const prisma = mockPrisma({
        tenantFindFirst: jest.fn().mockResolvedValue(TENANT_FIXTURE),
      });
      const mw = new TenantMiddleware(prisma);
      const req = mockReq({ 'x-tenant-id': 'tenant-uuid-1' });
      const res = mockRes();

      await mw.use(req, res, next);

      expect(prisma.tenant.findFirst).toHaveBeenCalledWith({
        where: { id: 'tenant-uuid-1', deletedAt: null },
        select: { id: true, slug: true, workspaceId: true },
      });
      expect(req.tenant).toEqual(TENANT_FIXTURE);
      expect(next).toHaveBeenCalled();
    });

    it('does not set req.tenant when id lookup returns null', async () => {
      const prisma = mockPrisma({
        tenantFindFirst: jest.fn().mockResolvedValue(null),
      });
      const mw = new TenantMiddleware(prisma);
      const req = mockReq({ 'x-tenant-id': 'unknown-id' });

      await mw.use(req, mockRes(), next);

      expect(req.tenant).toBeUndefined();
      expect(next).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Resolution via X-Tenant-Slug header
  // =========================================================================

  describe('X-Tenant-Slug header', () => {
    it('resolves tenant by slug and attaches it to req.tenant', async () => {
      const prisma = mockPrisma({
        tenantFindFirst: jest.fn().mockResolvedValue(TENANT_FIXTURE),
      });
      const mw = new TenantMiddleware(prisma);
      const req = mockReq({ 'x-tenant-slug': 'acme' });
      const res = mockRes();

      await mw.use(req, res, next);

      expect(prisma.tenant.findFirst).toHaveBeenCalledWith({
        where: { slug: 'acme', deletedAt: null },
        select: { id: true, slug: true, workspaceId: true },
      });
      expect(req.tenant).toEqual(TENANT_FIXTURE);
      expect(next).toHaveBeenCalled();
    });

    it('does not set req.tenant when slug lookup returns null', async () => {
      const prisma = mockPrisma({
        tenantFindFirst: jest.fn().mockResolvedValue(null),
      });
      const mw = new TenantMiddleware(prisma);
      const req = mockReq({ 'x-tenant-slug': 'nonexistent' });

      await mw.use(req, mockRes(), next);

      expect(req.tenant).toBeUndefined();
      expect(next).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Resolution via hostname (Domain table)
  // =========================================================================

  describe('hostname domain lookup', () => {
    it('resolves tenant via domain hostname from host header', async () => {
      const prisma = mockPrisma({
        domainFindUnique: jest.fn().mockResolvedValue({ tenant: TENANT_FIXTURE }),
      });
      const mw = new TenantMiddleware(prisma);
      const req = mockReq({ host: 'acme.example.com' });
      const res = mockRes();

      await mw.use(req, res, next);

      expect(prisma.domain.findUnique).toHaveBeenCalledWith({
        where: { hostname: 'acme.example.com' },
        select: { tenant: { select: { id: true, slug: true, workspaceId: true } } },
      });
      expect(req.tenant).toEqual(TENANT_FIXTURE);
      expect(next).toHaveBeenCalled();
    });

    it('prefers x-forwarded-host over host header', async () => {
      const prisma = mockPrisma({
        domainFindUnique: jest.fn().mockResolvedValue({ tenant: TENANT_FIXTURE }),
      });
      const mw = new TenantMiddleware(prisma);
      const req = mockReq({
        'x-forwarded-host': 'forwarded.example.com',
        host: 'original.example.com',
      });

      await mw.use(req, mockRes(), next);

      expect(prisma.domain.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { hostname: 'forwarded.example.com' } }),
      );
    });

    it('strips port from hostname before lookup', async () => {
      const prisma = mockPrisma({
        domainFindUnique: jest.fn().mockResolvedValue({ tenant: TENANT_FIXTURE }),
      });
      const mw = new TenantMiddleware(prisma);
      const req = mockReq({ host: 'acme.example.com:3005' });

      await mw.use(req, mockRes(), next);

      expect(prisma.domain.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { hostname: 'acme.example.com' } }),
      );
    });

    it('lowercases hostname before lookup', async () => {
      const prisma = mockPrisma({
        domainFindUnique: jest.fn().mockResolvedValue({ tenant: TENANT_FIXTURE }),
      });
      const mw = new TenantMiddleware(prisma);
      const req = mockReq({ host: 'ACME.Example.COM' });

      await mw.use(req, mockRes(), next);

      expect(prisma.domain.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { hostname: 'acme.example.com' } }),
      );
    });

    it('does not set req.tenant when domain lookup returns null', async () => {
      const prisma = mockPrisma({
        domainFindUnique: jest.fn().mockResolvedValue(null),
      });
      const mw = new TenantMiddleware(prisma);
      const req = mockReq({ host: 'unknown.example.com' });

      await mw.use(req, mockRes(), next);

      expect(req.tenant).toBeUndefined();
      expect(next).toHaveBeenCalled();
    });

    it('does not set req.tenant when domain exists but tenant is null', async () => {
      const prisma = mockPrisma({
        domainFindUnique: jest.fn().mockResolvedValue({ tenant: null }),
      });
      const mw = new TenantMiddleware(prisma);
      const req = mockReq({ host: 'orphan.example.com' });

      await mw.use(req, mockRes(), next);

      expect(req.tenant).toBeUndefined();
      expect(next).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Priority order
  // =========================================================================

  describe('priority order', () => {
    it('X-Tenant-Id takes precedence over X-Tenant-Slug and hostname', async () => {
      const tenantFindFirst = jest.fn().mockResolvedValue(TENANT_FIXTURE);
      const domainFindUnique = jest.fn().mockResolvedValue({ tenant: TENANT_FIXTURE });
      const prisma = mockPrisma({ tenantFindFirst, domainFindUnique });
      const mw = new TenantMiddleware(prisma);
      const req = mockReq({
        'x-tenant-id': 'tenant-uuid-1',
        'x-tenant-slug': 'acme',
        host: 'acme.example.com',
      });

      await mw.use(req, mockRes(), next);

      expect(tenantFindFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ id: 'tenant-uuid-1' }) }),
      );
      // slug and domain should NOT have been queried
      expect(tenantFindFirst).toHaveBeenCalledTimes(1);
      expect(domainFindUnique).not.toHaveBeenCalled();
    });

    it('X-Tenant-Slug takes precedence over hostname when no X-Tenant-Id', async () => {
      const tenantFindFirst = jest.fn().mockResolvedValue(TENANT_FIXTURE);
      const domainFindUnique = jest.fn().mockResolvedValue({ tenant: TENANT_FIXTURE });
      const prisma = mockPrisma({ tenantFindFirst, domainFindUnique });
      const mw = new TenantMiddleware(prisma);
      const req = mockReq({
        'x-tenant-slug': 'acme',
        host: 'acme.example.com',
      });

      await mw.use(req, mockRes(), next);

      expect(tenantFindFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ slug: 'acme' }) }),
      );
      expect(domainFindUnique).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // No-match pass-through
  // =========================================================================

  describe('no-match pass-through', () => {
    it('calls next() without setting tenant when no headers or host provided', async () => {
      const prisma = mockPrisma();
      const mw = new TenantMiddleware(prisma);
      const req = mockReq({});

      await mw.use(req, mockRes(), next);

      expect(req.tenant).toBeUndefined();
      expect(next).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Error tolerance
  // =========================================================================

  describe('error tolerance', () => {
    it('calls next() even when tenant.findFirst throws', async () => {
      const prisma = mockPrisma({
        tenantFindFirst: jest.fn().mockRejectedValue(new Error('DB down')),
      });
      const mw = new TenantMiddleware(prisma);
      const req = mockReq({ 'x-tenant-id': 'tenant-uuid-1' });

      await mw.use(req, mockRes(), next);

      expect(req.tenant).toBeUndefined();
      expect(next).toHaveBeenCalled();
    });

    it('calls next() even when domain.findUnique throws', async () => {
      const prisma = mockPrisma({
        domainFindUnique: jest.fn().mockRejectedValue(new Error('DB down')),
      });
      const mw = new TenantMiddleware(prisma);
      const req = mockReq({ host: 'acme.example.com' });

      await mw.use(req, mockRes(), next);

      expect(req.tenant).toBeUndefined();
      expect(next).toHaveBeenCalled();
    });

    it('does not throw when an unexpected error type is caught', async () => {
      const prisma = mockPrisma({
        tenantFindFirst: jest.fn().mockRejectedValue('string-error'),
      });
      const mw = new TenantMiddleware(prisma);
      const req = mockReq({ 'x-tenant-id': 'tenant-uuid-1' });

      await mw.use(req, mockRes(), next);

      expect(next).toHaveBeenCalled();
    });
  });
});
