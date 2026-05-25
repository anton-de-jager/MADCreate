import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { WorkspacesService } from '../workspaces/workspaces.service';

const PURGE_AGE_DAYS = 30;
const PURGE_AGE_MS = PURGE_AGE_DAYS * 24 * 60 * 60 * 1000;

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService, private readonly workspaces: WorkspacesService) {}

  async list(userId: string, workspaceId: string) {
    await this.workspaces.assertMember(userId, workspaceId);
    return this.prisma.tenant.findMany({
      where: { workspaceId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: { domains: { where: { deletedAt: null } } },
    });
  }

  async findAll(userId: string, workspaceId: string) {
    return this.list(userId, workspaceId);
  }

  async get(userId: string, tenantId: string) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { id: tenantId, deletedAt: null },
      include: {
        domains: { where: { deletedAt: null } },
        sites: { where: { deletedAt: null } },
      },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');
    await this.workspaces.assertMember(userId, tenant.workspaceId);
    return tenant;
  }

  async findOne(userId: string, tenantId: string) {
    return this.get(userId, tenantId);
  }

  async create(
    userId: string,
    workspaceId: string,
    dto: { slug: string; name: string; industry?: string; description?: string },
  ) {
    await this.workspaces.assertRole(userId, workspaceId, ['WORKSPACE_OWNER', 'ADMIN', 'EDITOR']);
    const slug = await this.uniqueSlug(dto.slug);
    return this.prisma.tenant.create({
      data: {
        workspaceId,
        slug,
        name: dto.name,
        industry: dto.industry,
        description: dto.description,
      },
    });
  }

  async update(userId: string, tenantId: string, patch: { name?: string; industry?: string; description?: string; branding?: unknown }) {
    const tenant = await this.get(userId, tenantId);
    const { branding, ...rest } = patch;
    return this.prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        ...rest,
        ...(branding !== undefined && { branding: branding as Prisma.InputJsonValue }),
      },
    });
  }

  async remove(userId: string, tenantId: string) {
    const tenant = await this.get(userId, tenantId);
    await this.workspaces.assertRole(userId, tenant.workspaceId, ['WORKSPACE_OWNER', 'ADMIN']);
    const now = new Date();

    // Cascade soft-delete: tenant + child Sites, Pages, Sections, Themes.
    // Wrap in $transaction so all-or-nothing.
    const [, , , , updatedTenant] = await this.prisma.$transaction([
      this.prisma.site.updateMany({
        where: { tenantId: tenant.id, deletedAt: null },
        data: { deletedAt: now },
      }),
      this.prisma.page.updateMany({
        where: { tenantId: tenant.id, deletedAt: null },
        data: { deletedAt: now },
      }),
      this.prisma.section.updateMany({
        where: { tenantId: tenant.id, deletedAt: null },
        data: { deletedAt: now },
      }),
      this.prisma.theme.updateMany({
        where: { tenantId: tenant.id, deletedAt: null },
        data: { deletedAt: now },
      }),
      this.prisma.tenant.update({
        where: { id: tenant.id },
        data: { deletedAt: now },
      }),
    ]);

    return updatedTenant;
  }

  /**
   * Hard-delete a single tenant. Super-admin only.
   * Requires that the tenant was soft-deleted at least PURGE_AGE_DAYS ago.
   */
  async purge(userId: string, tenantId: string) {
    await this.assertSuperAdmin(userId);

    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    if (!tenant.deletedAt) {
      throw new BadRequestException('Tenant is not soft-deleted; call DELETE first');
    }
    const cutoff = new Date(Date.now() - PURGE_AGE_MS);
    if (tenant.deletedAt > cutoff) {
      throw new BadRequestException(
        `Tenant was soft-deleted on ${tenant.deletedAt.toISOString()}; must be older than ${PURGE_AGE_DAYS} days to purge`,
      );
    }

    // onDelete: Cascade on children handles the rest.
    await this.prisma.tenant.delete({ where: { id: tenant.id } });
    return { id: tenant.id, purged: true };
  }

  /**
   * Hard-delete every tenant whose deletedAt is older than PURGE_AGE_DAYS.
   * Super-admin only.
   */
  async purgeAll(userId: string) {
    await this.assertSuperAdmin(userId);

    const cutoff = new Date(Date.now() - PURGE_AGE_MS);
    const expired = await this.prisma.tenant.findMany({
      where: { deletedAt: { not: null, lt: cutoff } },
      select: { id: true },
    });
    if (!expired.length) return { purged: 0, ids: [] as string[] };

    const ids = expired.map((t) => t.id);
    const result = await this.prisma.tenant.deleteMany({
      where: { id: { in: ids } },
    });
    return { purged: result.count, ids };
  }

  private async assertSuperAdmin(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { isSuperAdmin: true },
    });
    if (!user?.isSuperAdmin) {
      throw new ForbiddenException('Super admin required');
    }
  }

  private async uniqueSlug(base: string): Promise<string> {
    const baseSlug = base.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'site';
    for (let i = 0; i < 25; i++) {
      const candidate = i === 0 ? baseSlug : `${baseSlug}-${i + 1}`;
      const taken = await this.prisma.tenant.findUnique({ where: { slug: candidate } });
      if (!taken) return candidate;
    }
    return `${baseSlug}-${Date.now().toString(36)}`;
  }
}
