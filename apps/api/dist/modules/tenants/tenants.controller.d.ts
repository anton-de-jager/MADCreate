import { TenantsService } from './tenants.service';
import type { JwtPayload } from '@madcreate/shared';
declare class CreateTenantDto {
    slug: string;
    name: string;
    industry?: string;
    description?: string;
}
declare class UpdateTenantDto {
    name?: string;
    industry?: string;
    description?: string;
    branding?: unknown;
}
export declare class TenantsController {
    private readonly tenants;
    constructor(tenants: TenantsService);
    list(user: JwtPayload, workspaceId: string): Promise<({
        domains: {
            status: import("@prisma/client").$Enums.DomainStatus;
            type: import("@prisma/client").$Enums.DomainType;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            tenantId: string;
            lastError: string | null;
            hostname: string;
            isPrimary: boolean;
            verifyToken: string | null;
            lastCheckedAt: Date | null;
            sslStatus: string | null;
            sslIssuedAt: Date | null;
            sslExpiresAt: Date | null;
            cloudflareId: string | null;
        }[];
    } & {
        name: string;
        status: import("@prisma/client").$Enums.SiteStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        description: string | null;
        slug: string;
        workspaceId: string;
        industry: string | null;
        onboarding: import("@prisma/client/runtime/library").JsonValue | null;
        branding: import("@prisma/client/runtime/library").JsonValue | null;
        activeSiteId: string | null;
        activeThemeId: string | null;
    })[]>;
    get(user: JwtPayload, id: string): Promise<{
        sites: {
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
        }[];
        domains: {
            status: import("@prisma/client").$Enums.DomainStatus;
            type: import("@prisma/client").$Enums.DomainType;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            tenantId: string;
            lastError: string | null;
            hostname: string;
            isPrimary: boolean;
            verifyToken: string | null;
            lastCheckedAt: Date | null;
            sslStatus: string | null;
            sslIssuedAt: Date | null;
            sslExpiresAt: Date | null;
            cloudflareId: string | null;
        }[];
    } & {
        name: string;
        status: import("@prisma/client").$Enums.SiteStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        description: string | null;
        slug: string;
        workspaceId: string;
        industry: string | null;
        onboarding: import("@prisma/client/runtime/library").JsonValue | null;
        branding: import("@prisma/client/runtime/library").JsonValue | null;
        activeSiteId: string | null;
        activeThemeId: string | null;
    }>;
    create(user: JwtPayload, workspaceId: string, dto: CreateTenantDto): Promise<{
        name: string;
        status: import("@prisma/client").$Enums.SiteStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        description: string | null;
        slug: string;
        workspaceId: string;
        industry: string | null;
        onboarding: import("@prisma/client/runtime/library").JsonValue | null;
        branding: import("@prisma/client/runtime/library").JsonValue | null;
        activeSiteId: string | null;
        activeThemeId: string | null;
    }>;
    update(user: JwtPayload, id: string, dto: UpdateTenantDto): Promise<{
        name: string;
        status: import("@prisma/client").$Enums.SiteStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        description: string | null;
        slug: string;
        workspaceId: string;
        industry: string | null;
        onboarding: import("@prisma/client/runtime/library").JsonValue | null;
        branding: import("@prisma/client/runtime/library").JsonValue | null;
        activeSiteId: string | null;
        activeThemeId: string | null;
    }>;
    remove(user: JwtPayload, id: string): Promise<{
        name: string;
        status: import("@prisma/client").$Enums.SiteStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        description: string | null;
        slug: string;
        workspaceId: string;
        industry: string | null;
        onboarding: import("@prisma/client/runtime/library").JsonValue | null;
        branding: import("@prisma/client/runtime/library").JsonValue | null;
        activeSiteId: string | null;
        activeThemeId: string | null;
    }>;
    purgeExpired(user: JwtPayload): Promise<{
        purged: number;
        ids: string[];
    }>;
    purge(user: JwtPayload, id: string): Promise<{
        id: string;
        purged: boolean;
    }>;
}
export {};
