import { TemplatesService } from './templates.service';
export declare class TemplatesController {
    private readonly templates;
    constructor(templates: TemplatesService);
    list(category?: string, industry?: string, search?: string): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        description: string | null;
        slug: string;
        workspaceId: string | null;
        industry: string | null;
        schema: import("@prisma/client/runtime/library").JsonValue;
        category: string | null;
        previewUrl: string | null;
        thumbnailUrl: string | null;
        visibility: import("@prisma/client").$Enums.TemplateVisibility;
        popularity: number;
    }[]>;
    get(slug: string): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        description: string | null;
        slug: string;
        workspaceId: string | null;
        industry: string | null;
        schema: import("@prisma/client/runtime/library").JsonValue;
        category: string | null;
        previewUrl: string | null;
        thumbnailUrl: string | null;
        visibility: import("@prisma/client").$Enums.TemplateVisibility;
        popularity: number;
    }>;
    instantiate(slug: string, tenantId: string): Promise<({
        pages: {
            status: import("@prisma/client").$Enums.PageStatus;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            slug: string;
            tenantId: string;
            publishedAt: Date | null;
            title: string;
            metaTitle: string | null;
            metaDescription: string | null;
            ogImageUrl: string | null;
            order: number;
            schema: import("@prisma/client/runtime/library").JsonValue;
            siteId: string;
            layoutId: string | null;
        }[];
    } & {
        name: string;
        settings: import("@prisma/client/runtime/library").JsonValue | null;
        status: import("@prisma/client").$Enums.SiteStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        version: number;
        tenantId: string;
        themeId: string | null;
        navigation: import("@prisma/client/runtime/library").JsonValue | null;
        publishedAt: Date | null;
    }) | null>;
}
