import { Role } from '@prisma/client';
import { WorkspacesService } from './workspaces.service';
import type { JwtPayload } from '@madcreate/shared';
declare class UpdateWorkspaceDto {
    name?: string;
    logoUrl?: string;
    description?: string;
    billingEmail?: string;
}
declare class AcceptInviteDto {
    token: string;
}
declare class InviteDto {
    email: string;
    role: Role;
}
export declare class WorkspacesController {
    private readonly workspaces;
    constructor(workspaces: WorkspacesService);
    acceptInvite(user: JwtPayload, dto: AcceptInviteDto): Promise<{
        workspace: {
            name: string;
            id: string;
            slug: string;
        };
        alreadyMember: boolean;
    }>;
    list(user: JwtPayload): Promise<{
        role: import("@prisma/client").$Enums.Role;
        name: string;
        id: string;
        createdAt: Date;
        slug: string;
        logoUrl: string | null;
        planId: string | null;
    }[]>;
    get(user: JwtPayload, id: string): Promise<{
        plan: {
            name: string;
            isPublic: boolean;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            code: string;
            description: string | null;
            priceMonthlyUsd: import("@prisma/client/runtime/library").Decimal;
            priceAnnualUsd: import("@prisma/client/runtime/library").Decimal;
            trialDays: number;
            limits: import("@prisma/client/runtime/library").JsonValue;
            features: import("@prisma/client/runtime/library").JsonValue;
            sortOrder: number;
        } | null;
        subscription: {
            status: import("@prisma/client").$Enums.SubscriptionStatus;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            planId: string;
            workspaceId: string;
            interval: import("@prisma/client").$Enums.BillingInterval;
            currentPeriodStart: Date;
            currentPeriodEnd: Date;
            cancelAtPeriodEnd: boolean;
            cancelledAt: Date | null;
            externalCustomerId: string | null;
            externalSubscriptionId: string | null;
        } | null;
        members: ({
            user: {
                email: string;
                id: string;
                firstName: string | null;
                lastName: string | null;
            };
        } & {
            status: import("@prisma/client").$Enums.WorkspaceMemberStatus;
            role: import("@prisma/client").$Enums.Role;
            id: string;
            userId: string;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            invitedAt: Date;
            joinedAt: Date | null;
            workspaceId: string;
        })[];
        tenants: {
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
        }[];
    } & {
        name: string;
        settings: import("@prisma/client/runtime/library").JsonValue | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        description: string | null;
        slug: string;
        logoUrl: string | null;
        ownerUserId: string;
        planId: string | null;
        trialEndsAt: Date | null;
        billingEmail: string | null;
        defaultLocale: string;
        defaultTimezone: string;
    }>;
    update(user: JwtPayload, id: string, dto: UpdateWorkspaceDto): Promise<{
        name: string;
        settings: import("@prisma/client/runtime/library").JsonValue | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        description: string | null;
        slug: string;
        logoUrl: string | null;
        ownerUserId: string;
        planId: string | null;
        trialEndsAt: Date | null;
        billingEmail: string | null;
        defaultLocale: string;
        defaultTimezone: string;
    }>;
    invite(user: JwtPayload, id: string, dto: InviteDto): Promise<{
        email: string;
        role: import("@prisma/client").$Enums.Role;
        id: string;
        tokenHash: string;
        expiresAt: Date;
        createdAt: Date;
        workspaceId: string;
        invitedById: string;
        acceptedAt: Date | null;
    }>;
    members(user: JwtPayload, id: string): Promise<{
        userId: string;
        role: import("@prisma/client").$Enums.Role;
        joinedAt: Date;
        user: {
            email: string;
            id: string;
            firstName: string | null;
            lastName: string | null;
            avatarUrl: string | null;
        };
    }[]>;
    stats(user: JwtPayload, id: string): Promise<{
        tenants: number;
        sites: number;
        generations: number;
        deployments: number;
    }>;
    leave(user: JwtPayload, id: string): Promise<{
        left: boolean;
    }>;
}
export {};
