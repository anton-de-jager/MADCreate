import { StorageService } from './storage.service';
import { createMockConfig, type ConfigService } from '../../test/mock-helpers';
import { promises as fs } from 'node:fs';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('node:fs', () => ({
  promises: {
    mkdir: jest.fn().mockResolvedValue(undefined),
    writeFile: jest.fn().mockResolvedValue(undefined),
    unlink: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({})),
  PutObjectCommand: jest.fn(),
  DeleteObjectCommand: jest.fn(),
  GetObjectCommand: jest.fn(),
}));

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn(),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeLocalService() {
  const config = createMockConfig();
  config.get.mockImplementation((key: string) => {
    const map: Record<string, unknown> = {
      'storage.driver': 'local',
      'storage.localPath': './storage/uploads',
      'storage.publicUrl': '/media',
      'storage.localForced': false,
      'nodeEnv': 'development',
    };
    return map[key];
  });
  const svc = new StorageService(config as unknown as ConfigService);
  return { svc, config };
}

function makeS3Service() {
  const config = createMockConfig();
  config.get.mockImplementation((key: string) => {
    const map: Record<string, unknown> = {
      'storage.driver': 's3',
      'storage.s3.region': 'us-east-1',
      'storage.s3.endpoint': '',
      'storage.s3.accessKey': 'AKIA_TEST',
      'storage.s3.secretKey': 'secret',
      'storage.s3.bucket': 'test-bucket',
      'storage.s3.publicUrl': 'https://cdn.example.com',
      'storage.s3.forceSignedUrls': false,
      'nodeEnv': 'production',
    };
    return map[key];
  });
  const svc = new StorageService(config as unknown as ConfigService);
  return { svc, config };
}

function makeFakeFile(name = 'photo.png', content = 'hello') {
  return {
    originalname: name,
    mimetype: 'image/png',
    size: Buffer.byteLength(content),
    buffer: Buffer.from(content),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('StorageService', () => {
  beforeEach(() => jest.clearAllMocks());

  // --- constructor --------------------------------------------------------

  describe('constructor', () => {
    it('selects local driver by default', () => {
      const { svc } = makeLocalService();
      expect(svc.name).toBe('local');
    });

    it('selects s3 driver when configured', () => {
      const { svc } = makeS3Service();
      expect(svc.name).toBe('s3');
    });
  });

  // --- put (local) --------------------------------------------------------

  describe('put (local)', () => {
    it('creates directory and writes file, returns key and url', async () => {
      const { svc } = makeLocalService();
      const file = makeFakeFile();
      const result = await svc.put('avatars', file);

      expect(fs.mkdir).toHaveBeenCalledTimes(1);
      const mkdirArgs = (fs.mkdir as jest.Mock).mock.calls[0];
      expect((mkdirArgs[0] as string).includes('avatars')).toBe(true);
      expect(mkdirArgs[1]).toEqual({ recursive: true });

      expect(fs.writeFile).toHaveBeenCalledTimes(1);
      const writeArgs = (fs.writeFile as jest.Mock).mock.calls[0];
      expect(typeof writeArgs[0]).toBe('string');
      expect(writeArgs[1]).toBe(file.buffer);

      expect(result.key).toMatch(/^avatars\/[a-f0-9]+\.png$/);
      expect(result.url).toBe(`/media/${result.key}`);
    });
  });

  // --- delete (local) -----------------------------------------------------

  describe('delete (local)', () => {
    it('calls fs.unlink and returns true on success', async () => {
      const { svc } = makeLocalService();
      const result = await svc.delete('avatars/abc123.png');

      expect(fs.unlink).toHaveBeenCalledTimes(1);
      expect(result).toBe(true);
    });

    it('returns false on ENOENT', async () => {
      const enoent = Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
      (fs.unlink as jest.Mock).mockRejectedValueOnce(enoent);

      const { svc } = makeLocalService();
      const result = await svc.delete('avatars/missing.png');
      expect(result).toBe(false);
    });

    it('rethrows non-ENOENT errors', async () => {
      (fs.unlink as jest.Mock).mockRejectedValueOnce(new Error('EPERM'));

      const { svc } = makeLocalService();
      let caught: Error | undefined;
      try { await svc.delete('avatars/file.png'); } catch (e) { caught = e as Error; }
      expect(caught).toBeDefined();
      expect(caught!.message).toBe('EPERM');
    });
  });

  // --- delete path-traversal guard ----------------------------------------

  describe('delete (local) path-traversal guard', () => {
    it('rejects keys containing ".."', async () => {
      const { svc } = makeLocalService();
      const result = await svc.delete('../etc/passwd');

      expect(fs.unlink).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });

    it('rejects keys that try to escape via embedded ".."', async () => {
      const { svc } = makeLocalService();
      const result = await svc.delete('avatars/../../etc/passwd');

      expect(fs.unlink).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });
  });

  // --- signedUrl (local) --------------------------------------------------

  describe('signedUrl (local)', () => {
    it('returns public URL path since local driver has no signedUrl', async () => {
      const { svc } = makeLocalService();
      const url = await svc.signedUrl('avatars/abc123.png');
      expect(url).toBe('/media/avatars/abc123.png');
    });

    it('strips trailing slashes from publicUrl', async () => {
      const config = createMockConfig();
      config.get.mockImplementation((key: string) => {
        const map: Record<string, unknown> = {
          'storage.driver': 'local',
          'storage.localPath': './storage/uploads',
          'storage.publicUrl': '/media/',
          'storage.localForced': false,
          'nodeEnv': 'development',
        };
        return map[key];
      });
      const svc = new StorageService(config as unknown as ConfigService);
      const url = await svc.signedUrl('img/test.jpg');
      expect(url).toBe('/media/img/test.jpg');
    });
  });
});
