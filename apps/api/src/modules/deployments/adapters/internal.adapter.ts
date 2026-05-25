import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import type { DeploymentAdapter, DeploymentInput, DeploymentResult } from './adapter.interface';

// "Internal" = the site stays hosted on the MADCreate platform itself.
// The deploy step just marks the current site as published and bumps its version.
@Injectable()
export class InternalAdapter implements DeploymentAdapter {
  constructor(private readonly prisma: PrismaService) {}

  async deploy(input: DeploymentInput): Promise<DeploymentResult> {
    const site = input.siteId
      ? await this.prisma.site.findUnique({ where: { id: input.siteId } })
      : await this.prisma.site.findFirst({ where: { tenantId: input.tenantId, deletedAt: null }, orderBy: { updatedAt: 'desc' } });
    if (!site) return { log: 'No site to deploy', version: '0' };

    const updated = await this.prisma.site.update({
      where: { id: site.id },
      data: { status: 'PUBLISHED', publishedAt: new Date(), version: { increment: 1 } },
    });
    return {
      version: String(updated.version),
      log: `Published site "${updated.name}" (v${updated.version}) to internal hosting.`,
      artefactUrl: undefined,
    };
  }
}
