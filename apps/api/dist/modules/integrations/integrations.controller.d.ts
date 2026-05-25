import { IntegrationsService } from './integrations.service';
import { InstallIntegrationDto } from './dto/install-integration.dto';
import type { JwtPayload } from '@madcreate/shared';
export declare class IntegrationsController {
    private readonly integrations;
    constructor(integrations: IntegrationsService);
    catalog(): import("@prisma/client").Prisma.PrismaPromise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        category: import("@prisma/client").$Enums.IntegrationCategory;
        key: string;
        iconUrl: string | null;
        configSchema: import("@prisma/client/runtime/library").JsonValue | null;
        isEnabled: boolean;
        popular: boolean;
    }[]>;
    suggest(industry?: string): {
        industry: string | null;
        keys: string[];
    };
    installed(user: JwtPayload, tenantId: string): Promise<({
        catalog: {
            name: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            category: import("@prisma/client").$Enums.IntegrationCategory;
            key: string;
            iconUrl: string | null;
            configSchema: import("@prisma/client/runtime/library").JsonValue | null;
            isEnabled: boolean;
            popular: boolean;
        };
    } & {
        config: import("@prisma/client/runtime/library").JsonValue;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        tenantId: string;
        isEnabled: boolean;
        catalogId: string;
        lastSyncedAt: Date | null;
        lastError: string | null;
    })[]>;
    install(user: JwtPayload, tenantId: string, dto: InstallIntegrationDto): Promise<{
        config: import("@prisma/client/runtime/library").JsonValue;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        tenantId: string;
        isEnabled: boolean;
        catalogId: string;
        lastSyncedAt: Date | null;
        lastError: string | null;
    }>;
    uninstall(user: JwtPayload, tenantId: string, id: string): Promise<{
        config: import("@prisma/client/runtime/library").JsonValue;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        tenantId: string;
        isEnabled: boolean;
        catalogId: string;
        lastSyncedAt: Date | null;
        lastError: string | null;
    }>;
}
