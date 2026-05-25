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
var DeploymentProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeploymentProcessor = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const deployments_service_1 = require("./deployments.service");
const client_1 = require("@prisma/client");
const queue_module_1 = require("../../queue/queue.module");
const internal_adapter_1 = require("./adapters/internal.adapter");
const static_export_adapter_1 = require("./adapters/static-export.adapter");
const ftp_adapter_1 = require("./adapters/ftp.adapter");
const sftp_adapter_1 = require("./adapters/sftp.adapter");
const webhook_adapter_1 = require("./adapters/webhook.adapter");
const cloudflare_pages_adapter_1 = require("./adapters/cloudflare-pages.adapter");
const vercel_adapter_1 = require("./adapters/vercel.adapter");
const digital_ocean_adapter_1 = require("./adapters/digital-ocean.adapter");
const docker_adapter_1 = require("./adapters/docker.adapter");
let DeploymentProcessor = DeploymentProcessor_1 = class DeploymentProcessor extends bullmq_1.WorkerHost {
    prisma;
    deploymentsService;
    internal;
    staticExport;
    ftp;
    sftp;
    webhook;
    cloudflarePages;
    vercel;
    digitalOcean;
    docker;
    logger = new common_1.Logger(DeploymentProcessor_1.name);
    constructor(prisma, deploymentsService, internal, staticExport, ftp, sftp, webhook, cloudflarePages, vercel, digitalOcean, docker) {
        super();
        this.prisma = prisma;
        this.deploymentsService = deploymentsService;
        this.internal = internal;
        this.staticExport = staticExport;
        this.ftp = ftp;
        this.sftp = sftp;
        this.webhook = webhook;
        this.cloudflarePages = cloudflarePages;
        this.vercel = vercel;
        this.digitalOcean = digitalOcean;
        this.docker = docker;
    }
    async process(job) {
        const dep = await this.prisma.deployment.findUnique({ where: { id: job.data.deploymentId } });
        if (!dep)
            return;
        const adapter = this.pick(dep.target);
        const startedAt = new Date();
        await this.prisma.deployment.update({
            where: { id: dep.id },
            data: { status: client_1.DeploymentStatus.RUNNING, startedAt },
        });
        this.deploymentsService.emitChange();
        try {
            const result = await adapter.deploy({
                tenantId: dep.tenantId,
                siteId: dep.siteId,
                config: dep.config,
            });
            const finishedAt = new Date();
            await this.prisma.deployment.update({
                where: { id: dep.id },
                data: {
                    status: client_1.DeploymentStatus.SUCCESS,
                    finishedAt,
                    durationMs: finishedAt.getTime() - startedAt.getTime(),
                    artefactUrl: result.artefactUrl ?? null,
                    log: result.log ?? null,
                    version: result.version ?? null,
                },
            });
            this.deploymentsService.emitChange();
        }
        catch (err) {
            const finishedAt = new Date();
            this.logger.error(`Deployment ${dep.id} failed`, err);
            await this.prisma.deployment.update({
                where: { id: dep.id },
                data: {
                    status: client_1.DeploymentStatus.FAILED,
                    finishedAt,
                    durationMs: finishedAt.getTime() - startedAt.getTime(),
                    log: err.stack ?? err.message,
                },
            });
            this.deploymentsService.emitChange();
            throw err;
        }
    }
    pick(target) {
        switch (target) {
            case 'INTERNAL': return this.internal;
            case 'STATIC_EXPORT': return this.staticExport;
            case 'SFTP': return this.sftp;
            case 'FTP': return this.ftp;
            case 'CUSTOM_WEBHOOK': return this.webhook;
            case 'CLOUDFLARE_PAGES': return this.cloudflarePages;
            case 'VERCEL': return this.vercel;
            case 'DIGITAL_OCEAN': return this.digitalOcean;
            case 'DOCKER': return this.docker;
            default: return this.internal;
        }
    }
};
exports.DeploymentProcessor = DeploymentProcessor;
exports.DeploymentProcessor = DeploymentProcessor = DeploymentProcessor_1 = __decorate([
    (0, bullmq_1.Processor)(queue_module_1.QUEUE_DEPLOY),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        deployments_service_1.DeploymentsService,
        internal_adapter_1.InternalAdapter,
        static_export_adapter_1.StaticExportAdapter,
        ftp_adapter_1.FtpAdapter,
        sftp_adapter_1.SftpAdapter,
        webhook_adapter_1.WebhookAdapter,
        cloudflare_pages_adapter_1.CloudflarePagesAdapter,
        vercel_adapter_1.VercelAdapter,
        digital_ocean_adapter_1.DigitalOceanAdapter,
        docker_adapter_1.DockerAdapter])
], DeploymentProcessor);
//# sourceMappingURL=deployment.processor.js.map