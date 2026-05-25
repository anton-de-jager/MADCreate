"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var AiService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiService = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
const node_events_1 = require("node:events");
const prisma_service_1 = require("../../prisma/prisma.service");
const tenants_service_1 = require("../tenants/tenants.service");
const claude_code_manual_provider_1 = require("./providers/claude-code-manual.provider");
const site_applicator_service_1 = require("./site-applicator.service");
const queue_module_1 = require("../../queue/queue.module");
const client_1 = require("@prisma/client");
let AiService = AiService_1 = class AiService {
    prisma;
    tenants;
    claudeCodeManual;
    applicator;
    queue;
    logger = new common_1.Logger(AiService_1.name);
    events = new node_events_1.EventEmitter();
    constructor(prisma, tenants, claudeCodeManual, applicator, queue) {
        this.prisma = prisma;
        this.tenants = tenants;
        this.claudeCodeManual = claudeCodeManual;
        this.applicator = applicator;
        this.queue = queue;
        this.events.setMaxListeners(50);
    }
    onChange(listener) {
        this.events.on('change', listener);
        return () => this.events.off('change', listener);
    }
    emitChange() { this.events.emit('change'); }
    getProvider(_name) {
        return this.claudeCodeManual;
    }
    async listGenerations(userId, tenantId, limit = 50) {
        await this.tenants.get(userId, tenantId);
        return this.prisma.aIGeneration.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' }, take: limit });
    }
    async getGeneration(userId, id) {
        const g = await this.prisma.aIGeneration.findUnique({ where: { id } });
        if (!g)
            throw new common_1.BadRequestException('Generation not found');
        if (userId)
            await this.tenants.get(userId, g.tenantId);
        return g;
    }
    async submitManualOutput(userId, generationId, raw) {
        const gen = await this.prisma.aIGeneration.findUnique({ where: { id: generationId } });
        if (!gen)
            throw new common_1.BadRequestException('Generation not found');
        if (userId)
            await this.tenants.get(userId, gen.tenantId);
        if (gen.status !== client_1.AIGenerationStatus.AWAITING_INPUT) {
            throw new common_1.BadRequestException(`Generation is in state ${gen.status} — only AWAITING_INPUT can accept manual input.`);
        }
        const spec = this.applicator.parse(raw);
        const result = await this.applicator.apply(gen.tenantId, spec);
        await this.prisma.aIGeneration.update({
            where: { id: gen.id },
            data: {
                status: client_1.AIGenerationStatus.SUCCESS,
                output: spec,
                rawOutput: typeof raw === 'string' ? raw : JSON.stringify(raw),
                finishedAt: new Date(),
            },
        });
        this.emitChange();
        return { generationId: gen.id, tenantId: gen.tenantId, ...result };
    }
    async enqueue(userId, tenantId, req) {
        await this.tenants.get(userId, tenantId);
        const prompt = req.promptKey ? await this.prisma.aIPrompt.findUnique({ where: { key: req.promptKey } }) : null;
        const providerEnum = client_1.AIProvider.CLAUDE_CODE_MANUAL;
        const gen = await this.prisma.aIGeneration.create({
            data: {
                tenantId,
                requesterId: userId,
                promptId: prompt?.id,
                kind: req.kind,
                provider: providerEnum,
                model: req.model ?? prompt?.model ?? 'manual',
                status: client_1.AIGenerationStatus.QUEUED,
                input: (req.variables ?? {}),
            },
        });
        await this.queue.add('run', { generationId: gen.id, request: req }, { jobId: gen.id });
        this.emitChange();
        return gen;
    }
    async run(generationId, req) {
        const gen = await this.prisma.aIGeneration.findUnique({ where: { id: generationId } });
        if (!gen)
            return;
        await this.prisma.aIGeneration.update({
            where: { id: gen.id },
            data: { status: client_1.AIGenerationStatus.RUNNING, startedAt: new Date() },
        });
        this.emitChange();
        try {
            const prompt = gen.promptId ? await this.prisma.aIPrompt.findUnique({ where: { id: gen.promptId } }) : null;
            const provider = this.getProvider(gen.provider.toLowerCase());
            const system = req.systemPrompt ?? prompt?.systemPrompt ?? 'You are MADCreate, an AI website generator. Output JSON when asked. Be concise.';
            const userTemplate = req.userPrompt ?? prompt?.userTemplate ?? '{{prompt}}';
            const variables = (req.variables ?? gen.input);
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
            if (provider.isManual) {
                await this.prisma.aIGeneration.update({
                    where: { id: gen.id },
                    data: {
                        status: client_1.AIGenerationStatus.AWAITING_INPUT,
                        rawOutput: result.raw,
                        durationMs,
                    },
                });
                this.emitChange();
                return;
            }
            let parsed = null;
            try {
                parsed = JSON.parse(result.raw);
            }
            catch { }
            await this.prisma.aIGeneration.update({
                where: { id: gen.id },
                data: {
                    status: client_1.AIGenerationStatus.SUCCESS,
                    rawOutput: result.raw,
                    output: parsed,
                    tokensIn: result.tokensIn,
                    tokensOut: result.tokensOut,
                    durationMs,
                    finishedAt: new Date(),
                },
            });
            this.emitChange();
        }
        catch (err) {
            this.logger.error(`Generation ${gen.id} failed`, err);
            await this.prisma.aIGeneration.update({
                where: { id: gen.id },
                data: {
                    status: client_1.AIGenerationStatus.FAILED,
                    error: err.message,
                    finishedAt: new Date(),
                },
            });
            this.emitChange();
        }
    }
};
exports.AiService = AiService;
exports.AiService = AiService = AiService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(4, (0, bullmq_1.InjectQueue)(queue_module_1.QUEUE_AI)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        tenants_service_1.TenantsService,
        claude_code_manual_provider_1.ClaudeCodeManualProvider,
        site_applicator_service_1.SiteApplicatorService, Function])
], AiService);
function renderTemplate(tpl, vars) {
    return tpl.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key) => {
        const val = key.split('.').reduce((acc, k) => {
            if (acc != null && typeof acc === 'object' && k in acc) {
                return acc[k];
            }
            return undefined;
        }, vars);
        if (val == null)
            return '';
        return typeof val === 'string' ? val : JSON.stringify(val);
    });
}
//# sourceMappingURL=ai.service.js.map