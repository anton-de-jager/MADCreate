import { BadRequestException } from '@nestjs/common';
import { AIGenerationStatus, AIGenerationKind } from '@prisma/client';
import { AiService } from './ai.service';
import {
  createMockPrisma,
  createMockTenantsService,
  createMockQueue,
  type PrismaService,
  type TenantsService,
  type Queue,
} from '../../test/mock-helpers';
import type { ClaudeCodeManualProvider } from './providers/claude-code-manual.provider';
import type { SiteApplicatorService } from './site-applicator.service';
import type { AIGenerateRequest } from '@madcreate/shared';

// Inline mocks for providers not covered by mock-helpers
function createMockProvider() {
  return { complete: jest.fn(), isManual: true };
}

function createMockApplicator() {
  return { parse: jest.fn(), apply: jest.fn() };
}

function makeService() {
  const prisma = createMockPrisma();
  const tenants = createMockTenantsService();
  const provider = createMockProvider();
  const applicator = createMockApplicator();
  const queue = createMockQueue();
  tenants.get.mockResolvedValue({ id: 'tenant-1' });

  const svc = new AiService(
    prisma as unknown as PrismaService,
    tenants as unknown as TenantsService,
    provider as unknown as ClaudeCodeManualProvider,
    applicator as unknown as SiteApplicatorService,
    queue as unknown as Queue,
  );
  return { svc, prisma, tenants, provider, applicator, queue };
}

