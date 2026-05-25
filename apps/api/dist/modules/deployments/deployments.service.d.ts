import { Queue } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantsService } from '../tenants/tenants.service';
import { DeploymentTarget, Prisma } from '@prisma/client';
export interface CreateDeploymentDto {
    siteId?: string;
    target: DeploymentTarget;
    config?: Record<string, unknown>;
}
export declare class DeploymentsService {
    private readonly prisma;
    private readonly tenants;
    private readonly queue;
    private readonly events;
    constructor(prisma: PrismaService, tenants: TenantsService, queue: Queue);
    onChange(listener: () => void): () => void;
    emitChange(): void;
    list(userId: string, tenantId: string): Promise<{
        log: string | null;
        status: import("@prisma/client").$Enums.DeploymentStatus;
        config: Prisma.JsonValue | null;
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
    get(userId: string, id: string): Promise<{
        log: string | null;
        status: import("@prisma/client").$Enums.DeploymentStatus;
        config: Prisma.JsonValue | null;
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
    trigger(userId: string, tenantId: string, dto: CreateDeploymentDto): Promise<{
        log: string | null;
        status: import("@prisma/client").$Enums.DeploymentStatus;
        config: Prisma.JsonValue | null;
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
    cancel(userId: string, id: string): Promise<{
        log: string | null;
        status: import("@prisma/client").$Enums.DeploymentStatus;
        config: Prisma.JsonValue | null;
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
