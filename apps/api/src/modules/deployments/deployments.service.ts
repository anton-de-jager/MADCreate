import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { EventEmitter } from 'node:events';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantsService } from '../tenants/tenants.service';
import { DeploymentStatus, DeploymentTarget, Prisma } from '@prisma/client';
import { QUEUE_DEPLOY } from '../../queue/queue.module';

export interface CreateDeploymentDto {
  siteId?: string;
  target: DeploymentTarget;
  config?: Record<string, unknown>;
}

@Injectable()
export class DeploymentsService {
  private readonly events = new EventEmitter();

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenants: TenantsService,
    @InjectQueue(QUEUE_DEPLOY) private readonly queue: Queue,
  ) {
    this.events.setMaxListeners(50);
  }

  /** Subscribe to deployment-change events for SSE. */
  onChange(listener: () => void): () => void {
    this.events.on('change', listener);
    return () => this.events.off('change', listener);
  }

  emitChange() { this.events.emit('change'); }

  async list(userId: string, tenantId: string) {
    await this.tenants.get(userId, tenantId);
    return this.prisma.deployment.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' }, take: 50 });
  }

  async get(userId: string, id: string) {
    const d = await this.prisma.deployment.findUnique({ where: { id } });
    if (!d) throw new NotFoundException();
    await this.tenants.get(userId, d.tenantId);
    return d;
  }

  async trigger(userId: string, tenantId: string, dto: CreateDeploymentDto) {
    await this.tenants.get(userId, tenantId);
    const dep = await this.prisma.deployment.create({
      data: {
        tenantId,
        siteId: dto.siteId,
        target: dto.target,
        status: DeploymentStatus.PENDING,
        triggeredBy: userId,
        config: (dto.config ?? {}) as Prisma.InputJsonValue,
      },
    });
    await this.queue.add('run', { deploymentId: dep.id }, { jobId: dep.id });
    this.emitChange();
    return dep;
  }

  async cancel(userId: string, id: string) {
    const d = await this.get(userId, id);
    if (d.status === DeploymentStatus.RUNNING || d.status === DeploymentStatus.PENDING) {
      const updated = await this.prisma.deployment.update({
        where: { id: d.id },
        data: { status: DeploymentStatus.CANCELLED, finishedAt: new Date() },
      });
      this.emitChange();
      return updated;
    }
    return d;
  }
}
