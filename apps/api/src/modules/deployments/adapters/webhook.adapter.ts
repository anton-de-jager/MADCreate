import { Injectable } from '@nestjs/common';
import type { DeploymentAdapter, DeploymentInput, DeploymentResult } from './adapter.interface';

// POSTs the deployment payload to a tenant-configured webhook (Zapier, n8n, custom CI, etc).
@Injectable()
export class WebhookAdapter implements DeploymentAdapter {
  async deploy(input: DeploymentInput): Promise<DeploymentResult> {
    const cfg = input.config as { url?: string; method?: 'POST' | 'PUT'; headers?: Record<string, string> };
    if (!cfg?.url) return { log: 'No webhook URL configured.' };

    const res = await fetch(cfg.url, {
      method: cfg.method ?? 'POST',
      headers: { 'content-type': 'application/json', ...(cfg.headers ?? {}) },
      body: JSON.stringify({ tenantId: input.tenantId, siteId: input.siteId, triggeredAt: new Date().toISOString() }),
    });
    const text = await res.text().catch(() => '');
    if (!res.ok) throw new Error(`Webhook responded ${res.status}: ${text.slice(0, 500)}`);
    return { log: `Webhook ${cfg.url} → ${res.status}`, artefactUrl: cfg.url };
  }
}
