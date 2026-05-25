import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { DeploymentAdapter, DeploymentInput, DeploymentResult } from './adapter.interface';

interface DOConfig {
  token: string;
  appId: string;
}

/**
 * DigitalOcean App Platform deployment trigger.
 * Calls POST /v2/apps/:app_id/deployments to push the app's source
 * (which the App Platform already has a Git or container source for).
 */
@Injectable()
export class DigitalOceanAdapter implements DeploymentAdapter {
  private readonly logger = new Logger(DigitalOceanAdapter.name);

  constructor(private readonly config: ConfigService) {}

  async deploy(input: DeploymentInput): Promise<DeploymentResult> {
    const cfg = this.resolveConfig(input.config?.digitalOcean as Partial<DOConfig> | undefined);
    if (!cfg) {
      throw new Error('DigitalOcean not configured. Set DIGITALOCEAN_TOKEN + DIGITALOCEAN_APP_ID.');
    }

    const res = await fetch(`https://api.digitalocean.com/v2/apps/${cfg.appId}/deployments`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${cfg.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ force_build: true }),
    });
    const json = await res.json() as { deployment?: { id: string; phase: string }; id?: string; message?: string };
    if (!res.ok) throw new Error(`DigitalOcean deploy failed: ${json.message ?? res.status}`);

    return {
      version: json.deployment?.id ?? json.id,
      log: `✓ DigitalOcean App Platform deployment ${json.deployment?.id} (phase: ${json.deployment?.phase}) for tenant ${input.tenantId}`,
    };
  }

  private resolveConfig(s: Partial<DOConfig> | undefined): DOConfig | null {
    const cfg: DOConfig = {
      token: s?.token ?? this.config.get<string>('deployments.digitalOcean.token') ?? '',
      appId: s?.appId ?? this.config.get<string>('deployments.digitalOcean.appId') ?? '',
    };
    return cfg.token && cfg.appId ? cfg : null;
  }
}
