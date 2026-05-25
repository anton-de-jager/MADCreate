import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, TemplateVisibility, SiteStatus } from '@prisma/client';

interface TemplateSchema {
  // Match @madcreate/shared SiteSchema
  name?: string;
  navigation?: unknown;
  settings?: unknown;
  pages: Array<{
    slug: string;
    title: string;
    metaTitle?: string;
    metaDescription?: string;
    sections: Array<{ kind: string; props: unknown }>;
  }>;
}

@Injectable()
export class TemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  async listPublic(opts: { category?: string; industry?: string; search?: string }) {
    return this.prisma.template.findMany({
      where: {
        deletedAt: null,
        visibility: TemplateVisibility.PUBLIC,
        ...(opts.category ? { category: opts.category } : {}),
        ...(opts.industry ? { industry: opts.industry } : {}),
        ...(opts.search
          ? { OR: [{ name: { contains: opts.search } }, { description: { contains: opts.search } }] }
          : {}),
      },
      orderBy: [{ popularity: 'desc' }, { updatedAt: 'desc' }],
      take: 100,
    });
  }

  async get(slug: string) {
    const t = await this.prisma.template.findUnique({ where: { slug } });
    if (!t) throw new NotFoundException();
    return t;
  }

  /**
   * Clone a template's full site schema into a new Site + Pages under the
   * target tenant. Returns the created Site.
   */
  async instantiate(tenantId: string, templateSlug: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const template = await this.prisma.template.findUnique({ where: { slug: templateSlug } });
    if (!template) throw new NotFoundException('Template not found');

    const schema = template.schema as unknown as TemplateSchema;
    if (!schema || !Array.isArray(schema.pages) || schema.pages.length === 0) {
      throw new BadRequestException('Template has no pages to clone');
    }

    return this.prisma.$transaction(async (tx) => {
      const site = await tx.site.create({
        data: {
          tenantId,
          name: schema.name ?? template.name,
          status: SiteStatus.DRAFT,
          navigation: (schema.navigation ?? null) as Prisma.InputJsonValue,
          settings: (schema.settings ?? null) as Prisma.InputJsonValue,
        },
      });

      for (const [i, p] of schema.pages.entries()) {
        await tx.page.create({
          data: {
            tenantId,
            siteId: site.id,
            slug: p.slug,
            title: p.title,
            metaTitle: p.metaTitle ?? null,
            metaDescription: p.metaDescription ?? null,
            order: i,
            schema: { sections: p.sections ?? [] } as Prisma.InputJsonValue,
          },
        });
      }

      await tx.template.update({
        where: { id: template.id },
        data: { popularity: { increment: 1 } },
      });

      return tx.site.findUnique({
        where: { id: site.id },
        include: { pages: { orderBy: { order: 'asc' } } },
      });
    });
  }
}
