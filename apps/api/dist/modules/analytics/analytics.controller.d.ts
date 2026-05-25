import type { Request } from 'express';
import { AnalyticsService } from './analytics.service';
import { IngestEventDto } from './dto/ingest-event.dto';
import type { JwtPayload } from '@madcreate/shared';
export declare class AnalyticsController {
    private readonly analytics;
    constructor(analytics: AnalyticsService);
    ingest(req: Request, body: IngestEventDto, tenantId?: string): Promise<{
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
        payload: import("@prisma/client/runtime/library").JsonValue | null;
        occurredAt: Date;
    }> | {
        ok: boolean;
    };
    summary(u: JwtPayload, tenantId: string, days?: string): Promise<{
        since: Date;
        views: number;
        conversions: number;
        aiGenerations: number;
        deployments: number;
    }>;
    timeline(u: JwtPayload, tenantId: string, days?: string): Promise<{
        since: Date;
        byKind: {
            kind: import("@prisma/client").$Enums.AnalyticsEventKind;
            count: number;
        }[];
    }>;
    timeseries(u: JwtPayload, tenantId: string, days?: string): Promise<{
        day: string;
        views: number;
        conversions: number;
    }[]>;
    topPages(u: JwtPayload, tenantId: string, days?: string): Promise<{
        path: string;
        views: number;
        conversions: number;
        conversionRate: number;
    }[]>;
    referrers(u: JwtPayload, tenantId: string, days?: string): Promise<{
        referrer: string;
        count: number;
    }[]>;
}
