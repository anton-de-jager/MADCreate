import { WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { DeploymentsService } from './deployments.service';
import { InternalAdapter } from './adapters/internal.adapter';
import { StaticExportAdapter } from './adapters/static-export.adapter';
import { FtpAdapter } from './adapters/ftp.adapter';
import { SftpAdapter } from './adapters/sftp.adapter';
import { WebhookAdapter } from './adapters/webhook.adapter';
import { CloudflarePagesAdapter } from './adapters/cloudflare-pages.adapter';
import { VercelAdapter } from './adapters/vercel.adapter';
import { DigitalOceanAdapter } from './adapters/digital-ocean.adapter';
import { DockerAdapter } from './adapters/docker.adapter';
export declare class DeploymentProcessor extends WorkerHost {
    private readonly prisma;
    private readonly deploymentsService;
    private readonly internal;
    private readonly staticExport;
    private readonly ftp;
    private readonly sftp;
    private readonly webhook;
    private readonly cloudflarePages;
    private readonly vercel;
    private readonly digitalOcean;
    private readonly docker;
    private readonly logger;
    constructor(prisma: PrismaService, deploymentsService: DeploymentsService, internal: InternalAdapter, staticExport: StaticExportAdapter, ftp: FtpAdapter, sftp: SftpAdapter, webhook: WebhookAdapter, cloudflarePages: CloudflarePagesAdapter, vercel: VercelAdapter, digitalOcean: DigitalOceanAdapter, docker: DockerAdapter);
    process(job: Job<{
        deploymentId: string;
    }>): Promise<void>;
    private pick;
}
