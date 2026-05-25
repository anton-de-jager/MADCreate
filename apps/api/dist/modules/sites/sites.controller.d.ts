import { SiteStatus } from '@prisma/client';
import { SitesService } from './sites.service';
import type { JwtPayload } from '@madcreate/shared';
declare class CreateSiteDto {
    name: string;
    themeId?: string;
}
declare class UpdateSiteDto {
    name?: string;
    themeId?: string;
    navigation?: unknown;
    settings?: unknown;
    status?: SiteStatus;
}
export declare class SitesController {
    private readonly sites;
    constructor(sites: SitesService);
    list(user: JwtPayload, tenantId: string): Promise<({
        theme: {
            name: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            tenantId: string;
            tokens: import("@prisma/client/runtime/library").JsonValue;
            isActive: boolean;
        } | null;
        _count: {
            pages: number;
        };
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
    })[]>;
    get(user: JwtPayload, id: string): Promise<{
        theme: {
            name: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            tenantId: string;
            tokens: import("@prisma/client/runtime/library").JsonValue;
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
    }>;
    create(user: JwtPayload, tenantId: string, dto: CreateSiteDto): Promise<{
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
    }>;
    update(user: JwtPayload, id: string, dto: UpdateSiteDto): Promise<{
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
    }>;
    publish(user: JwtPayload, id: string): Promise<{
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
    }>;
    remove(user: JwtPayload, id: string): Promise<{
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
    }>;
}
export {};
