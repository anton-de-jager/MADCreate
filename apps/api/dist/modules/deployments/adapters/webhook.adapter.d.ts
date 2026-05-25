import type { DeploymentAdapter, DeploymentInput, DeploymentResult } from './adapter.interface';
export declare class WebhookAdapter implements DeploymentAdapter {
    deploy(input: DeploymentInput): Promise<DeploymentResult>;
}
