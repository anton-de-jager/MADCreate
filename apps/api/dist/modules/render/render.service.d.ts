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
    scripts?: Array<{
        src?: string;
        inline?: string;
        placement?: 'head' | 'body';
    }>;
}
export interface RenderedSite {
    tenant: {
        id: string;
        slug: string;
        name: string;
    };
    theme: ThemeTokens | null;
    navigation: SiteNavigation | null;
    settings: SiteSettings | null;
    pages: Array<{
        slug: string;
        title: string;
        metaTitle?: string | null;
        metaDescription?: string | null;
        schema: unknown;
    }>;
}
export declare class RenderService {
    private readonly prisma;
    private readonly domains;
    constructor(prisma: PrismaService, domains: DomainsService);
    getSiteForSlug(slug: string): Promise<RenderedSite | null>;
    getSiteForHostname(hostname: string): Promise<RenderedSite | null>;
    getPageBySlug(tenantSlug: string, pageSlug: string): Promise<{
        site: RenderedSite;
        page: {
            slug: string;
            title: string;
            metaTitle?: string | null;
            metaDescription?: string | null;
            schema: unknown;
        };
    }>;
}
