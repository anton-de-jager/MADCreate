import { PrismaService } from '../../prisma/prisma.service';
import type { JwtPayload } from '@madcreate/shared';
export declare class AdminService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    assertSuperAdmin(user: JwtPayload | undefined): void;
    overview(): Promise<{
        workspaces: number;
        tenants: number;
        users: number;
        sites: number;
        deployments: number;
        aiGenerations: number;
        customDomains: number;
    }>;
    listTenants(search?: string, status?: string): Promise<{
        id: string;
        slug: string;
        name: string;
        status: import("@prisma/client").$Enums.SiteStatus;
        createdAt: Date;
        workspace: {
            id: string;
            name: string;
            slug: string;
        };
        ownerEmail: string;
        siteCount: number;
        lastDeploy: Date;
    }[]>;
    listFeatureFlags(): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        workspaceId: string | null;
        key: string;
        payload: import("@prisma/client/runtime/library").JsonValue | null;
        enabled: boolean;
    }[]>;
    setFlag(key: string, enabled: boolean, workspaceId?: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        workspaceId: string | null;
        key: string;
        payload: import("@prisma/client/runtime/library").JsonValue | null;
        enabled: boolean;
    }>;
    suspendTenant(id: string): Promise<{
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
    unsuspendTenant(id: string): Promise<{
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
    softDeleteTenant(id: string): Promise<{
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
}
