import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantsService } from '../tenants/tenants.service';
import { UpdateLeadDto } from './dto/update-lead.dto';
export declare class LeadsService {
    private readonly prisma;
    private readonly tenants;
    constructor(prisma: PrismaService, tenants: TenantsService);
    list(userId: string, tenantId: string, opts?: {
        status?: string;
        limit?: number;
    }): Promise<{
        name: string | null;
        email: string | null;
        status: string;
        id: string;
        createdAt: Date;
        data: Prisma.JsonValue | null;
        phone: string | null;
        updatedAt: Date;
        deletedAt: Date | null;
        tenantId: string;
        source: string | null;
    }[]>;
    update(userId: string, tenantId: string, leadId: string, dto: UpdateLeadDto): Promise<{
        name: string | null;
        email: string | null;
        status: string;
        id: string;
        createdAt: Date;
        data: Prisma.JsonValue | null;
        phone: string | null;
        updatedAt: Date;
        deletedAt: Date | null;
        tenantId: string;
        source: string | null;
    }>;
    remove(userId: string, tenantId: string, leadId: string): Promise<void>;
}