describe('AiService', () => {
  // -----------------------------------------------------------------------
  // listGenerations
  // -----------------------------------------------------------------------
  describe('listGenerations', () => {
    it('calls tenants.get for access check and returns prisma results', async () => {
      const { svc, prisma, tenants } = makeService();
      const rows = [{ id: 'gen-1' }, { id: 'gen-2' }];
      prisma.aIGeneration.findMany.mockResolvedValue(rows);

      const result = await svc.listGenerations('user-1', 'tenant-1', 10);

      expect(tenants.get).toHaveBeenCalledWith('user-1', 'tenant-1');
      expect(prisma.aIGeneration.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { tenantId: 'tenant-1' }, take: 10 }),
      );
      expect(result).toBe(rows);
    });
  });

  // -----------------------------------------------------------------------
  // getGeneration
  // -----------------------------------------------------------------------
  describe('getGeneration', () => {
    it('returns the generation and checks tenant access', async () => {
      const { svc, prisma, tenants } = makeService();
      const gen = { id: 'gen-1', tenantId: 'tenant-1' };
      prisma.aIGeneration.findUnique.mockResolvedValue(gen);

      const result = await svc.getGeneration('user-1', 'gen-1');

      expect(result).toBe(gen);
      expect(tenants.get).toHaveBeenCalledWith('user-1', 'tenant-1');
    });

    it('throws BadRequestException when generation not found', async () => {
      const { svc, prisma } = makeService();
      prisma.aIGeneration.findUnique.mockResolvedValue(null);

      await expect(svc.getGeneration('user-1', 'missing')).rejects.toThrow(BadRequestException);
    });

    it('skips tenant check when userId is undefined', async () => {
      const { svc, prisma, tenants } = makeService();
      prisma.aIGeneration.findUnique.mockResolvedValue({ id: 'gen-1', tenantId: 'tenant-1' });

      await svc.getGeneration(undefined, 'gen-1');

      expect(tenants.get).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // submitManualOutput
  // -----------------------------------------------------------------------
  describe('submitManualOutput', () => {
    it('parses raw, applies spec, and updates generation to SUCCESS', async () => {
      const { svc, prisma, applicator } = makeService();
      const gen = { id: 'gen-1', tenantId: 'tenant-1', status: AIGenerationStatus.AWAITING_INPUT };
      prisma.aIGeneration.findUnique.mockResolvedValue(gen);
      const spec = { site: {} };
      applicator.parse.mockReturnValue(spec);
      applicator.apply.mockResolvedValue({ siteId: 'site-1' });
      prisma.aIGeneration.update.mockResolvedValue({});

      const result = await svc.submitManualOutput(undefined, 'gen-1', '{"site":{}}');

      expect(applicator.parse).toHaveBeenCalledWith('{"site":{}}');
      expect(applicator.apply).toHaveBeenCalledWith('tenant-1', spec);
      expect(prisma.aIGeneration.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'gen-1' },
          data: expect.objectContaining({ status: AIGenerationStatus.SUCCESS }),
        }),
      );
      expect(result).toEqual(expect.objectContaining({ generationId: 'gen-1', tenantId: 'tenant-1', siteId: 'site-1' }));
    });

    it('throws when generation is not AWAITING_INPUT', async () => {
      const { svc, prisma } = makeService();
      prisma.aIGeneration.findUnique.mockResolvedValue({
        id: 'gen-1',
        tenantId: 'tenant-1',
        status: AIGenerationStatus.QUEUED,
      });

      await expect(svc.submitManualOutput(undefined, 'gen-1', '{}')).rejects.toThrow(BadRequestException);
    });

    it('throws when generation not found', async () => {
      const { svc, prisma } = makeService();
      prisma.aIGeneration.findUnique.mockResolvedValue(null);

      await expect(svc.submitManualOutput(undefined, 'nope', '{}')).rejects.toThrow(BadRequestException);
    });
  });

  // -----------------------------------------------------------------------
  // enqueue
  // -----------------------------------------------------------------------
  describe('enqueue', () => {
    it('creates generation row and adds queue job', async () => {
      const { svc, prisma, queue } = makeService();
      const created = { id: 'gen-new' };
      prisma.aIGeneration.create.mockResolvedValue(created);

      const req = { kind: AIGenerationKind.SITE, variables: { prompt: 'hello' } } as AIGenerateRequest;
      const result = await svc.enqueue('user-1', 'tenant-1', req);

      expect(prisma.aIGeneration.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: 'tenant-1',
            requesterId: 'user-1',
            kind: AIGenerationKind.SITE,
            status: AIGenerationStatus.QUEUED,
          }),
        }),
      );
      expect(queue.add).toHaveBeenCalledWith('run', expect.objectContaining({ generationId: 'gen-new' }), expect.objectContaining({ jobId: 'gen-new' }));
      expect(result).toBe(created);
    });

    it('resolves prompt when promptKey is given', async () => {
      const { svc, prisma } = makeService();
      prisma.aIGeneration.create.mockResolvedValue({ id: 'gen-pk' });
      prisma.aIPrompt.findUnique.mockResolvedValue({ id: 'prompt-1', model: 'gpt-4' });

      const req = { kind: AIGenerationKind.SITE, promptKey: 'full-site' } as AIGenerateRequest;
      await svc.enqueue('user-1', 'tenant-1', req);

      expect(prisma.aIPrompt.findUnique).toHaveBeenCalledWith({ where: { key: 'full-site' } });
      expect(prisma.aIGeneration.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ promptId: 'prompt-1' }),
        }),
      );
    });
  });

  // -----------------------------------------------------------------------
  // run
  // -----------------------------------------------------------------------
  describe('run', () => {
    it('manual provider path: updates to AWAITING_INPUT with rawOutput', async () => {
      const { svc, prisma, provider } = makeService();
      const gen = { id: 'gen-run', promptId: null, provider: 'CLAUDE_CODE_MANUAL', model: 'manual', input: {} };
      prisma.aIGeneration.findUnique.mockResolvedValue(gen);
      prisma.aIGeneration.update.mockResolvedValue({});
      provider.complete.mockResolvedValue({ raw: 'prompt-output' });

      const req = { kind: AIGenerationKind.SITE, variables: { prompt: 'build me a site' } } as AIGenerateRequest;
      await svc.run('gen-run', req);

      // First update: RUNNING
      expect(prisma.aIGeneration.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: AIGenerationStatus.RUNNING }),
        }),
      );
      // Second update: AWAITING_INPUT
      expect(prisma.aIGeneration.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: AIGenerationStatus.AWAITING_INPUT,
            rawOutput: 'prompt-output',
          }),
        }),
      );
    });

    it('marks FAILED on error and does not rethrow', async () => {
      const { svc, prisma, provider } = makeService();
      const gen = { id: 'gen-err', promptId: null, provider: 'CLAUDE_CODE_MANUAL', model: 'manual', input: {} };
      prisma.aIGeneration.findUnique.mockResolvedValue(gen);
      prisma.aIGeneration.update.mockResolvedValue({});
      provider.complete.mockRejectedValue(new Error('boom'));

      const req = { kind: AIGenerationKind.SITE } as AIGenerateRequest;
      // Should not throw
      await svc.run('gen-err', req);

      expect(prisma.aIGeneration.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: AIGenerationStatus.FAILED,
            error: 'boom',
          }),
        }),
      );
    });
  });
});
