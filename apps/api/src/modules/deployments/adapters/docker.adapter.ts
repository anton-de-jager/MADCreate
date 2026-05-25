import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { StaticExportAdapter } from './static-export.adapter';
import type { DeploymentAdapter, DeploymentInput, DeploymentResult } from './adapter.interface';

interface DockerConfig {
  image: string;       // 'registry.example.com/madcreate/tenant'
  tag?: string;        // defaults to tenant slug + timestamp
  registryUser?: string;
  registryPass?: string;
  baseImage?: string;  // default 'nginx:1.27-alpine'
}

/**
 * Builds a docker image containing the tenant's static site served by nginx,
 * then pushes it to the configured registry. Requires `docker` CLI on the host.
 */
@Injectable()
export class DockerAdapter implements DeploymentAdapter {
  private readonly logger = new Logger(DockerAdapter.name);

  constructor(
    private readonly config: ConfigService,
    private readonly staticExport: StaticExportAdapter,
  ) {}

  async deploy(input: DeploymentInput): Promise<DeploymentResult> {
    const cfg = this.resolveConfig(input.config?.docker as Partial<DockerConfig> | undefined);
    if (!cfg) {
      throw new Error('Docker target requires deployment.config.docker.image (and DOCKER_REGISTRY_USER/PASS if pushing to a private registry).');
    }

    const exportResult = await this.staticExport.deploy(input);
    const localDir = exportResult.artefactUrl?.replace(/^file:\/\//, '');
    if (!localDir) throw new Error('Static export produced no local artefact.');

    const baseImage = cfg.baseImage ?? 'nginx:1.27-alpine';
    const tag = cfg.tag ?? `${input.tenantId}-${Date.now()}`;
    const fullRef = `${cfg.image}:${tag}`;

    // Write a tiny Dockerfile in the export dir.
    await fs.writeFile(
      path.join(localDir, 'Dockerfile'),
      `FROM ${baseImage}\nCOPY . /usr/share/nginx/html\nEXPOSE 80\n`,
      'utf8',
    );

    const log: string[] = [exportResult.log ?? ''];

    if (cfg.registryUser && cfg.registryPass) {
      log.push(await runDocker(['login', '--username', cfg.registryUser, '--password-stdin', registryOf(cfg.image)], cfg.registryPass));
    }
    log.push(await runDocker(['build', '-t', fullRef, localDir]));
    log.push(await runDocker(['push', fullRef]));

    return { artefactUrl: `docker://${fullRef}`, version: tag, log: log.filter(Boolean).join('\n') };
  }

  private resolveConfig(s: Partial<DockerConfig> | undefined): DockerConfig | null {
    if (!s?.image && !this.config.get<string>('deployments.docker.image')) return null;
    return {
      image: s?.image ?? this.config.get<string>('deployments.docker.image') ?? '',
      tag: s?.tag,
      registryUser: s?.registryUser ?? this.config.get<string>('deployments.docker.registryUser'),
      registryPass: s?.registryPass ?? this.config.get<string>('deployments.docker.registryPass'),
      baseImage: s?.baseImage ?? this.config.get<string>('deployments.docker.baseImage'),
    };
  }
}

function registryOf(image: string): string {
  const firstSlash = image.indexOf('/');
  if (firstSlash === -1) return 'docker.io';
  const maybeRegistry = image.slice(0, firstSlash);
  return maybeRegistry.includes('.') || maybeRegistry.includes(':') ? maybeRegistry : 'docker.io';
}

function runDocker(args: string[], stdin?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn('docker', args, { stdio: ['pipe', 'pipe', 'pipe'] });
    let out = '', err = '';
    proc.stdout.on('data', (d) => { out += d.toString(); });
    proc.stderr.on('data', (d) => { err += d.toString(); });
    proc.on('error', (e) => reject(new Error(`docker ${args[0]} failed to spawn: ${e.message}`)));
    proc.on('close', (code) => {
      if (code === 0) resolve(`$ docker ${args.join(' ')}\n${out}`);
      else reject(new Error(`docker ${args[0]} exited ${code}\n${err || out}`));
    });
    if (stdin) { proc.stdin.write(stdin); proc.stdin.end(); }
  });
}
