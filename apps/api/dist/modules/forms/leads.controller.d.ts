import { LeadsService } from './leads.service';
import { UpdateLeadDto } from './dto/update-lead.dto';
import type { JwtPayload } from '@madcreate/shared';
export declare class LeadsController {
    private readonly service;
    constructor(service: LeadsService);
    list(u: JwtPayload, tenantId: string, status?: string): Promise<{
        name: string | null;
        email: string | null;
        status: string;
        id: string;
        createdAt: Date;
        data: import("@prisma/client/runtime/library").JsonValue | null;
        phone: string | null;
        updatedAt: Date;
        deletedAt: Date | null;
        tenantId: string;
        source: string | null;
    }[]>;
    update(u: JwtPayload, tenantId: string, id: string, dto: UpdateLeadDto): Promise<{
        name: string | null;
        email: string | null;
        status: string;
        id: string;
        createdAt: Date;
        data: import("@prisma/client/runtime/library").JsonValue | null;
        phone: string | null;
        updatedAt: Date;
        deletedAt: Date | null;
        tenantId: string;
        source: string | null;
    }>;
}
