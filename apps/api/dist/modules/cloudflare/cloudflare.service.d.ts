import { ConfigService } from '@nestjs/config';
export declare class CloudflareService {
    private readonly config;
    private readonly logger;
    private readonly base;
    constructor(config: ConfigService);
    private creds;
    isConfigured(): boolean;
    upsertRecord(input: {
        type: 'A' | 'AAAA' | 'CNAME' | 'TXT';
        name: string;
        content: string;
        ttl?: number;
        proxied?: boolean;
    }): Promise<string | null>;
    deleteRecord(recordId: string): Promise<boolean>;
    wireCustomDomain(hostname: string, platformHost: string, verifyToken: string): Promise<{
        cnameId: string | null;
        txtId: string | null;
    }>;
    ensureUniversalSsl(): Promise<boolean>;
    private api;
}
