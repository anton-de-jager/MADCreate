import { ConfigService } from '@nestjs/config';
import { StaticExportAdapter } from './static-export.adapter';
import type { DeploymentAdapter, DeploymentInput, DeploymentResult } from './adapter.interface';
export declare class FtpAdapter implements DeploymentAdapter {
    private readonly configService;
    private readonly staticExport;
    private readonly logger;
    constructor(configService: ConfigService, staticExport: StaticExportAdapter);
    deploy(input: DeploymentInput): Promise<DeploymentResult>;
    private summarize;
    private resolveConfig;
}
