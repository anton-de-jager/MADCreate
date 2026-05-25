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
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeploymentsService = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
const bullmq_2 = require("bullmq");
const node_events_1 = require("node:events");
const prisma_service_1 = require("../../prisma/prisma.service");
const tenants_service_1 = require("../tenants/tenants.service");
const client_1 = require("@prisma/client");
const queue_module_1 = require("../../queue/queue.module");
let DeploymentsService = class DeploymentsService {
    prisma;
    tenants;
    queue;
    events = new node_events_1.EventEmitter();
    constructor(prisma, tenants, queue) {
        this.prisma = prisma;
        this.tenants = tenants;
        this.queue = queue;
        this.events.setMaxListeners(50);
    }
    onChange(listener) {
        this.events.on('change', listener);
        return () => this.events.off('change', listener);
    }
    emitChange() { this.events.emit('change'); }
    async list(userId, tenantId) {
        await this.tenants.get(userId, tenantId);
        return this.prisma.deployment.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' }, take: 50 });
    }
    async get(userId, id) {
        const d = await this.prisma.deployment.findUnique({ where: { id } });
        if (!d)
            throw new common_1.NotFoundException();
        await this.tenants.get(userId, d.tenantId);
        return d;
    }
    async trigger(userId, tenantId, dto) {
        await this.tenants.get(userId, tenantId);
        const dep = await this.prisma.deployment.create({
            data: {
                tenantId,
                siteId: dto.siteId,
                target: dto.target,
                status: client_1.DeploymentStatus.PENDING,
                triggeredBy: userId,
                config: (dto.config ?? {}),
            },
        });
        await this.queue.add('run', { deploymentId: dep.id }, { jobId: dep.id });
        this.emitChange();
        return dep;
    }
    async cancel(userId, id) {
        const d = await this.get(userId, id);
        if (d.status === client_1.DeploymentStatus.RUNNING || d.status === client_1.DeploymentStatus.PENDING) {
            const updated = await this.prisma.deployment.update({
                where: { id: d.id },
                data: { status: client_1.DeploymentStatus.CANCELLED, finishedAt: new Date() },
            });
            this.emitChange();
            return updated;
        }
        return d;
    }
};
exports.DeploymentsService = DeploymentsService;
exports.DeploymentsService = DeploymentsService = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, bullmq_1.InjectQueue)(queue_module_1.QUEUE_DEPLOY)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        tenants_service_1.TenantsService,
        bullmq_2.Queue])
], DeploymentsService);
//# sourceMappingURL=deployments.service.js.map