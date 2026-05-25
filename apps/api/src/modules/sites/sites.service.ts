import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantsService } from '../tenants/tenants.service';
import { Prisma, SiteStatus } from '@prisma/client';

@Injectable()
export class SitesService {
  constructor(private readonly prisma: PrismaService, private readonly tenants: TenantsService) {}

  async list(userId: string, tenantId: string) {
    await this.tenants.get(userId, tenantId);
    return this.prisma.site.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { updatedAt: 'desc' },
      include: { theme: true, _count: { select: { pages: { where: { deletedAt: null } } } } },
    });
  }

  async get(userId: string, siteId: string) {
    const site = await this.prisma.site.findFirst({
      where: { id: siteId, deletedAt: null },
      include: { theme: true, pages: { where: { deletedAt: null }, orderBy: { order: 'asc' } } },
    });
    if (!site) throw new NotFoundException('Site not found');
    await this.tenants.get(userId, site.tenantId);
    return site;
  }

  async create(userId: string, tenantId: string, dto: { name: string; themeId?: string }) {
    await this.tenants.get(userId, tenantId);
    return this.prisma.site.create({
      data: { tenantId, name: dto.name, themeId: dto.themeId, status: SiteStatus.DRAFT },
    });
  }

  async update(userId: string, siteId: string, patch: { name?: string; themeId?: string | null; navigation?: unknown; settings?: unknown; status?: SiteStatus }) {
    const site = await this.get(userId, siteId);
    return this.prisma.site.update({
      where: { id: site.id },
      data: {
        ...patch,
        navigation: patch.navigation as Prisma.InputJsonValue | undefined,
        settings: patch.settings as Prisma.InputJsonValue | undefined,
      },
    });
  }

  async publish(userId: string, siteId: string) {
    const site = await this.get(userId, siteId);
    return this.prisma.site.update({
      where: { id: site.id },
      data: { status: SiteStatus.PUBLISHED, publishedAt: new Date(), version: { increment: 1 } },
    });
  }

  async remove(userId: string, siteId: string) {
    const site = await this.get(userId, siteId);
    return this.prisma.site.update({ where: { id: site.id }, data: { deletedAt: new Date() } });
  }
}
