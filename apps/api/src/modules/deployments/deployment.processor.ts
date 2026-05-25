import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { DeploymentsService } from './deployments.service';
import { DeploymentStatus, DeploymentTarget } from '@prisma/client';
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
import type { DeploymentAdapter } from './adapters/adapter.interface';

@Processor(QUEUE_DEPLOY)
export class DeploymentProcessor extends WorkerHost {
  private readonly logger = new Logger(DeploymentProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly deploymentsService: DeploymentsService,
    private readonly internal: InternalAdapter,
    private readonly staticExport: StaticExportAdapter,
    private readonly ftp: FtpAdapter,
    private readonly sftp: SftpAdapter,
    private readonly webhook: WebhookAdapter,
    private readonly cloudflarePages: CloudflarePagesAdapter,
    private readonly vercel: VercelAdapter,
    private readonly digitalOcean: DigitalOceanAdapter,
    private readonly docker: DockerAdapter,
  ) {
    super();
  }

  async process(job: Job<{ deploymentId: string }>) {
    const dep = await this.prisma.deployment.findUnique({ where: { id: job.data.deploymentId } });
    if (!dep) return;

    const adapter = this.pick(dep.target);
    const startedAt = new Date();
    await this.prisma.deployment.update({
      where: { id: dep.id },
      data: { status: DeploymentStatus.RUNNING, startedAt },
    });
    this.deploymentsService.emitChange();

    try {
      const result = await adapter.deploy({
        tenantId: dep.tenantId,
        siteId: dep.siteId,
        config: dep.config as Record<string, unknown>,
      });
      const finishedAt = new Date();
      await this.prisma.deployment.update({
        where: { id: dep.id },
        data: {
          status: DeploymentStatus.SUCCESS,
          finishedAt,
          durationMs: finishedAt.getTime() - startedAt.getTime(),
          artefactUrl: result.artefactUrl ?? null,
          log: result.log ?? null,
          version: result.version ?? null,
        },
      });
      this.deploymentsService.emitChange();
    } catch (err) {
      const finishedAt = new Date();
      this.logger.error(`Deployment ${dep.id} failed`, err);
      await this.prisma.deployment.update({
        where: { id: dep.id },
        data: {
          status: DeploymentStatus.FAILED,
          finishedAt,
          durationMs: finishedAt.getTime() - startedAt.getTime(),
          log: (err as Error).stack ?? (err as Error).message,
        },
      });
      this.deploymentsService.emitChange();
      throw err;
    }
  }

  private pick(target: DeploymentTarget): DeploymentAdapter {
    switch (target) {
      case 'INTERNAL':         return this.internal;
      case 'STATIC_EXPORT':    return this.staticExport;
      case 'SFTP':             return this.sftp;
      case 'FTP':              return this.ftp;
      case 'CUSTOM_WEBHOOK':   return this.webhook;
      case 'CLOUDFLARE_PAGES': return this.cloudflarePages;
      case 'VERCEL':           return this.vercel;
      case 'DIGITAL_OCEAN':    return this.digitalOcean;
      case 'DOCKER':           return this.docker;
      default:                 return this.internal;
    }
  }
}
