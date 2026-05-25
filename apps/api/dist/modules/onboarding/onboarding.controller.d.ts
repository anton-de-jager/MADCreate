import { OnboardingService } from './onboarding.service';
import type { JwtPayload, OnboardingAnswers } from '@madcreate/shared';
export declare class OnboardingController {
    private readonly onboarding;
    constructor(onboarding: OnboardingService);
    get(u: JwtPayload, tenantId: string): Promise<OnboardingAnswers>;
    save(u: JwtPayload, tenantId: string, answers: OnboardingAnswers): Promise<{
        name: string;
        status: import("@prisma/client").$Enums.SiteStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        description: string | null;
        slug: string;
        workspaceId: string;
        industry: string | null;
        onboarding: import("@prisma/client/runtime/library").JsonValue | null;
        branding: import("@prisma/client/runtime/library").JsonValue | null;
        activeSiteId: string | null;
        activeThemeId: string | null;
    }>;
    generate(u: JwtPayload, tenantId: string): Promise<{
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
}
