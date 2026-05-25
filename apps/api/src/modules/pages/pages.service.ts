import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantsService } from '../tenants/tenants.service';
import { PageStatus, Prisma } from '@prisma/client';

@Injectable()
export class PagesService {
  constructor(private readonly prisma: PrismaService, private readonly tenants: TenantsService) {}

  async list(userId: string, siteId: string) {
    const site = await this.prisma.site.findFirst({ where: { id: siteId, deletedAt: null } });
    if (!site) throw new NotFoundException('Site not found');
    await this.tenants.get(userId, site.tenantId);
    return this.prisma.page.findMany({
      where: { siteId, deletedAt: null },
      orderBy: { order: 'asc' },
    });
  }

  async get(userId: string, pageId: string) {
    const page = await this.prisma.page.findFirst({ where: { id: pageId, deletedAt: null } });
    if (!page) throw new NotFoundException('Page not found');
    await this.tenants.get(userId, page.tenantId);
    return page;
  }

  async create(
    userId: string,
    siteId: string,
    dto: { slug: string; title: string; schema?: unknown; layoutId?: string; order?: number },
  ) {
    const site = await this.prisma.site.findFirst({ where: { id: siteId, deletedAt: null } });
    if (!site) throw new NotFoundException('Site not found');
    await this.tenants.get(userId, site.tenantId);
    return this.prisma.page.create({
      data: {
        tenantId: site.tenantId,
        siteId,
        slug: dto.slug,
        title: dto.title,
        order: dto.order ?? 0,
        layoutId: dto.layoutId,
        schema: (dto.schema ?? { sections: [] }) as Prisma.InputJsonValue,
      },
    });
  }

  async update(
    userId: string,
    pageId: string,
    patch: Partial<{
      title: string;
      metaTitle: string;
      metaDescription: string;
      ogImageUrl: string;
      slug: string;
      order: number;
      schema: unknown;
      layoutId: string | null;
      status: PageStatus;
    }>,
  ) {
    const page = await this.get(userId, pageId);
    const data: Prisma.PageUpdateInput = {
      ...patch,
      schema: patch.schema !== undefined ? (patch.schema as Prisma.InputJsonValue) : undefined,
    };
    return this.prisma.page.update({ where: { id: page.id }, data });
  }

  async publish(userId: string, pageId: string) {
    const page = await this.get(userId, pageId);
    return this.prisma.page.update({
      where: { id: page.id },
      data: { status: PageStatus.PUBLISHED, publishedAt: new Date() },
    });
  }

  async remove(userId: string, pageId: string) {
    const page = await this.get(userId, pageId);
    return this.prisma.page.update({ where: { id: page.id }, data: { deletedAt: new Date() } });
  }
}
