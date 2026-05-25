import { ConfigService } from '@nestjs/config';
import { StaticExportAdapter } from './static-export.adapter';
import type { DeploymentAdapter, DeploymentInput, DeploymentResult } from './adapter.interface';
export declare class CloudflarePagesAdapter implements DeploymentAdapter {
    private readonly config;
    private readonly staticExport;
    private readonly logger;
    constructor(config: ConfigService, staticExport: StaticExportAdapter);
    deploy(input: DeploymentInput): Promise<DeploymentResult>;
    private collectFiles;
    private resolveConfig;
}
