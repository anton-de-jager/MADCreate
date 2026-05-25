import { PrismaService } from '../../prisma/prisma.service';
import { TenantsService } from '../tenants/tenants.service';
import type { Prisma } from '@prisma/client';
export declare class ThemesService {
    private readonly prisma;
    private readonly tenants;
    constructor(prisma: PrismaService, tenants: TenantsService);
    list(userId: string, tenantId: string): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        tenantId: string;
        tokens: Prisma.JsonValue;
        isActive: boolean;
    }[]>;
    get(userId: string, themeId: string): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        tenantId: string;
        tokens: Prisma.JsonValue;
        isActive: boolean;
    }>;
    create(userId: string, tenantId: string, dto: {
        name: string;
        tokens: unknown;
    }): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        tenantId: string;
        tokens: Prisma.JsonValue;
        isActive: boolean;
    }>;
    update(userId: string, themeId: string, patch: {
        name?: string;
        tokens?: unknown;
        isActive?: boolean;
    }): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        tenantId: string;
        tokens: Prisma.JsonValue;
        isActive: boolean;
    }>;
    remove(userId: string, themeId: string): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        tenantId: string;
        tokens: Prisma.JsonValue;
        isActive: boolean;
    }>;
}
