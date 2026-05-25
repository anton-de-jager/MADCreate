import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DeploymentsController } from './deployments.controller';
import { DeploymentsService } from './deployments.service';
import { DeploymentProcessor } from './deployment.processor';
import { TenantsModule } from '../tenants/tenants.module';
import { QUEUE_DEPLOY } from '../../queue/queue.module';
import { InternalAdapter } from './adapters/internal.adapter';
import { StaticExportAdapter } from './adapters/static-export.adapter';
import { FtpAdapter } from './adapters/ftp.adapter';
import { SftpAdapter } from './adapters/sftp.adapter';
import { WebhookAdapter } from './adapters/webhook.adapter';
import { CloudflarePagesAdapter } from './adapters/cloudflare-pages.adapter';
import { VercelAdapter } from './adapters/vercel.adapter';
import { DigitalOceanAdapter } from './adapters/digital-ocean.adapter';
import { DockerAdapter } from './adapters/docker.adapter';

@Module({
  imports: [TenantsModule, BullModule.registerQueue({ name: QUEUE_DEPLOY })],
  controllers: [DeploymentsController],
  providers: [
    DeploymentsService,
    DeploymentProcessor,
    InternalAdapter,
    StaticExportAdapter,
    FtpAdapter,
    SftpAdapter,
    WebhookAdapter,
    CloudflarePagesAdapter,
    VercelAdapter,
    DigitalOceanAdapter,
    DockerAdapter,
  ],
  exports: [DeploymentsService],
})
export class DeploymentsModule {}
