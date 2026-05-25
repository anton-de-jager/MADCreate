import { BadRequestException, NotFoundException } from '@nestjs/common';
import { FormsService } from './forms.service';
import { createMockPrisma, createMockTenantsService, type PrismaService, type TenantsService } from '../../test/mock-helpers';
import type { Request } from 'express';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMockRequest(overrides: Partial<{ ip: string; headers: Record<string, string> }> = {}): Request {
  return {
    ip: overrides.ip ?? '127.0.0.1',
    headers: overrides.headers ?? { 'user-agent': 'TestAgent/1.0' },
  } as Request;
}

const TENANT = { id: 'tenant-1', deletedAt: null };
const SUBMISSION = { id: 'sub-1' };
const LEAD = { id: 'lead-1' };

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('FormsService', () => {
  let service: FormsService;
  let prisma: ReturnType<typeof createMockPrisma>;
  let tenants: ReturnType<typeof createMockTenantsService>;

  beforeEach(() => {
    prisma = createMockPrisma();
    tenants = createMockTenantsService();
    service = new FormsService(
      prisma as unknown as PrismaService,
      tenants as unknown as TenantsService,
    );
  });

  describe('submit()', () => {
    it('throws BadRequestException when tenantId is empty', async () => {
      try {
        await service.submit('', { formKey: 'contact', data: {} }, makeMockRequest());
        fail('Expected submit to throw');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(BadRequestException);
      }
    });

    it('throws NotFoundException when tenant does not exist', async () => {
      prisma.tenant.findFirst.mockResolvedValue(null);
      try {
        await service.submit('no-such-tenant', { formKey: 'contact', data: {} }, makeMockRequest());
        fail('Expected submit to throw');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(NotFoundException);
      }
    });

    it('creates a FormSubmission on happy path', async () => {
      prisma.tenant.findFirst.mockResolvedValue(TENANT);
      prisma.formSubmission.create.mockResolvedValue(SUBMISSION);

      const result = await service.submit(
        'tenant-1',
        { formKey: 'contact', pageSlug: 'home', data: { message: 'hello' } },
        makeMockRequest(),
      );

      const arg = prisma.formSubmission.create.mock.calls[0][0];
      expect(arg.data.tenantId).toBe('tenant-1');
      expect(arg.data.formKey).toBe('contact');
      expect(arg.data.pageSlug).toBe('home');
      expect(arg.data.ip).toBe('127.0.0.1');
      expect(result.submissionId).toBe('sub-1');
    });

    it('extracts lead from top-level dto fields', async () => {
      prisma.tenant.findFirst.mockResolvedValue(TENANT);
      prisma.formSubmission.create.mockResolvedValue(SUBMISSION);
      prisma.lead.create.mockResolvedValue(LEAD);

      const result = await service.submit(
        'tenant-1',
        {
          formKey: 'contact',
          data: {},
          email: 'test@example.com',
          phone: '555-1234',
          name: 'Jane Doe',
        },
        makeMockRequest(),
      );

      const arg = prisma.lead.create.mock.calls[0][0];
      expect(arg.data.tenantId).toBe('tenant-1');
      expect(arg.data.email).toBe('test@example.com');
      expect(arg.data.phone).toBe('555-1234');
      expect(arg.data.name).toBe('Jane Doe');
      expect(arg.data.source).toBe('form:contact');
      expect(arg.data.status).toBe('new');
      expect(result.leadId).toBe('lead-1');
    });

    it('extracts lead from freeform data fields when dto fields are absent', async () => {
      prisma.tenant.findFirst.mockResolvedValue(TENANT);
      prisma.formSubmission.create.mockResolvedValue(SUBMISSION);
      prisma.lead.create.mockResolvedValue(LEAD);

      const result = await service.submit(
        'tenant-1',
        {
          formKey: 'contact',
          data: { email: 'data@example.com', tel: '555-9999', fullName: 'John Smith' },
        },
        makeMockRequest(),
      );

      const arg = prisma.lead.create.mock.calls[0][0];
      expect(arg.data.email).toBe('data@example.com');
      expect(arg.data.phone).toBe('555-9999');
      expect(arg.data.name).toBe('John Smith');
      expect(result.leadId).toBe('lead-1');
    });

    it('extracts email from data.Email (capitalized key)', async () => {
      prisma.tenant.findFirst.mockResolvedValue(TENANT);
      prisma.formSubmission.create.mockResolvedValue(SUBMISSION);
      prisma.lead.create.mockResolvedValue(LEAD);

      await service.submit(
        'tenant-1',
        { formKey: 'contact', data: { Email: 'cap@example.com' } },
        makeMockRequest(),
      );

      const arg = prisma.lead.create.mock.calls[0][0];
      expect(arg.data.email).toBe('cap@example.com');
    });

    it('does NOT create a lead when no email or phone is present', async () => {
      prisma.tenant.findFirst.mockResolvedValue(TENANT);
      prisma.formSubmission.create.mockResolvedValue(SUBMISSION);

      const result = await service.submit(
        'tenant-1',
        { formKey: 'contact', data: { message: 'just a message' } },
        makeMockRequest(),
      );

      expect(prisma.lead.create).not.toHaveBeenCalled();
      expect(result.leadId).toBeNull();
    });

    it('sets pageSlug to null when not provided', async () => {
      prisma.tenant.findFirst.mockResolvedValue(TENANT);
      prisma.formSubmission.create.mockResolvedValue(SUBMISSION);

      await service.submit(
        'tenant-1',
        { formKey: 'contact', data: {} },
        makeMockRequest(),
      );

      const arg = prisma.formSubmission.create.mock.calls[0][0];
      expect(arg.data.pageSlug).toBeNull();
    });

    it('truncates user-agent to 1000 chars', async () => {
      prisma.tenant.findFirst.mockResolvedValue(TENANT);
      prisma.formSubmission.create.mockResolvedValue(SUBMISSION);

      const longUA = 'A'.repeat(2000);
      await service.submit(
        'tenant-1',
        { formKey: 'contact', data: {} },
        makeMockRequest({ headers: { 'user-agent': longUA } }),
      );

      const arg = prisma.formSubmission.create.mock.calls[0][0];
      expect(arg.data.userAgent.length).toBe(1000);
    });
  });

  describe('listSubmissions()', () => {
    it('verifies tenant access then returns submissions', async () => {
      tenants.get.mockResolvedValue(TENANT);
      prisma.formSubmission.findMany.mockResolvedValue([SUBMISSION]);

      const result = await service.listSubmissions('user-1', 'tenant-1', 50);

      expect(tenants.get).toHaveBeenCalledWith('user-1', 'tenant-1');
      expect(prisma.formSubmission.findMany).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-1' },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      expect((result as unknown[]).length).toBe(1);
    });

    it('defaults limit to 100', async () => {
      tenants.get.mockResolvedValue(TENANT);
      prisma.formSubmission.findMany.mockResolvedValue([]);

      await service.listSubmissions('user-1', 'tenant-1');

      const arg = prisma.formSubmission.findMany.mock.calls[0][0];
      expect(arg.take).toBe(100);
    });
  });
});
