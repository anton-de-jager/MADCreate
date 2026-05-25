import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantsService } from '../tenants/tenants.service';
import { StorageService } from '../storage/storage.service';
import { MediaKind } from '@prisma/client';

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenants: TenantsService,
    private readonly storage: StorageService,
  ) {}

  async list(userId: string, tenantId: string) {
    await this.tenants.get(userId, tenantId);
    return this.prisma.media.findMany({ where: { tenantId, deletedAt: null }, orderBy: { createdAt: 'desc' } });
  }

  /** Upload a file via the configured StorageService (local or S3). */
  async uploadLocal(
    userId: string,
    tenantId: string,
    file: { originalname: string; mimetype: string; size: number; buffer: Buffer },
  ) {
    await this.tenants.get(userId, tenantId);
    const stored = await this.storage.put(tenantId, file);
    return this.prisma.media.create({
      data: {
        tenantId,
        uploaderId: userId,
        kind: this.guessKind(file.mimetype),
        filename: file.originalname,
        contentType: file.mimetype,
        sizeBytes: file.size,
        url: stored.url,
        storageKey: stored.key,
      },
    });
  }

  async remove(userId: string, tenantId: string, id: string) {
    await this.tenants.get(userId, tenantId);
    const m = await this.prisma.media.findUnique({ where: { id } });
    if (!m || m.tenantId !== tenantId) throw new NotFoundException();
    const result = await this.prisma.media.update({ where: { id }, data: { deletedAt: new Date() } });

    // Fire-and-forget: delete the actual file from storage.
    const storageKey = m.storageKey ?? `${m.tenantId}/${m.url.split('/').pop()}`;
    void this.storage.delete(storageKey).catch((err) =>
      this.logger.warn(`Failed to delete storage file [${storageKey}]`, err),
    );

    return result;
  }

  private guessKind(mime: string): MediaKind {
    if (mime.startsWith('image/')) return MediaKind.IMAGE;
    if (mime.startsWith('video/')) return MediaKind.VIDEO;
    if (mime.startsWith('audio/')) return MediaKind.AUDIO;
    if (mime.includes('font') || mime.includes('woff') || mime.includes('ttf')) return MediaKind.FONT;
    if (mime.includes('svg')) return MediaKind.ICON;
    return MediaKind.DOCUMENT;
  }
}
