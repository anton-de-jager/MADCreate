export interface DeploymentInput {
  tenantId: string;
  siteId?: string | null;
  config: Record<string, unknown>;
}

export interface DeploymentResult {
  artefactUrl?: string;
  log?: string;
  version?: string;
}

export interface DeploymentAdapter {
  deploy(input: DeploymentInput): Promise<DeploymentResult>;
}
