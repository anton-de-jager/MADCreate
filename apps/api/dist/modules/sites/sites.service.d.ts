import { PrismaService } from '../../prisma/prisma.service';
import { TenantsService } from '../tenants/tenants.service';
import { Prisma, SiteStatus } from '@prisma/client';
export declare class SitesService {
    private readonly prisma;
    private readonly tenants;
    constructor(prisma: PrismaService, tenants: TenantsService);
    list(userId: string, tenantId: string): Promise<({
        theme: {
            name: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            tenantId: string;
            tokens: Prisma.JsonValue;
            isActive: boolean;
        } | null;
        _count: {
            pages: number;
        };
    } & {
        name: string;
        settings: Prisma.JsonValue | null;
        status: import("@prisma/client").$Enums.SiteStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        version: number;
        tenantId: string;
        themeId: string | null;
        navigation: Prisma.JsonValue | null;
        publishedAt: Date | null;
    })[]>;
    get(userId: string, siteId: string): Promise<{
        theme: {
            name: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            tenantId: string;
            tokens: Prisma.JsonValue;
            isActive: boolean;
        } | null;
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
            schema: Prisma.JsonValue;
            siteId: string;
            layoutId: string | null;
        }[];
    } & {
        name: string;
        settings: Prisma.JsonValue | null;
        status: import("@prisma/client").$Enums.SiteStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        version: number;
        tenantId: string;
        themeId: string | null;
        navigation: Prisma.JsonValue | null;
        publishedAt: Date | null;
    }>;
    create(userId: string, tenantId: string, dto: {
        name: string;
        themeId?: string;
    }): Promise<{
        name: string;
        settings: Prisma.JsonValue | null;
        status: import("@prisma/client").$Enums.SiteStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        version: number;
        tenantId: string;
        themeId: string | null;
        navigation: Prisma.JsonValue | null;
        publishedAt: Date | null;
    }>;
    update(userId: string, siteId: string, patch: {
        name?: string;
        themeId?: string | null;
        navigation?: unknown;
        settings?: unknown;
        status?: SiteStatus;
    }): Promise<{
        name: string;
        settings: Prisma.JsonValue | null;
        status: import("@prisma/client").$Enums.SiteStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        version: number;
        tenantId: string;
        themeId: string | null;
        navigation: Prisma.JsonValue | null;
        publishedAt: Date | null;
    }>;
    publish(userId: string, siteId: string): Promise<{
        name: string;
        settings: Prisma.JsonValue | null;
        status: import("@prisma/client").$Enums.SiteStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        version: number;
        tenantId: string;
        themeId: string | null;
        navigation: Prisma.JsonValue | null;
        publishedAt: Date | null;
    }>;
    remove(userId: string, siteId: string): Promise<{
        name: string;
        settings: Prisma.JsonValue | null;
        status: import("@prisma/client").$Enums.SiteStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        version: number;
        tenantId: string;
        themeId: string | null;
        navigation: Prisma.JsonValue | null;
        publishedAt: Date | null;
    }>;
}
