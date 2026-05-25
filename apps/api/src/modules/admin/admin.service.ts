import { ForbiddenException, Injectable } from '@nestjs/common';
import { SiteStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { JwtPayload } from '@madcreate/shared';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  assertSuperAdmin(user: JwtPayload | undefined): void {
    if (!user?.superAdmin) throw new ForbiddenException('Super admin required');
  }

  async overview() {
    const [workspaces, tenants, users, sites, deployments, aiGenerations, customDomains] = await Promise.all([
      this.prisma.workspace.count({ where: { deletedAt: null } }),
      this.prisma.tenant.count({ where: { deletedAt: null } }),
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.site.count({ where: { deletedAt: null } }),
      this.prisma.deployment.count(),
      this.prisma.aIGeneration.count(),
      this.prisma.domain.count({ where: { deletedAt: null, type: { not: 'SUBDOMAIN' } } }),
    ]);
    return { workspaces, tenants, users, sites, deployments, aiGenerations, customDomains };
  }

  async listTenants(search?: string, status?: string) {
    const tenants = await this.prisma.tenant.findMany({
      where: {
        deletedAt: null,
        ...(search ? { OR: [{ slug: { contains: search } }, { name: { contains: search } }] } : {}),
        ...(status ? { status: status as SiteStatus } : {}),
      },
      include: {
        workspace: {
          include: {
            members: { where: { role: 'WORKSPACE_OWNER' }, take: 1, include: { user: { select: { email: true } } } },
          },
        },
        sites: { where: { deletedAt: null }, select: { id: true } },
        deployments: { orderBy: { createdAt: 'desc' as const }, take: 1, select: { createdAt: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return tenants.map((t) => ({
      id: t.id,
      slug: t.slug,
      name: t.name,
      status: t.status,
      createdAt: t.createdAt,
      workspace: { id: t.workspace.id, name: t.workspace.name, slug: t.workspace.slug },
      ownerEmail: t.workspace.members[0]?.user?.email ?? null,
      siteCount: t.sites.length,
      lastDeploy: t.deployments[0]?.createdAt ?? null,
    }));
  }

  async listFeatureFlags() {
    return this.prisma.featureFlag.findMany({ orderBy: { key: 'asc' } });
  }

  async setFlag(key: string, enabled: boolean, workspaceId?: string) {
    if (workspaceId) {
      return this.prisma.featureFlag.upsert({
        where: { workspaceId_key: { workspaceId, key } },
        update: { enabled },
        create: { key, enabled, workspaceId },
      });
    }

    const existing = await this.prisma.featureFlag.findFirst({
      where: { key, workspaceId: null },
    });

    if (existing) {
      return this.prisma.featureFlag.update({
        where: { id: existing.id },
        data: { enabled },
      });
    }

    return this.prisma.featureFlag.create({
      data: { key, enabled },
    });
  }

  async suspendTenant(id: string) {
    return this.prisma.tenant.update({ where: { id }, data: { status: 'ARCHIVED' } });
  }

  async unsuspendTenant(id: string) {
    return this.prisma.tenant.update({ where: { id }, data: { status: 'DRAFT' } });
  }

  async softDeleteTenant(id: string) {
    return this.prisma.tenant.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}
