import { AnalyticsEventKind } from '@prisma/client';
export declare class IngestEventDto {
    kind: AnalyticsEventKind;
    pageSlug?: string;
    userKey?: string;
    sessionKey?: string;
    payload?: unknown;
}
