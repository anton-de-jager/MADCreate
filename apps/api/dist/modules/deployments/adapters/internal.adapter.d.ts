import { PrismaService } from '../../../prisma/prisma.service';
import type { DeploymentAdapter, DeploymentInput, DeploymentResult } from './adapter.interface';
export declare class InternalAdapter implements DeploymentAdapter {
    private readonly prisma;
    constructor(prisma: PrismaService);
    deploy(input: DeploymentInput): Promise<DeploymentResult>;
}
