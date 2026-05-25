import type { Request } from 'express';
import { FormsService } from './forms.service';
import { SubmitFormDto } from './dto/submit-form.dto';
import type { JwtPayload } from '@madcreate/shared';
export declare class FormsController {
    private readonly service;
    constructor(service: FormsService);
    submit(dto: SubmitFormDto, tenantId: string, req: Request): Promise<{
        submissionId: string;
        leadId: string | null;
    }>;
    list(u: JwtPayload, tenantId: string): Promise<{
        id: string;
        userAgent: string | null;
        ip: string | null;
        createdAt: Date;
        data: import("@prisma/client/runtime/library").JsonValue;
        tenantId: string;
        pageSlug: string | null;
        formKey: string;
        spamScore: number | null;
    }[]>;
}
