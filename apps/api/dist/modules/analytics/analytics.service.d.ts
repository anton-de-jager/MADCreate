import { PrismaService } from '../../prisma/prisma.service';
import { TenantsService } from '../tenants/tenants.service';
import { AnalyticsEventKind, Prisma } from '@prisma/client';
export declare class AnalyticsService {
    private readonly prisma;
    private readonly tenants;
    constructor(prisma: PrismaService, tenants: TenantsService);
    ingest(tenantId: string, evt: {
        kind: AnalyticsEventKind;
        pageSlug?: string;
        userKey?: string;
        sessionKey?: string;
        referrer?: string;
        userAgent?: string;
        ip?: string;
        payload?: unknown;
    }): Promise<{
        id: string;
        userAgent: string | null;
        ip: string | null;
        tenantId: string;
        kind: import("@prisma/client").$Enums.AnalyticsEventKind;
        pageSlug: string | null;
        userKey: string | null;
        sessionKey: string | null;
        referrer: string | null;
        country: string | null;
        payload: Prisma.JsonValue | null;
        occurredAt: Date;
    }>;
    summary(userId: string, tenantId: string, days?: number): Promise<{
        since: Date;
        views: number;
        conversions: number;
        aiGenerations: number;
        deployments: number;
    }>;
    timeline(userId: string, tenantId: string, days?: number): Promise<{
        since: Date;
        byKind: {
            kind: import("@prisma/client").$Enums.AnalyticsEventKind;
            count: number;
        }[];
    }>;
    timeseries(userId: string, tenantId: string, days?: number): Promise<{
        day: string;
        views: number;
        conversions: number;
    }[]>;
    topPages(userId: string, tenantId: string, days?: number, limit?: number): Promise<{
        path: string;
        views: number;
        conversions: number;
        conversionRate: number;
    }[]>;
    referrers(userId: string, tenantId: string, days?: number, limit?: number): Promise<{
        referrer: string;
        count: number;
    }[]>;
}
