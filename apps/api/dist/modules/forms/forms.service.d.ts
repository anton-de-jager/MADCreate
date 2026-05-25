import type { Request } from 'express';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantsService } from '../tenants/tenants.service';
import { SubmitFormDto } from './dto/submit-form.dto';
export declare class FormsService {
    private readonly prisma;
    private readonly tenants;
    constructor(prisma: PrismaService, tenants: TenantsService);
    submit(tenantId: string, dto: SubmitFormDto, req: Request): Promise<{
        submissionId: string;
        leadId: string | null;
    }>;
    listSubmissions(userId: string, tenantId: string, limit?: number): Promise<{
        id: string;
        userAgent: string | null;
        ip: string | null;
        createdAt: Date;
        data: Prisma.JsonValue;
        tenantId: string;
        pageSlug: string | null;
        formKey: string;
        spamScore: number | null;
    }[]>;
}
