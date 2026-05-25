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
var ClaudeTasksService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClaudeTasksService = void 0;
const common_1 = require("@nestjs/common");
const events_1 = require("events");
const prisma_service_1 = require("../../prisma/prisma.service");
const client_1 = require("@prisma/client");
const ACTIVE = [client_1.ClaudeTaskStatus.PENDING, client_1.ClaudeTaskStatus.IN_PROGRESS];
let ClaudeTasksService = class ClaudeTasksService {
    static { ClaudeTasksService_1 = this; }
    prisma;
    events = new events_1.EventEmitter();
    constructor(prisma) {
        this.prisma = prisma;
        this.events.setMaxListeners(50);
    }
    onTaskChange(listener) {
        this.events.on('change', listener);
        return () => this.events.off('change', listener);
    }
    emitChange() { this.events.emit('change'); }
    async findAll() {
        const rows = await this.prisma.claudeTask.findMany({
            orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
        });
        const bucket = (s) => s === 'PENDING' || s === 'IN_PROGRESS' || s === 'DEFERRED' ? 0 :
            s === 'TO_BE_DEPLOYED' ? 1 : 2;
        return rows.sort((a, b) => {
            const ba = bucket(a.status), bb = bucket(b.status);
            if (ba !== bb)
                return ba - bb;
            if (ba < 2) {
                if (a.priority !== b.priority)
                    return a.priority - b.priority;
                return a.createdAt.getTime() - b.createdAt.getTime();
            }
            return b.createdAt.getTime() - a.createdAt.getTime();
        });
    }
    async findNext() {
        const task = await this.prisma.claudeTask.findFirst({
            where: { status: { in: ACTIVE } },
            orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
        });
        return { task: task ?? null };
    }
    async findOne(id) {
        const t = await this.prisma.claudeTask.findUnique({ where: { id } });
        if (!t)
            throw new common_1.NotFoundException(`Task #${id} not found`);
        return t;
    }
    async create(dto) {
        const task = await this.prisma.claudeTask.create({
            data: {
                title: dto.title,
                description: dto.description ?? null,
                notes: dto.notes ?? null,
                status: dto.status ?? client_1.ClaudeTaskStatus.PENDING,
                priority: dto.priority ?? 3,
            },
        });
        this.emitChange();
        return task;
    }
    async update(id, dto) {
        await this.findOne(id);
        const data = {};
        if (dto.title !== undefined)
            data.title = dto.title;
        if (dto.description !== undefined)
            data.description = dto.description;
        if (dto.notes !== undefined)
            data.notes = dto.notes;
        if (dto.status !== undefined)
            data.status = dto.status;
        if (dto.attachments !== undefined)
            data.attachments = dto.attachments;
        if (dto.priority !== undefined)
            data.priority = dto.priority;
        const task = await this.prisma.claudeTask.update({ where: { id }, data });
        this.emitChange();
        return task;
    }
    async remove(id) {
        await this.findOne(id);
        await this.prisma.claudeTask.delete({ where: { id } });
        this.emitChange();
    }
    async importBulk(dto) {
        if (dto.source !== 'error-reporter') {
            const settings = await this.getSettings();
            if (!settings.scannerActive) {
                return { created: 0, skipped: dto.items.length, createdIndexes: [], skippedTitles: dto.items.map((i) => i.title) };
            }
        }
        const active = await this.prisma.claudeTask.findMany({
            where: { status: { in: ACTIVE } },
            select: { title: true },
        });
        const activeTitles = new Set(active.map((t) => t.title.trim().toLowerCase()));
        const seen = new Set();
        const createdIndexes = [];
        const skippedTitles = [];
        for (const item of dto.items) {
            const key = item.title.trim().toLowerCase();
            if (activeTitles.has(key) || seen.has(key)) {
                skippedTitles.push(item.title);
                continue;
            }
            seen.add(key);
            const saved = await this.prisma.claudeTask.create({
                data: {
                    title: item.title.trim(),
                    description: item.description ?? null,
                    notes: item.notes ?? null,
                    status: client_1.ClaudeTaskStatus.PENDING,
                    priority: item.priority ?? 3,
                },
            });
            createdIndexes.push(saved.id);
        }
        if (createdIndexes.length > 0)
            this.emitChange();
        return {
            created: createdIndexes.length,
            skipped: skippedTitles.length,
            createdIndexes,
            skippedTitles,
        };
    }
    static SETTING_KEYS = [
        'claude_worker_active',
        'claude_scanner_active',
        'claude_deploy_next',
    ];
    async getSettings() {
        const flags = await this.prisma.featureFlag.findMany({
            where: { key: { in: [...ClaudeTasksService_1.SETTING_KEYS] }, workspaceId: null },
        });
        const map = new Map(flags.map((f) => [f.key, f.enabled]));
        return {
            workerActive: map.get('claude_worker_active') ?? false,
            scannerActive: map.get('claude_scanner_active') ?? false,
            deployNext: map.get('claude_deploy_next') ?? false,
        };
    }
    async updateSettings(dto) {
        const updates = [];
        if (dto.workerActive !== undefined)
            updates.push({ key: 'claude_worker_active', enabled: dto.workerActive });
        if (dto.scannerActive !== undefined)
            updates.push({ key: 'claude_scanner_active', enabled: dto.scannerActive });
        if (dto.deployNext !== undefined)
            updates.push({ key: 'claude_deploy_next', enabled: dto.deployNext });
        for (const u of updates) {
            const existing = await this.prisma.featureFlag.findFirst({
                where: { key: u.key, workspaceId: null },
            });
            if (existing) {
                await this.prisma.featureFlag.update({ where: { id: existing.id }, data: { enabled: u.enabled } });
            }
            else {
                await this.prisma.featureFlag.create({
                    data: { key: u.key, enabled: u.enabled, workspaceId: null, description: `Claude worker setting: ${u.key}` },
                });
            }
        }
        return this.getSettings();
    }
};
exports.ClaudeTasksService = ClaudeTasksService;
exports.ClaudeTasksService = ClaudeTasksService = ClaudeTasksService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ClaudeTasksService);
//# sourceMappingURL=claude-tasks.service.js.map