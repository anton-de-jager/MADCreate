import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import SftpClient from 'ssh2-sftp-client';
import { StaticExportAdapter } from './static-export.adapter';
import type { DeploymentAdapter, DeploymentInput, DeploymentResult } from './adapter.interface';

interface SftpConfig {
  host: string;
  port?: number;
  user: string;
  password?: string;
  keyPath?: string;
  remotePath: string;
}

@Injectable()
export class SftpAdapter implements DeploymentAdapter {
  private readonly logger = new Logger(SftpAdapter.name);

  constructor(
    private readonly config: ConfigService,
    private readonly staticExport: StaticExportAdapter,
  ) {}

  async deploy(input: DeploymentInput): Promise<DeploymentResult> {
    const sftpConfig = this.resolveConfig(input.config?.sftp as Partial<SftpConfig> | undefined);
    if (!sftpConfig) {
      throw new Error(
        'SFTP not configured. Provide deployment.config.sftp ({ host, user, password|keyPath, remotePath }) ' +
        'or set SFTP_HOST / SFTP_USER / SFTP_PASS / SFTP_REMOTE_PATH in the environment.',
      );
    }

    // 1. Produce static artefacts on local disk (reuses the existing exporter).
    const exportResult = await this.staticExport.deploy(input);
    const localDir = exportResult.artefactUrl?.replace(/^file:\/\//, '');
    if (!localDir) throw new Error('Static export produced no local artefact to upload.');

    // 2. Upload to remote via SFTP.
    const client = new SftpClient();
    const logLines: string[] = [exportResult.log ?? ''];

    try {
      await client.connect({
        host: sftpConfig.host,
        port: sftpConfig.port ?? 22,
        username: sftpConfig.user,
        password: sftpConfig.password,
        privateKey: sftpConfig.keyPath ? await fs.readFile(sftpConfig.keyPath) : undefined,
        readyTimeout: 20_000,
      });
      logLines.push(`✓ Connected to ${sftpConfig.host}:${sftpConfig.port ?? 22} as ${sftpConfig.user}`);

      // Ensure remote dir exists (recursive mkdir is idempotent here).
      const remotePath = sftpConfig.remotePath.replace(/\/+$/, '');
      const tenantSubdir = `${remotePath}/${input.tenantId}`;
      await client.mkdir(tenantSubdir, true).catch(() => undefined);

      // Upload directory tree.
      const stats = await this.uploadDir(client, localDir, tenantSubdir);
      logLines.push(`✓ Uploaded ${stats.files} files (${(stats.bytes / 1024).toFixed(1)} KB) → ${tenantSubdir}`);

      return {
        artefactUrl: `sftp://${sftpConfig.user}@${sftpConfig.host}${tenantSubdir}`,
        log: logLines.filter(Boolean).join('\n'),
        version: String(Date.now()),
      };
    } finally {
      await client.end().catch(() => undefined);
    }
  }

  /** Recursively upload a local directory to the SFTP server. */
  private async uploadDir(
    client: SftpClient,
    localDir: string,
    remoteDir: string,
  ): Promise<{ files: number; bytes: number }> {
    const entries = await fs.readdir(localDir, { withFileTypes: true });
    let files = 0;
    let bytes = 0;

    for (const entry of entries) {
      const localPath = path.join(localDir, entry.name);
      const remotePath = `${remoteDir}/${entry.name}`;
      if (entry.isDirectory()) {
        await client.mkdir(remotePath, true).catch(() => undefined);
        const sub = await this.uploadDir(client, localPath, remotePath);
        files += sub.files;
        bytes += sub.bytes;
      } else if (entry.isFile()) {
        const stat = await fs.stat(localPath);
        await client.put(localPath, remotePath);
        files += 1;
        bytes += stat.size;
      }
    }
    return { files, bytes };
  }

  /** Merge per-deployment config with env-level defaults. */
  private resolveConfig(supplied: Partial<SftpConfig> | undefined): SftpConfig | null {
    const cfg: SftpConfig = {
      host: supplied?.host ?? this.config.get<string>('deployments.sftp.host') ?? '',
      port: supplied?.port ?? this.config.get<number>('deployments.sftp.port') ?? 22,
      user: supplied?.user ?? this.config.get<string>('deployments.sftp.user') ?? '',
      password: supplied?.password ?? this.config.get<string>('deployments.sftp.pass') ?? undefined,
      keyPath: supplied?.keyPath ?? this.config.get<string>('deployments.sftp.keyPath') ?? undefined,
      remotePath: supplied?.remotePath ?? this.config.get<string>('deployments.sftp.remotePath') ?? '',
    };
    if (!cfg.host || !cfg.user || !cfg.remotePath) return null;
    if (!cfg.password && !cfg.keyPath) return null;
    return cfg;
  }
}
