import type { Request } from 'express';
import { BillingService } from './billing.service';
import { CheckoutDto, PortalDto } from './dto/billing.dto';
export declare class BillingController {
    private readonly billing;
    constructor(billing: BillingService);
    plans(): import("@prisma/client").Prisma.PrismaPromise<{
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
    checkout(body: CheckoutDto): Promise<{
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
    portal(body: PortalDto): Promise<{
        portalUrl: string | null;
    }>;
    stripeWebhook(req: Request, sig: string): Promise<{
        received: true;
        type?: string;
    }>;
}
