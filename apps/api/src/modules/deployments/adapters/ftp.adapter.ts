import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import * as ftp from 'basic-ftp';
import { StaticExportAdapter } from './static-export.adapter';
import type { DeploymentAdapter, DeploymentInput, DeploymentResult } from './adapter.interface';

interface FtpConfig {
  host: string;
  port?: number;
  user: string;
  password: string;
  remotePath: string;
  secure?: boolean;
}

@Injectable()
export class FtpAdapter implements DeploymentAdapter {
  private readonly logger = new Logger(FtpAdapter.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly staticExport: StaticExportAdapter,
  ) {}

  async deploy(input: DeploymentInput): Promise<DeploymentResult> {
    const cfg = this.resolveConfig(input.config?.ftp as Partial<FtpConfig> | undefined);
    if (!cfg) {
      throw new Error(
        'FTP not configured. Provide deployment.config.ftp ({ host, user, password, remotePath }) ' +
        'or set FTP_HOST / FTP_USER / FTP_PASS / FTP_REMOTE_PATH in the environment.',
      );
    }

    const exportResult = await this.staticExport.deploy(input);
    const localDir = exportResult.artefactUrl?.replace(/^file:\/\//, '');
    if (!localDir) throw new Error('Static export produced no local artefact to upload.');

    const client = new ftp.Client(30_000);
    client.ftp.verbose = false;
    const logLines: string[] = [exportResult.log ?? ''];

    try {
      await client.access({
        host: cfg.host,
        port: cfg.port ?? 21,
        user: cfg.user,
        password: cfg.password,
        secure: cfg.secure ?? false,
      });
      logLines.push(`✓ Connected to ftp${cfg.secure ? 's' : ''}://${cfg.host}:${cfg.port ?? 21}`);

      const remotePath = `${cfg.remotePath.replace(/\/+$/, '')}/${input.tenantId}`;
      await client.ensureDir(remotePath);
      await client.clearWorkingDir().catch(() => undefined);
      await client.uploadFromDir(localDir);

      const stats = await this.summarize(localDir);
      logLines.push(`✓ Uploaded ${stats.files} files (${(stats.bytes / 1024).toFixed(1)} KB) → ${cfg.host}:${remotePath}`);

      return {
        artefactUrl: `ftp${cfg.secure ? 's' : ''}://${cfg.user}@${cfg.host}${remotePath}`,
        log: logLines.filter(Boolean).join('\n'),
        version: String(Date.now()),
      };
    } finally {
      client.close();
    }
  }

  private async summarize(dir: string): Promise<{ files: number; bytes: number }> {
    let files = 0, bytes = 0;
    for (const e of await fs.readdir(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        const s = await this.summarize(p); files += s.files; bytes += s.bytes;
      } else {
        const s = await fs.stat(p); files += 1; bytes += s.size;
      }
    }
    return { files, bytes };
  }

  private resolveConfig(supplied: Partial<FtpConfig> | undefined): FtpConfig | null {
    const cfg: FtpConfig = {
      host: supplied?.host ?? this.configService.get<string>('deployments.ftp.host') ?? '',
      port: supplied?.port ?? this.configService.get<number>('deployments.ftp.port') ?? 21,
      user: supplied?.user ?? this.configService.get<string>('deployments.ftp.user') ?? '',
      password: supplied?.password ?? this.configService.get<string>('deployments.ftp.pass') ?? '',
      remotePath: supplied?.remotePath ?? this.configService.get<string>('deployments.ftp.remotePath') ?? '',
      secure: supplied?.secure ?? false,
    };
    if (!cfg.host || !cfg.user || !cfg.password || !cfg.remotePath) return null;
    return cfg;
  }
}
