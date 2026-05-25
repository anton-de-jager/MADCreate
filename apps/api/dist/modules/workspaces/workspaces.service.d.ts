import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { Role } from '@prisma/client';
export declare class WorkspacesService {
    private readonly prisma;
    private readonly mail;
    private readonly config;
    private readonly logger;
    constructor(prisma: PrismaService, mail: MailService, config: ConfigService);
    listMine(userId: string): Promise<{
        role: import("@prisma/client").$Enums.Role;
        name: string;
        id: string;
        createdAt: Date;
        slug: string;
        logoUrl: string | null;
        planId: string | null;
    }[]>;
    get(userId: string, workspaceId: string): Promise<{
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
    update(userId: string, workspaceId: string, patch: {
        name?: string;
        logoUrl?: string;
        description?: string;
        billingEmail?: string;
    }): Promise<{
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
    invite(userId: string, workspaceId: string, dto: {
        email: string;
        role: Role;
    }): Promise<{
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
    stats(userId: string, workspaceId: string): Promise<{
        tenants: number;
        sites: number;
        generations: number;
        deployments: number;
    }>;
    members(userId: string, workspaceId: string): Promise<{
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
    leave(userId: string, workspaceId: string): Promise<{
        left: boolean;
    }>;
    acceptInvite(userId: string, token: string): Promise<{
        workspace: {
            name: string;
            id: string;
            slug: string;
        };
        alreadyMember: boolean;
    }>;
    assertMember(userId: string, workspaceId: string): Promise<Role>;
    assertRole(userId: string, workspaceId: string, allowed: Role[]): Promise<Role>;
}
