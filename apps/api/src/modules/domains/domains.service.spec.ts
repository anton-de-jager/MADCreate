import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DomainStatus, DomainType } from '@prisma/client';
import { DomainsService } from './domains.service';
import {
  createMockPrisma,
  createMockConfig,
  createMockTenantsService,
  type PrismaService,
  type ConfigService,
  type TenantsService,
} from '../../test/mock-helpers';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface MockCloudflareService {
  isConfigured: jest.Mock;
  wireCustomDomain: jest.Mock;
  ensureUniversalSsl: jest.Mock;
  deleteRecord: jest.Mock;
}

function createMockCloudflareService(): MockCloudflareService {
  return {
    isConfigured: jest.fn().mockReturnValue(false),
    wireCustomDomain: jest.fn().mockResolvedValue({ cnameId: null, txtId: null }),
    ensureUniversalSsl: jest.fn().mockResolvedValue(true),
    deleteRecord: jest.fn().mockResolvedValue(true),
  };
}

function makeService() {
  const prisma = createMockPrisma();
  const tenants = createMockTenantsService();
  const config = createMockConfig();
  const cloudflare = createMockCloudflareService();

  // Shortcut for the domain delegate (not declared on MockPrisma interface
  // but auto-created by the Proxy at runtime).
  const domain = prisma.domain;

  tenants.get.mockResolvedValue({ id: 'tenant-1', slug: 'acme', name: 'Acme' });
  config.get.mockImplementation((key: string) => {
    if (key === 'web.publicDomain') return 'madcreate.example.com';
    return undefined;
  });

  const svc = new DomainsService(
    prisma as unknown as PrismaService,
    tenants as unknown as TenantsService,
    config as unknown as ConfigService,
    cloudflare as unknown as import('../cloudflare/cloudflare.service').CloudflareService,
  );

  return { svc, prisma, tenants, config, cloudflare, domain };
}

