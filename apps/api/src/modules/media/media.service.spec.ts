import { NotFoundException } from '@nestjs/common';
import { MediaKind } from '@prisma/client';
import { MediaService } from './media.service';
import {
  createMockPrisma,
  createMockTenantsService,
  type PrismaService,
  type TenantsService,
} from '../../test/mock-helpers';
import type { StorageService } from '../storage/storage.service';

function createMockStorage() {
  return { put: jest.fn(), delete: jest.fn(), signedUrl: jest.fn() };
}

function makeService() {
  const prisma = createMockPrisma();
  const tenants = createMockTenantsService();
  const storage = createMockStorage();
  tenants.get.mockResolvedValue({ id: 'tenant-1' });
  storage.put.mockResolvedValue({ url: '/media/tenant-1/abc.png', key: 'tenant-1/abc.png' });
  storage.delete.mockResolvedValue(true);
  const svc = new MediaService(
    prisma as unknown as PrismaService,
    tenants as unknown as TenantsService,
    storage as unknown as StorageService,
  );
  return { svc, prisma, tenants, storage };
}

const userId = 'user-1';
const tenantId = 'tenant-1';

describe('MediaService', () => {
  // -----------------------------------------------------------------------
  // list
  // -----------------------------------------------------------------------
  describe('list', () => {
    it('asserts tenant access and returns media ordered by createdAt desc', async () => {
      const { svc, prisma, tenants } = makeService();
      const mediaList = [{ id: 'm1' }, { id: 'm2' }];
      prisma.media.findMany.mockResolvedValue(mediaList);

      const result = await svc.list(userId, tenantId);

      expect(tenants.get).toHaveBeenCalledWith(userId, tenantId);
      expect(prisma.media.findMany).toHaveBeenCalledWith({
        where: { tenantId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(mediaList);
    });
  });

  // -----------------------------------------------------------------------
  // uploadLocal
  // -----------------------------------------------------------------------
  describe('uploadLocal', () => {
    const file = {
      originalname: 'photo.png',
      mimetype: 'image/png',
      size: 1024,
      buffer: Buffer.from('fake'),
    };

    it('asserts access, stores file with tenantId prefix, creates media record', async () => {
      const { svc, prisma, tenants, storage } = makeService();
      const created = { id: 'm1', kind: MediaKind.IMAGE };
      prisma.media.create.mockResolvedValue(created);

      const result = await svc.uploadLocal(userId, tenantId, file);

      expect(tenants.get).toHaveBeenCalledWith(userId, tenantId);
      expect(storage.put).toHaveBeenCalledWith(tenantId, file);
      expect(prisma.media.create).toHaveBeenCalledWith({
        data: {
          tenantId,
          uploaderId: userId,
          kind: MediaKind.IMAGE,
          filename: 'photo.png',
          contentType: 'image/png',
          sizeBytes: 1024,
          url: '/media/tenant-1/abc.png',
          storageKey: 'tenant-1/abc.png',
        },
      });
      expect(result).toEqual(created);
    });
  });

  // -----------------------------------------------------------------------
  // remove
  // -----------------------------------------------------------------------
  describe('remove', () => {
    it('soft-deletes and fires-and-forgets storage.delete', async () => {
      const { svc, prisma, tenants, storage } = makeService();
      const existing = { id: 'm1', tenantId, storageKey: 'tenant-1/photo.png', url: '/media/tenant-1/photo.png' };
      prisma.media.findUnique.mockResolvedValue(existing);
      const updated = { ...existing, deletedAt: new Date() };
      prisma.media.update.mockResolvedValue(updated);

      const result = await svc.remove(userId, tenantId, 'm1');

      expect(tenants.get).toHaveBeenCalledWith(userId, tenantId);
      expect(prisma.media.findUnique).toHaveBeenCalledWith({ where: { id: 'm1' } });
      expect(prisma.media.update).toHaveBeenCalledWith({
        where: { id: 'm1' },
        data: { deletedAt: expect.any(Date) },
      });
      expect(storage.delete).toHaveBeenCalledWith('tenant-1/photo.png');
      expect(result).toEqual(updated);
    });

    it('throws NotFoundException when media not found', async () => {
      const { svc, prisma } = makeService();
      prisma.media.findUnique.mockResolvedValue(null);

      await expect(svc.remove(userId, tenantId, 'bad-id')).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when media belongs to a different tenant', async () => {
      const { svc, prisma } = makeService();
      prisma.media.findUnique.mockResolvedValue({ id: 'm1', tenantId: 'other-tenant' });

      await expect(svc.remove(userId, tenantId, 'm1')).rejects.toThrow(NotFoundException);
    });

    it('derives storageKey from url when storageKey is null', async () => {
      const { svc, prisma, storage } = makeService();
      prisma.media.findUnique.mockResolvedValue({
        id: 'm1',
        tenantId,
        storageKey: null,
        url: '/media/tenant-1/photo.png',
      });
      prisma.media.update.mockResolvedValue({});

      await svc.remove(userId, tenantId, 'm1');

      expect(storage.delete).toHaveBeenCalledWith('tenant-1/photo.png');
    });
  });

  // -----------------------------------------------------------------------
  // guessKind (tested via uploadLocal)
  // -----------------------------------------------------------------------
  describe('guessKind (via uploadLocal)', () => {
    const cases: [string, MediaKind][] = [
      ['image/png', MediaKind.IMAGE],
      ['image/jpeg', MediaKind.IMAGE],
      ['image/svg+xml', MediaKind.IMAGE], // image/ prefix matches before svg check
      ['video/mp4', MediaKind.VIDEO],
      ['video/webm', MediaKind.VIDEO],
      ['audio/mpeg', MediaKind.AUDIO],
      ['audio/ogg', MediaKind.AUDIO],
      ['font/woff', MediaKind.FONT],
      ['font/woff2', MediaKind.FONT],
      ['application/font-ttf', MediaKind.FONT],
      ['application/pdf', MediaKind.DOCUMENT],
      ['text/plain', MediaKind.DOCUMENT],
    ];

    it.each(cases)('mime=%s -> %s', async (mime, expectedKind) => {
      const { svc, prisma } = makeService();
      prisma.media.create.mockResolvedValue({ kind: expectedKind });

      await svc.uploadLocal(userId, tenantId, {
        originalname: 'file',
        mimetype: mime,
        size: 100,
        buffer: Buffer.from(''),
      });

      expect(prisma.media.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ kind: expectedKind }),
        }),
      );
    });
  });
});
