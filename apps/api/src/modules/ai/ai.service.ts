import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { EventEmitter } from 'node:events';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantsService } from '../tenants/tenants.service';
import { ClaudeCodeManualProvider } from './providers/claude-code-manual.provider';
import { SiteApplicatorService } from './site-applicator.service';
import type { AIProvider } from './providers/provider.interface';
import { QUEUE_AI } from '../../queue/queue.module';
import { AIProvider as AIProviderEnum, AIGenerationKind, AIGenerationStatus, Prisma } from '@prisma/client';
import type { AIGenerateRequest } from '@madcreate/shared';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly events = new EventEmitter();

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenants: TenantsService,
    private readonly claudeCodeManual: ClaudeCodeManualProvider,
    private readonly applicator: SiteApplicatorService,
    @InjectQueue(QUEUE_AI) private readonly queue: Queue,
  ) {
    this.events.setMaxListeners(50);
  }

  /** Subscribe to generation-change events for SSE. */
  onChange(listener: () => void): () => void {
    this.events.on('change', listener);
    return () => this.events.off('change', listener);
  }

  private emitChange() { this.events.emit('change'); }

  /**
   * Only one provider is supported: claude-code-manual. It builds a self-
   * contained prompt that the tenant runs in their own Claude Code session
   * and pastes back via POST /v1/ai/generations/:id/submit. No API keys
   * required — there is intentionally no in-process LLM call anywhere.
   */
  private getProvider(_name?: string): AIProvider {
    return this.claudeCodeManual;
  }

  async listGenerations(userId: string, tenantId: string, limit = 50) {
    await this.tenants.get(userId, tenantId);
    return this.prisma.aIGeneration.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' }, take: limit });
  }

  async getGeneration(userId: string | undefined, id: string) {
    const g = await this.prisma.aIGeneration.findUnique({ where: { id } });
    if (!g) throw new BadRequestException('Generation not found');
    if (userId) await this.tenants.get(userId, g.tenantId);
    return g;
  }

  /**
   * Accept the output the tenant pasted back from their Claude Code session.
   * Validates, transitions the generation to SUCCESS, and applies the site to
   * the tenant via SiteApplicatorService.
   */
  async submitManualOutput(userId: string | undefined, generationId: string, raw: string | object) {
    const gen = await this.prisma.aIGeneration.findUnique({ where: { id: generationId } });
    if (!gen) throw new BadRequestException('Generation not found');
    if (userId) await this.tenants.get(userId, gen.tenantId);
    if (gen.status !== AIGenerationStatus.AWAITING_INPUT) {
      throw new BadRequestException(`Generation is in state ${gen.status} — only AWAITING_INPUT can accept manual input.`);
    }

    const spec = this.applicator.parse(raw);
    const result = await this.applicator.apply(gen.tenantId, spec);

    await this.prisma.aIGeneration.update({
      where: { id: gen.id },
      data: {
        status: AIGenerationStatus.SUCCESS,
        output: spec as unknown as Prisma.InputJsonValue,
        rawOutput: typeof raw === 'string' ? raw : JSON.stringify(raw),
        finishedAt: new Date(),
      },
    });

    this.emitChange();
    return { generationId: gen.id, tenantId: gen.tenantId, ...result };
  }

  /** Enqueue an AI generation job; result polled via getGeneration. */
  async enqueue(userId: string, tenantId: string, req: AIGenerateRequest) {
    await this.tenants.get(userId, tenantId);
    const prompt = req.promptKey ? await this.prisma.aIPrompt.findUnique({ where: { key: req.promptKey } }) : null;

    // Only one provider path is supported now: CLAUDE_CODE_MANUAL. Anything
    // the caller asks for is normalized down to it — the row exists purely
    // for audit; the actual prompt is built by ClaudeCodeManualProvider.
    const providerEnum: AIProviderEnum = AIProviderEnum.CLAUDE_CODE_MANUAL;

    const gen = await this.prisma.aIGeneration.create({
      data: {
        tenantId,
        requesterId: userId,
        promptId: prompt?.id,
        kind: req.kind as AIGenerationKind,
        provider: providerEnum,
        model: req.model ?? prompt?.model ?? 'manual',
        status: AIGenerationStatus.QUEUED,
        input: (req.variables ?? {}) as Prisma.InputJsonValue,
      },
    });
    await this.queue.add('run', { generationId: gen.id, request: req }, { jobId: gen.id });
    this.emitChange();
    return gen;
  }

  /** Synchronous variant — runs the model immediately (lower-latency UX for small generations). */
  async run(generationId: string, req: AIGenerateRequest) {
    const gen = await this.prisma.aIGeneration.findUnique({ where: { id: generationId } });
    if (!gen) return;

    await this.prisma.aIGeneration.update({
      where: { id: gen.id },
      data: { status: AIGenerationStatus.RUNNING, startedAt: new Date() },
    });
    this.emitChange();

    try {
      const prompt = gen.promptId ? await this.prisma.aIPrompt.findUnique({ where: { id: gen.promptId } }) : null;
      const provider = this.getProvider(gen.provider.toLowerCase());

      const system = req.systemPrompt ?? prompt?.systemPrompt ?? 'You are MADCreate, an AI website generator. Output JSON when asked. Be concise.';
      const userTemplate = req.userPrompt ?? prompt?.userTemplate ?? '{{prompt}}';
      const variables = (req.variables ?? gen.input) as Record<string, unknown>;
      const userPrompt = renderTemplate(userTemplate, variables);

      const started = Date.now();
      const result = await provider.complete({
        model: gen.model,
        systemPrompt: system,
        userPrompt,
        temperature: prompt?.temperature ?? req.temperature,
        maxTokens: prompt?.maxTokens ?? req.maxTokens,
        jsonMode: req.jsonMode ?? /json/i.test(system),
      });
      const durationMs = Date.now() - started;

      // Manual providers (claude-code-manual) park the generation at
      // AWAITING_INPUT with the prompt stashed in rawOutput. The tenant runs
      // the prompt in their own Claude Code session and submits the JSON via
      // POST /v1/ai/generations/:id/submit, which transitions it to SUCCESS.
      if (provider.isManual) {
        await this.prisma.aIGeneration.update({
          where: { id: gen.id },
          data: {
            status: AIGenerationStatus.AWAITING_INPUT,
            rawOutput: result.raw,
            durationMs,
          },
        });
        this.emitChange();
        return;
      }

      let parsed: unknown = null;
      try { parsed = JSON.parse(result.raw); } catch { /* keep raw */ }

      await this.prisma.aIGeneration.update({
        where: { id: gen.id },
        data: {
          status: AIGenerationStatus.SUCCESS,
          rawOutput: result.raw,
          output: parsed as Prisma.InputJsonValue,
          tokensIn: result.tokensIn,
          tokensOut: result.tokensOut,
          durationMs,
          finishedAt: new Date(),
        },
      });
      this.emitChange();
    } catch (err) {
      this.logger.error(`Generation ${gen.id} failed`, err);
      await this.prisma.aIGeneration.update({
        where: { id: gen.id },
        data: {
          status: AIGenerationStatus.FAILED,
          error: (err as Error).message,
          finishedAt: new Date(),
        },
      });
      this.emitChange();
      // Don't rethrow — the generation is already marked FAILED and logged.
      // Rethrowing would cause BullMQ to retry, producing duplicate FAILED rows.
    }
  }
}

function renderTemplate(tpl: string, vars: Record<string, unknown>): string {
  return tpl.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key) => {
    const val = key.split('.').reduce(
      (acc: unknown, k: string) => {
        if (acc != null && typeof acc === 'object' && k in (acc as Record<string, unknown>)) {
          return (acc as Record<string, unknown>)[k];
        }
        return undefined;
      },
      vars as unknown,
    );
    if (val == null) return '';
    return typeof val === 'string' ? val : JSON.stringify(val);
  });
}
