"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeploymentsModule = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
const deployments_controller_1 = require("./deployments.controller");
const deployments_service_1 = require("./deployments.service");
const deployment_processor_1 = require("./deployment.processor");
const tenants_module_1 = require("../tenants/tenants.module");
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
let DeploymentsModule = class DeploymentsModule {
};
exports.DeploymentsModule = DeploymentsModule;
exports.DeploymentsModule = DeploymentsModule = __decorate([
    (0, common_1.Module)({
        imports: [tenants_module_1.TenantsModule, bullmq_1.BullModule.registerQueue({ name: queue_module_1.QUEUE_DEPLOY })],
        controllers: [deployments_controller_1.DeploymentsController],
        providers: [
            deployments_service_1.DeploymentsService,
            deployment_processor_1.DeploymentProcessor,
            internal_adapter_1.InternalAdapter,
            static_export_adapter_1.StaticExportAdapter,
            ftp_adapter_1.FtpAdapter,
            sftp_adapter_1.SftpAdapter,
            webhook_adapter_1.WebhookAdapter,
            cloudflare_pages_adapter_1.CloudflarePagesAdapter,
            vercel_adapter_1.VercelAdapter,
            digital_ocean_adapter_1.DigitalOceanAdapter,
            docker_adapter_1.DockerAdapter,
        ],
        exports: [deployments_service_1.DeploymentsService],
    })
], DeploymentsModule);
//# sourceMappingURL=deployments.module.js.map