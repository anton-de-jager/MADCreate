import { Injectable, NotFoundException } from '@nestjs/common';
import type { ThemeTokens, SiteNavigation, MediaRef } from '@madcreate/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { DomainsService } from '../domains/domains.service';

export interface SiteSettings {
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string[];
  ogTitle?: string;
  ogDescription?: string;
  favicon?: string;
  ogDefault?: MediaRef;
  scripts?: Array<{ src?: string; inline?: string; placement?: 'head' | 'body' }>;
}

export interface RenderedSite {
  tenant: { id: string; slug: string; name: string };
  theme: ThemeTokens | null;
  navigation: SiteNavigation | null;
  settings: SiteSettings | null;
  pages: Array<{ slug: string; title: string; metaTitle?: string | null; metaDescription?: string | null; schema: unknown }>;
}

@Injectable()
export class RenderService {
  constructor(private readonly prisma: PrismaService, private readonly domains: DomainsService) {}

  async getSiteForSlug(slug: string): Promise<RenderedSite | null> {
    const tenant = await this.prisma.tenant.findFirst({
      where: { slug, deletedAt: null },
      include: {
        sites: {
          where: { deletedAt: null, status: 'PUBLISHED' },
          orderBy: { publishedAt: 'desc' },
          include: { theme: true, pages: { where: { deletedAt: null, status: 'PUBLISHED' }, orderBy: { order: 'asc' } } },
          take: 1,
        },
      },
    });
    if (!tenant) return null;
    const site = tenant.sites[0];
    if (!site) return null;

    return {
      tenant: { id: tenant.id, slug: tenant.slug, name: tenant.name },
      theme: (site.theme?.tokens as unknown as ThemeTokens) ?? null,
      navigation: (site.navigation as unknown as SiteNavigation) ?? null,
      settings: (site.settings as SiteSettings) ?? null,
      pages: site.pages.map((p) => ({
        slug: p.slug,
        title: p.title,
        metaTitle: p.metaTitle,
        metaDescription: p.metaDescription,
        schema: p.schema,
      })),
    };
  }

  async getSiteForHostname(hostname: string): Promise<RenderedSite | null> {
    const domain = await this.domains.resolveByHostname(hostname);
    if (!domain) return null;
    return this.getSiteForSlug(domain.tenant.slug);
  }

  async getPageBySlug(tenantSlug: string, pageSlug: string) {
    const site = await this.getSiteForSlug(tenantSlug);
    if (!site) throw new NotFoundException('Site not found');
    const page = site.pages.find((p) => p.slug === (pageSlug || 'home')) ?? site.pages.find((p) => p.slug === 'home');
    if (!page) throw new NotFoundException('Page not found');
    return { site, page };
  }
}
