import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'node:fs';
import { createHash } from 'node:crypto';
import * as path from 'node:path';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export interface StoredFile {
  url: string;
  key: string;
}

export interface StorageDriver {
  readonly name: 'local' | 's3';
  put(prefix: string, file: { originalname: string; mimetype: string; size: number; buffer: Buffer }): Promise<StoredFile>;
  delete(key: string): Promise<boolean>;
  /** Optional: signed/short-lived URL for private buckets. Local just returns the public URL. */
  signedUrl?(key: string, ttlSeconds?: number): Promise<string>;
}

/**
 * Selects a driver from STORAGE_DRIVER (local | s3) at module init. Local
 * is the default + dev-friendly path; s3 hits any S3-compatible bucket
 * (Cloudflare R2, Backblaze B2, AWS S3, MinIO).
 *
 * In production we refuse `local` unless STORAGE_LOCAL_FORCED=1 — multi-
 * replica deploys with local disk are a data-loss footgun.
 */
@Injectable()
export class StorageService implements StorageDriver {
  private readonly logger = new Logger(StorageService.name);
  private readonly driver: StorageDriver;
  readonly name: 'local' | 's3';

  constructor(private readonly config: ConfigService) {
    const requested = (this.config.get<string>('storage.driver') ?? 'local').toLowerCase();
    const forced    = this.config.get<boolean>('storage.localForced') === true;
    const isProd    = this.config.get<string>('nodeEnv') === 'production';

    if (requested === 's3') {
      this.driver = new S3StorageDriver(this.config);
      this.name = 's3';
    } else {
      if (isProd && !forced) {
        this.logger.warn(
          '[storage] STORAGE_DRIVER=local in production — uploads are not shared between replicas. Set STORAGE_DRIVER=s3 or STORAGE_LOCAL_FORCED=1 to silence this.',
        );
      }
      this.driver = new LocalStorageDriver(this.config);
      this.name = 'local';
    }
  }

  put(prefix: string, file: { originalname: string; mimetype: string; size: number; buffer: Buffer }) {
    return this.driver.put(prefix, file);
  }
  delete(key: string) { return this.driver.delete(key); }
  async signedUrl(key: string, ttlSeconds = 600): Promise<string> {
    if (this.driver.signedUrl) return this.driver.signedUrl(key, ttlSeconds);
    // Local driver has no real signing — return the public URL.
    const baseUrl = (this.config.get<string>('storage.publicUrl') ?? '/media').replace(/\/+$/, '');
    return `${baseUrl}/${key}`;
  }
}

// ─── Local disk driver ────────────────────────────────────────────────

class LocalStorageDriver implements StorageDriver {
  readonly name = 'local' as const;
  private readonly logger = new Logger(LocalStorageDriver.name);
  private readonly localPath: string;
  private readonly publicUrl: string;

  constructor(config: ConfigService) {
    this.localPath = config.get<string>('storage.localPath') ?? './storage/uploads';
    this.publicUrl = (config.get<string>('storage.publicUrl') ?? '/media').replace(/\/+$/, '');
  }

  async put(prefix: string, file: { originalname: string; mimetype: string; size: number; buffer: Buffer }): Promise<StoredFile> {
    const hash = createHash('sha1').update(file.buffer).digest('hex').slice(0, 16);
    const ext = path.extname(file.originalname).toLowerCase();
    const filename = `${hash}${ext}`;
    const key = `${prefix}/${filename}`;
    const absDir = path.resolve(this.localPath, prefix);
    await fs.mkdir(absDir, { recursive: true });
    await fs.writeFile(path.join(absDir, filename), file.buffer);
    return { key, url: `${this.publicUrl}/${key}` };
  }

  async delete(key: string): Promise<boolean> {
    const normalized = path.normalize(key).replace(/^[\\/]+/, '');
    if (normalized.split(/[\\/]/).includes('..')) {
      this.logger.warn(`Refusing to delete suspicious key: ${key}`);
      return false;
    }
    const abs = path.resolve(this.localPath, normalized);
    const rootAbs = path.resolve(this.localPath);
    if (!abs.startsWith(rootAbs + path.sep) && abs !== rootAbs) {
      this.logger.warn(`Refusing to delete out-of-tree key: ${key}`);
      return false;
    }
    try {
      await fs.unlink(abs);
      return true;
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err && (err as { code: unknown }).code === 'ENOENT') return false;
      throw err;
    }
  }
}

// ─── S3-compatible driver ─────────────────────────────────────────────

class S3StorageDriver implements StorageDriver {
  readonly name = 's3' as const;
  private readonly logger = new Logger(S3StorageDriver.name);
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string | null;
  private readonly forceSign: boolean;

  constructor(config: ConfigService) {
    const region   = config.get<string>('storage.s3.region')   ?? 'auto'; // R2 uses 'auto'
    const endpoint = config.get<string>('storage.s3.endpoint'); // optional — for R2/B2/MinIO
    const accessKeyId     = config.get<string>('storage.s3.accessKey')     ?? '';
    const secretAccessKey = config.get<string>('storage.s3.secretKey') ?? '';
    this.bucket  = config.get<string>('storage.s3.bucket') ?? '';
    if (!this.bucket) {
      this.logger.error('[s3] storage.s3.bucket is empty — uploads will fail. Set S3_BUCKET via .env.deploy.');
    }
    // If a CDN/public-bucket URL is configured, we hand that out instead of
    // generating signed URLs every time. R2 with a custom domain uses this.
    this.publicUrl = (config.get<string>('storage.s3.publicUrl') ?? '').replace(/\/+$/, '') || null;
    this.forceSign = config.get<boolean>('storage.s3.forceSignedUrls') === true;
    this.client = new S3Client({
      region,
      endpoint: endpoint || undefined,
      forcePathStyle: !!endpoint, // most S3-compatibles want path-style
      credentials: { accessKeyId, secretAccessKey },
    });
    this.logger.log(`[s3] bucket=${this.bucket} region=${region}${endpoint ? ' endpoint=' + endpoint : ''}`);
  }

  async put(prefix: string, file: { originalname: string; mimetype: string; size: number; buffer: Buffer }): Promise<StoredFile> {
    const hash = createHash('sha1').update(file.buffer).digest('hex').slice(0, 16);
    const ext = path.extname(file.originalname).toLowerCase();
    const key = `${prefix}/${hash}${ext}`;
    await this.client.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      ContentDisposition: `inline; filename="${file.originalname.replace(/"/g, '')}"`,
    }));
    const url = this.forceSign
      ? await this.signedUrl(key)
      : this.publicUrl
        ? `${this.publicUrl}/${key}`
        : await this.signedUrl(key);
    return { key, url };
  }

  async delete(key: string): Promise<boolean> {
    try {
      await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
      return true;
    } catch (err: unknown) {
      // S3 returns 200 even for missing keys, but a 4xx (e.g., NoSuchKey or
      // 404 on some impls) shouldn't bubble — operators expect idempotent.
      const e = err && typeof err === 'object' ? err as Record<string, unknown> : undefined;
      const meta = e?.$metadata;
      const httpStatus = meta && typeof meta === 'object' ? (meta as Record<string, unknown>).httpStatusCode : undefined;
      if (httpStatus === 404 || e?.name === 'NoSuchKey') return false;
      throw err;
    }
  }

  async signedUrl(key: string, ttlSeconds = 600): Promise<string> {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn: ttlSeconds },
    );
  }
}
