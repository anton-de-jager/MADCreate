import { Observable } from 'rxjs';
import { DeploymentTarget } from '@prisma/client';
import { DeploymentsService } from './deployments.service';
import type { JwtPayload } from '@madcreate/shared';
declare class TriggerDeploymentDto {
    siteId?: string;
    target: DeploymentTarget;
    config?: Record<string, unknown>;
}
export declare class DeploymentsController {
    private readonly deployments;
    constructor(deployments: DeploymentsService);
    events(): Observable<MessageEvent>;
    list(u: JwtPayload, tenantId: string): Promise<{
        log: string | null;
        status: import("@prisma/client").$Enums.DeploymentStatus;
        config: import("@prisma/client/runtime/library").JsonValue | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        version: string | null;
        tenantId: string;
        siteId: string | null;
        target: import("@prisma/client").$Enums.DeploymentTarget;
        triggeredBy: string | null;
        artefactUrl: string | null;
        startedAt: Date | null;
        finishedAt: Date | null;
        durationMs: number | null;
    }[]>;
    get(u: JwtPayload, id: string): Promise<{
        log: string | null;
        status: import("@prisma/client").$Enums.DeploymentStatus;
        config: import("@prisma/client/runtime/library").JsonValue | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        version: string | null;
        tenantId: string;
        siteId: string | null;
        target: import("@prisma/client").$Enums.DeploymentTarget;
        triggeredBy: string | null;
        artefactUrl: string | null;
        startedAt: Date | null;
        finishedAt: Date | null;
        durationMs: number | null;
    }>;
    trigger(u: JwtPayload, tenantId: string, dto: TriggerDeploymentDto): Promise<{
        log: string | null;
        status: import("@prisma/client").$Enums.DeploymentStatus;
        config: import("@prisma/client/runtime/library").JsonValue | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        version: string | null;
        tenantId: string;
        siteId: string | null;
        target: import("@prisma/client").$Enums.DeploymentTarget;
        triggeredBy: string | null;
        artefactUrl: string | null;
        startedAt: Date | null;
        finishedAt: Date | null;
        durationMs: number | null;
    }>;
    cancel(u: JwtPayload, id: string): Promise<{
        log: string | null;
        status: import("@prisma/client").$Enums.DeploymentStatus;
        config: import("@prisma/client/runtime/library").JsonValue | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        version: string | null;
        tenantId: string;
        siteId: string | null;
        target: import("@prisma/client").$Enums.DeploymentTarget;
        triggeredBy: string | null;
        artefactUrl: string | null;
        startedAt: Date | null;
        finishedAt: Date | null;
        durationMs: number | null;
    }>;
}
export {};
