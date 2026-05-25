import { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { BillingInterval } from '@prisma/client';
export declare class BillingService implements OnModuleInit {
    private readonly prisma;
    private readonly config;
    private readonly logger;
    private stripe?;
    constructor(prisma: PrismaService, config: ConfigService);
    onModuleInit(): void;
    publicPlans(): import("@prisma/client").Prisma.PrismaPromise<{
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
    }[]>;
    subscription(workspaceId: string): Promise<({
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
        };
    } & {
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
    }) | null>;
    startCheckout(workspaceId: string, planCode: string, interval?: BillingInterval): Promise<{
        checkoutUrl: null;
        message: string;
        planCode: string;
        workspaceId: string;
        sessionId?: undefined;
    } | {
        checkoutUrl: string | null;
        sessionId: string;
        message?: undefined;
        planCode?: undefined;
        workspaceId?: undefined;
    }>;
    handleWebhook(rawBody: Buffer, signature: string): Promise<{
        received: true;
        type?: string;
    }>;
    createPortalSession(workspaceId: string): Promise<{
        portalUrl: string | null;
    }>;
    private upsertSubscriptionFromSession;
    private syncSubscription;
    private mapStatus;
}
