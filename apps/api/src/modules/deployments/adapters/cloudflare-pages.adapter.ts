import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { StaticExportAdapter } from './static-export.adapter';
import type { DeploymentAdapter, DeploymentInput, DeploymentResult } from './adapter.interface';

interface CFConfig {
  apiToken: string;
  accountId: string;
  projectName: string;
}

/**
 * Cloudflare Pages direct-upload deployment.
 * Uses the v4 API: POST /accounts/:id/pages/projects/:project/deployments
 * with multipart form-data containing every file in the build.
 */
@Injectable()
export class CloudflarePagesAdapter implements DeploymentAdapter {
  private readonly logger = new Logger(CloudflarePagesAdapter.name);

  constructor(
    private readonly config: ConfigService,
    private readonly staticExport: StaticExportAdapter,
  ) {}

  async deploy(input: DeploymentInput): Promise<DeploymentResult> {
    const cfg = this.resolveConfig(input.config?.cloudflare as Partial<CFConfig> | undefined);
    if (!cfg) {
      throw new Error(
        'Cloudflare Pages not configured. Provide deployment.config.cloudflare ({ accountId, projectName }) ' +
        'or set CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_PROJECT_NAME, with CLOUDFLARE_API_TOKEN.',
      );
    }

    const exportResult = await this.staticExport.deploy(input);
    const localDir = exportResult.artefactUrl?.replace(/^file:\/\//, '');
    if (!localDir) throw new Error('Static export produced no local artefact.');

    const files = await this.collectFiles(localDir);
    const form = new FormData();
    for (const f of files) {
      form.append(f.relPath, new Blob([new Uint8Array(f.bytes)], { type: f.contentType }), f.relPath);
    }
    form.append('manifest', JSON.stringify({}));

    const url = `https://api.cloudflare.com/client/v4/accounts/${cfg.accountId}/pages/projects/${cfg.projectName}/deployments`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${cfg.apiToken}` },
      body: form,
    });
    const json = await res.json() as { success: boolean; errors?: Array<{ message: string }>; result?: { url?: string; id?: string } };

    if (!res.ok || !json.success) {
      const msg = json.errors?.map((e) => e.message).join('; ') ?? `HTTP ${res.status}`;
      throw new Error(`Cloudflare Pages upload failed: ${msg}`);
    }

    return {
      artefactUrl: json.result?.url ?? undefined,
      version: json.result?.id ?? undefined,
      log: `${exportResult.log ?? ''}\n✓ Cloudflare Pages deployment ${json.result?.id} → ${json.result?.url}`,
    };
  }

  private async collectFiles(
    dir: string,
    base = dir,
  ): Promise<Array<{ relPath: string; bytes: Buffer; contentType: string }>> {
    const out: Array<{ relPath: string; bytes: Buffer; contentType: string }> = [];
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) out.push(...(await this.collectFiles(full, base)));
      else {
        const rel = path.relative(base, full).split(path.sep).join('/');
        out.push({ relPath: rel, bytes: await fs.readFile(full), contentType: guessType(rel) });
      }
    }
    return out;
  }

  private resolveConfig(s: Partial<CFConfig> | undefined): CFConfig | null {
    const cfg: CFConfig = {
      apiToken: s?.apiToken ?? this.config.get<string>('deployments.cloudflarePages.apiToken') ?? '',
      accountId: s?.accountId ?? this.config.get<string>('deployments.cloudflarePages.accountId') ?? '',
      projectName: s?.projectName ?? this.config.get<string>('deployments.cloudflarePages.projectName') ?? '',
    };
    return cfg.apiToken && cfg.accountId && cfg.projectName ? cfg : null;
  }
}

function guessType(p: string): string {
  const ext = path.extname(p).toLowerCase();
  return ({
    '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
    '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif',
    '.woff': 'font/woff', '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.txt': 'text/plain',
    '.xml': 'application/xml', '.map': 'application/json',
  }[ext]) ?? 'application/octet-stream';
}