const fakeDomain = {
  id: 'dom-1',
  tenantId: 'tenant-1',
  hostname: 'custom.example.com',
  type: DomainType.CNAME,
  status: DomainStatus.PENDING,
  isPrimary: false,
  verifyToken: 'madcreate-verify-abc123',
  cloudflareId: null,
  sslStatus: null,
  sslIssuedAt: null,
  sslExpiresAt: null,
  lastCheckedAt: null,
  lastError: null,
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('DomainsService', () => {
  // ----- list --------------------------------------------------------------
  describe('list', () => {
    it('returns domains for a tenant after asserting ownership', async () => {
      const { svc, tenants, domain } = makeService();
      domain.findMany.mockResolvedValue([fakeDomain]);

      const result = await svc.list('user-1', 'tenant-1');

      expect(tenants.get).toHaveBeenCalledWith('user-1', 'tenant-1');
      expect(domain.findMany).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-1', deletedAt: null },
        orderBy: { createdAt: 'desc' },
      });
      expect(result.length).toBe(1);
    });

    it('propagates error when tenant ownership check fails', async () => {
      const { svc, tenants } = makeService();
      tenants.get.mockRejectedValue(new NotFoundException('Tenant not found'));

      try {
        await svc.list('user-1', 'bad-tenant');
        fail('Expected list to throw');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(NotFoundException);
      }
    });
  });

  // ----- add ---------------------------------------------------------------
  describe('add', () => {
    it('creates a domain with a verify token', async () => {
      const { svc, tenants, domain } = makeService();
      domain.findUnique.mockResolvedValue(null);
      domain.create.mockResolvedValue(fakeDomain);

      const result = await svc.add('user-1', 'tenant-1', {
        hostname: 'Custom.Example.Com',
        type: DomainType.CNAME,
      });

      expect(tenants.get).toHaveBeenCalledWith('user-1', 'tenant-1');
      // Hostname should be lowercased/trimmed
      expect(domain.findUnique).toHaveBeenCalledWith({
        where: { hostname: 'custom.example.com' },
      });
      const createArg = domain.create.mock.calls[0][0];
      expect(createArg.data.tenantId).toBe('tenant-1');
      expect(createArg.data.hostname).toBe('custom.example.com');
      expect(createArg.data.type).toBe(DomainType.CNAME);
      expect(createArg.data.status).toBe(DomainStatus.PENDING);
      expect(createArg.data.verifyToken).toMatch(/^madcreate-verify-/);
      expect(result).toBe(fakeDomain);
    });

    it('throws BadRequestException for invalid hostname', async () => {
      const { svc } = makeService();

      try {
        await svc.add('user-1', 'tenant-1', { hostname: 'not valid!', type: DomainType.CNAME });
        fail('Expected add to throw');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(BadRequestException);
      }
    });

    it('throws BadRequestException when hostname already registered', async () => {
      const { svc, domain } = makeService();
      domain.findUnique.mockResolvedValue(fakeDomain);

      try {
        await svc.add('user-1', 'tenant-1', { hostname: 'custom.example.com', type: DomainType.CNAME });
        fail('Expected add to throw');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(BadRequestException);
      }
    });

    it('wires Cloudflare when configured and type is CNAME', async () => {
      const { svc, domain, cloudflare } = makeService();
      cloudflare.isConfigured.mockReturnValue(true);
      cloudflare.wireCustomDomain.mockResolvedValue({ cnameId: 'cf-rec-1', txtId: 'cf-txt-1' });
      domain.findUnique.mockResolvedValue(null);
      domain.create.mockResolvedValue({ ...fakeDomain, id: 'dom-new' });
      domain.update.mockResolvedValue({ ...fakeDomain, cloudflareId: 'cf-rec-1' });

      await svc.add('user-1', 'tenant-1', { hostname: 'sub.example.com', type: DomainType.CNAME });

      expect(cloudflare.wireCustomDomain).toHaveBeenCalledTimes(1);
      const wireArgs = cloudflare.wireCustomDomain.mock.calls[0];
      expect(wireArgs[0]).toBe('sub.example.com');
      expect(wireArgs[1]).toBe('madcreate.example.com');
      expect(wireArgs[2]).toMatch(/^madcreate-verify-/);
      expect(domain.update).toHaveBeenCalledWith({
        where: { id: 'dom-new' },
        data: { cloudflareId: 'cf-rec-1', sslStatus: 'pending' },
      });
      expect(cloudflare.ensureUniversalSsl).toHaveBeenCalled();
    });

    it('skips Cloudflare when not configured', async () => {
      const { svc, domain, cloudflare } = makeService();
      cloudflare.isConfigured.mockReturnValue(false);
      domain.findUnique.mockResolvedValue(null);
      domain.create.mockResolvedValue(fakeDomain);

      await svc.add('user-1', 'tenant-1', { hostname: 'sub.example.com', type: DomainType.CNAME });

      expect(cloudflare.wireCustomDomain).not.toHaveBeenCalled();
    });

    it('skips Cloudflare for APEX type even when configured', async () => {
      const { svc, domain, cloudflare } = makeService();
      cloudflare.isConfigured.mockReturnValue(true);
      domain.findUnique.mockResolvedValue(null);
      domain.create.mockResolvedValue({ ...fakeDomain, type: DomainType.APEX });

      await svc.add('user-1', 'tenant-1', { hostname: 'example.com', type: DomainType.APEX });

      expect(cloudflare.wireCustomDomain).not.toHaveBeenCalled();
    });
  });

  // ----- instructions ------------------------------------------------------
  describe('instructions', () => {
    it('returns CNAME and TXT records for a CNAME domain', async () => {
      const { svc, domain } = makeService();
      domain.findFirst.mockResolvedValue({ ...fakeDomain, type: DomainType.CNAME });

      const result = await svc.instructions('user-1', 'dom-1');

      expect(result.hostname).toBe('custom.example.com');
      expect(result.type).toBe(DomainType.CNAME);
      const recordTypes = result.records.map((r) => r.recordType);
      expect(recordTypes).toContain('CNAME');
      expect(recordTypes).toContain('TXT');
    });

    it('returns A and TXT records for an APEX domain', async () => {
      const { svc, domain } = makeService();
      domain.findFirst.mockResolvedValue({ ...fakeDomain, type: DomainType.APEX });

      const result = await svc.instructions('user-1', 'dom-1');

      const recordTypes = result.records.map((r) => r.recordType);
      expect(recordTypes).toContain('A');
      expect(recordTypes).toContain('TXT');
      expect(recordTypes).not.toContain('CNAME');
    });

    it('throws NotFoundException when domain does not exist', async () => {
      const { svc, domain } = makeService();
      domain.findFirst.mockResolvedValue(null);

      try {
        await svc.instructions('user-1', 'missing');
        fail('Expected instructions to throw');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(NotFoundException);
      }
    });
  });

  // ----- verify ------------------------------------------------------------
  describe('verify', () => {
    it('sets status to ACTIVE when TXT record matches', async () => {
      const { svc, domain } = makeService();
      domain.findFirst.mockResolvedValue(fakeDomain);
      domain.update.mockResolvedValue({ ...fakeDomain, status: DomainStatus.ACTIVE });

      const dnsModule = await import('node:dns');
      const resolveTxtSpy = jest
        .spyOn(dnsModule.promises, 'resolveTxt')
        .mockResolvedValue([[fakeDomain.verifyToken]]);

      const result = await svc.verify('user-1', 'dom-1');

      const updateArg = domain.update.mock.calls[0][0];
      expect(updateArg.where).toEqual({ id: 'dom-1' });
      expect(updateArg.data.status).toBe(DomainStatus.ACTIVE);
      expect(updateArg.data.lastError).toBeNull();
      expect(updateArg.data.sslStatus).toBe('pending');
      expect(result.status).toBe(DomainStatus.ACTIVE);
      resolveTxtSpy.mockRestore();
    });

    it('sets status to FAILED when TXT record does not match', async () => {
      const { svc, domain } = makeService();
      domain.findFirst.mockResolvedValue(fakeDomain);
      domain.update.mockResolvedValue({ ...fakeDomain, status: DomainStatus.FAILED });

      const dnsModule = await import('node:dns');
      const resolveTxtSpy = jest
        .spyOn(dnsModule.promises, 'resolveTxt')
        .mockResolvedValue([['wrong-token']]);

      await svc.verify('user-1', 'dom-1');

      const updateArg = domain.update.mock.calls[0][0];
      expect(updateArg.data.status).toBe(DomainStatus.FAILED);
      resolveTxtSpy.mockRestore();
    });

    it('sets status to FAILED when DNS lookup throws', async () => {
      const { svc, domain } = makeService();
      domain.findFirst.mockResolvedValue(fakeDomain);
      domain.update.mockResolvedValue({ ...fakeDomain, status: DomainStatus.FAILED });

      const dnsModule = await import('node:dns');
      const resolveTxtSpy = jest
        .spyOn(dnsModule.promises, 'resolveTxt')
        .mockRejectedValue(new Error('ENOTFOUND'));

      await svc.verify('user-1', 'dom-1');

      const updateArg = domain.update.mock.calls[0][0];
      expect(updateArg.data.status).toBe(DomainStatus.FAILED);
      resolveTxtSpy.mockRestore();
    });

    it('throws NotFoundException for non-existent domain', async () => {
      const { svc, domain } = makeService();
      domain.findFirst.mockResolvedValue(null);

      try {
        await svc.verify('user-1', 'missing');
        fail('Expected verify to throw');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(NotFoundException);
      }
    });
  });

  // ----- remove ------------------------------------------------------------
  describe('remove', () => {
    it('soft-deletes a domain', async () => {
      const { svc, domain } = makeService();
      domain.findFirst.mockResolvedValue(fakeDomain);
      domain.update.mockResolvedValue({ ...fakeDomain, deletedAt: new Date() });

      await svc.remove('user-1', 'dom-1');

      const updateArg = domain.update.mock.calls[0][0];
      expect(updateArg.where).toEqual({ id: 'dom-1' });
      expect(updateArg.data.deletedAt).toBeInstanceOf(Date);
    });

    it('deletes Cloudflare record when cloudflareId is present', async () => {
      const { svc, domain, cloudflare } = makeService();
      domain.findFirst.mockResolvedValue({ ...fakeDomain, cloudflareId: 'cf-rec-1' });
      domain.update.mockResolvedValue({ ...fakeDomain, deletedAt: new Date() });

      await svc.remove('user-1', 'dom-1');

      expect(cloudflare.deleteRecord).toHaveBeenCalledWith('cf-rec-1');
    });

    it('does not call Cloudflare deleteRecord when no cloudflareId', async () => {
      const { svc, domain, cloudflare } = makeService();
      domain.findFirst.mockResolvedValue(fakeDomain);
      domain.update.mockResolvedValue({ ...fakeDomain, deletedAt: new Date() });

      await svc.remove('user-1', 'dom-1');

      expect(cloudflare.deleteRecord).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when domain does not exist', async () => {
      const { svc, domain } = makeService();
      domain.findFirst.mockResolvedValue(null);

      try {
        await svc.remove('user-1', 'missing');
        fail('Expected remove to throw');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(NotFoundException);
      }
    });
  });

  // ----- resolveByHostname -------------------------------------------------
  describe('resolveByHostname', () => {
    it('returns active domain with tenant info', async () => {
      const { svc, domain } = makeService();
      const domainWithTenant = {
        ...fakeDomain,
        status: DomainStatus.ACTIVE,
        tenant: { id: 'tenant-1', slug: 'acme', name: 'Acme' },
      };
      domain.findFirst.mockResolvedValue(domainWithTenant);

      const result = await svc.resolveByHostname('Custom.Example.Com');

      expect(domain.findFirst).toHaveBeenCalledWith({
        where: { hostname: 'custom.example.com', deletedAt: null, status: DomainStatus.ACTIVE },
        include: { tenant: { select: { id: true, slug: true, name: true } } },
      });
      expect(result).toBe(domainWithTenant);
    });

    it('returns null when no active domain matches', async () => {
      const { svc, domain } = makeService();
      domain.findFirst.mockResolvedValue(null);

      const result = await svc.resolveByHostname('unknown.example.com');

      expect(result).toBeNull();
    });
  });
});
