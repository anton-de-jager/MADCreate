import { Observable } from 'rxjs';
import { Request } from 'express';
import { AiService } from './ai.service';
import { SubmitGenerationDto } from './dto/submit-generation.dto';
import type { AIGenerateRequest, JwtPayload } from '@madcreate/shared';
declare class GenerateDto implements AIGenerateRequest {
    kind: AIGenerateRequest['kind'];
    promptKey?: string;
    model?: string;
    variables?: Record<string, unknown>;
    systemPrompt?: string;
    userPrompt?: string;
    temperature?: number;
    maxTokens?: number;
    jsonMode?: boolean;
    provider?: AIGenerateRequest['provider'];
}
export declare class AiController {
    private readonly ai;
    constructor(ai: AiService);
    events(): Observable<MessageEvent>;
    enqueue(u: JwtPayload, tenantId: string, dto: GenerateDto): Promise<{
        error: string | null;
        status: import("@prisma/client").$Enums.AIGenerationStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        kind: import("@prisma/client").$Enums.AIGenerationKind;
        startedAt: Date | null;
        finishedAt: Date | null;
        durationMs: number | null;
        tokensIn: number | null;
        tokensOut: number | null;
        requesterId: string | null;
        promptId: string | null;
        provider: import("@prisma/client").$Enums.AIProvider;
        model: string;
        input: import("@prisma/client/runtime/library").JsonValue;
        output: import("@prisma/client/runtime/library").JsonValue | null;
        rawOutput: string | null;
        costUsd: import("@prisma/client/runtime/library").Decimal | null;
    }>;
    list(u: JwtPayload, tenantId: string): Promise<{
        error: string | null;
        status: import("@prisma/client").$Enums.AIGenerationStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        kind: import("@prisma/client").$Enums.AIGenerationKind;
        startedAt: Date | null;
        finishedAt: Date | null;
        durationMs: number | null;
        tokensIn: number | null;
        tokensOut: number | null;
        requesterId: string | null;
        promptId: string | null;
        provider: import("@prisma/client").$Enums.AIProvider;
        model: string;
        input: import("@prisma/client/runtime/library").JsonValue;
        output: import("@prisma/client/runtime/library").JsonValue | null;
        rawOutput: string | null;
        costUsd: import("@prisma/client/runtime/library").Decimal | null;
    }[]>;
    get(u: JwtPayload, id: string, req: Request & {
        worker?: boolean;
    }): Promise<{
        error: string | null;
        status: import("@prisma/client").$Enums.AIGenerationStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        kind: import("@prisma/client").$Enums.AIGenerationKind;
        startedAt: Date | null;
        finishedAt: Date | null;
        durationMs: number | null;
        tokensIn: number | null;
        tokensOut: number | null;
        requesterId: string | null;
        promptId: string | null;
        provider: import("@prisma/client").$Enums.AIProvider;
        model: string;
        input: import("@prisma/client/runtime/library").JsonValue;
        output: import("@prisma/client/runtime/library").JsonValue | null;
        rawOutput: string | null;
        costUsd: import("@prisma/client/runtime/library").Decimal | null;
    }>;
    submit(u: JwtPayload, id: string, body: SubmitGenerationDto, req: Request & {
        worker?: boolean;
    }): Promise<{
        siteId: string;
        themeId: string;
        pageCount: number;
        generationId: string;
        tenantId: string;
    }>;
}
export {};
