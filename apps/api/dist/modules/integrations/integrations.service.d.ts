import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantsService } from '../tenants/tenants.service';
export declare class IntegrationsService {
    private readonly prisma;
    private readonly tenants;
    constructor(prisma: PrismaService, tenants: TenantsService);
    catalog(): Prisma.PrismaPromise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        category: import("@prisma/client").$Enums.IntegrationCategory;
        key: string;
        iconUrl: string | null;
        configSchema: Prisma.JsonValue | null;
        isEnabled: boolean;
        popular: boolean;
    }[]>;
    installed(userId: string, tenantId: string): Promise<({
        catalog: {
            name: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            category: import("@prisma/client").$Enums.IntegrationCategory;
            key: string;
            iconUrl: string | null;
            configSchema: Prisma.JsonValue | null;
            isEnabled: boolean;
            popular: boolean;
        };
    } & {
        config: Prisma.JsonValue;
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
    install(userId: string, tenantId: string, dto: {
        catalogKey: string;
        config?: Record<string, unknown>;
    }): Promise<{
        config: Prisma.JsonValue;
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
    uninstall(userId: string, tenantId: string, id: string): Promise<{
        config: Prisma.JsonValue;
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
