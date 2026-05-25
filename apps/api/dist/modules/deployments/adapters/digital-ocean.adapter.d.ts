import { ConfigService } from '@nestjs/config';
import type { DeploymentAdapter, DeploymentInput, DeploymentResult } from './adapter.interface';
export declare class DigitalOceanAdapter implements DeploymentAdapter {
    private readonly config;
    private readonly logger;
    constructor(config: ConfigService);
    deploy(input: DeploymentInput): Promise<DeploymentResult>;
    private resolveConfig;
}
