import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantsService } from '../tenants/tenants.service';
export declare class LayoutsService {
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
        schema: Prisma.JsonValue;
        isDefault: boolean;
    }[]>;
    get(userId: string, id: string): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        tenantId: string;
        schema: Prisma.JsonValue;
        isDefault: boolean;
    }>;
    create(userId: string, tenantId: string, dto: {
        name: string;
        schema: unknown;
        isDefault?: boolean;
    }): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        tenantId: string;
        schema: Prisma.JsonValue;
        isDefault: boolean;
    }>;
    update(userId: string, id: string, patch: {
        name?: string;
        schema?: unknown;
        isDefault?: boolean;
    }): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        tenantId: string;
        schema: Prisma.JsonValue;
        isDefault: boolean;
    }>;
}
