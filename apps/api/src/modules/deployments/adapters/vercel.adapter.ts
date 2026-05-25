import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { createHash } from 'node:crypto';
import { StaticExportAdapter } from './static-export.adapter';
import type { DeploymentAdapter, DeploymentInput, DeploymentResult } from './adapter.interface';

interface VercelConfig {
  token: string;
  projectId: string;
  teamId?: string;
}

/**
 * Vercel deployment via the v13 deployments API.
 * Two-step: (1) upload each file (POST /v2/files with the sha1 + content),
 * (2) create the deployment referencing those files.
 */
@Injectable()
export class VercelAdapter implements DeploymentAdapter {
  private readonly logger = new Logger(VercelAdapter.name);

  constructor(
    private readonly config: ConfigService,
    private readonly staticExport: StaticExportAdapter,
  ) {}

  async deploy(input: DeploymentInput): Promise<DeploymentResult> {
    const cfg = this.resolveConfig(input.config?.vercel as Partial<VercelConfig> | undefined);
    if (!cfg) {
      throw new Error('Vercel not configured. Set VERCEL_TOKEN + VERCEL_PROJECT_ID.');
    }

    const exportResult = await this.staticExport.deploy(input);
    const localDir = exportResult.artefactUrl?.replace(/^file:\/\//, '');
    if (!localDir) throw new Error('Static export produced no local artefact.');

    const files = await this.collectFiles(localDir);
    const teamQ = cfg.teamId ? `?teamId=${cfg.teamId}` : '';
    const uploaded: Array<{ file: string; sha: string; size: number }> = [];

    for (const f of files) {
      const sha = createHash('sha1').update(f.bytes).digest('hex');
      const res = await fetch(`https://api.vercel.com/v2/files${teamQ}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${cfg.token}`,
          'Content-Type': 'application/octet-stream',
          'x-vercel-digest': sha,
        },
        body: new Uint8Array(f.bytes),
      });
      if (!res.ok) throw new Error(`Vercel upload failed for ${f.relPath}: ${res.status}`);
      uploaded.push({ file: f.relPath, sha, size: f.bytes.length });
    }

    const deployRes = await fetch(`https://api.vercel.com/v13/deployments${teamQ}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${cfg.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `madcreate-${input.tenantId}`,
        project: cfg.projectId,
        target: 'production',
        files: uploaded.map((u) => ({ file: u.file, sha: u.sha, size: u.size })),
      }),
    });
    const dep = await deployRes.json() as { url?: string; id?: string; error?: { message: string } };
    if (!deployRes.ok) throw new Error(`Vercel deploy failed: ${dep.error?.message ?? deployRes.status}`);

    return {
      artefactUrl: dep.url ? `https://${dep.url}` : undefined,
      version: dep.id,
      log: `${exportResult.log ?? ''}\n✓ Vercel deployment ${dep.id} → https://${dep.url}`,
    };
  }

  private async collectFiles(
    dir: string,
    base = dir,
  ): Promise<Array<{ relPath: string; bytes: Buffer }>> {
    const out: Array<{ relPath: string; bytes: Buffer }> = [];
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) out.push(...(await this.collectFiles(full, base)));
      else out.push({ relPath: path.relative(base, full).split(path.sep).join('/'), bytes: await fs.readFile(full) });
    }
    return out;
  }

  private resolveConfig(s: Partial<VercelConfig> | undefined): VercelConfig | null {
    const cfg: VercelConfig = {
      token: s?.token ?? this.config.get<string>('deployments.vercel.token') ?? '',
      projectId: s?.projectId ?? this.config.get<string>('deployments.vercel.projectId') ?? '',
      teamId: s?.teamId ?? this.config.get<string>('deployments.vercel.teamId') ?? undefined,
    };
    return cfg.token && cfg.projectId ? cfg : null;
  }
}
