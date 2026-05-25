import type { JwtPayload } from '@madcreate/shared';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';

function fakeUser(sub = 'user-1'): JwtPayload {
  return { sub, email: 'test@example.com' };
}

interface MockMediaService {
  list: jest.Mock;
  uploadLocal: jest.Mock;
  remove: jest.Mock;
}

function mockMediaService(): MockMediaService {
  return {
    list: jest.fn(),
    uploadLocal: jest.fn(),
    remove: jest.fn(),
  };
}

function makeController(service: MockMediaService) {
  return new MediaController(service as unknown as MediaService);
}

describe('MediaController', () => {
  let controller: MediaController;
  let service: MockMediaService;

  beforeEach(() => {
    service = mockMediaService();
    controller = makeController(service);
  });

  describe('list', () => {
    it('should delegate to media.list with correct args', async () => {
      const expected = [{ id: '1', url: 'http://example.com/img.png' }];
      service.list.mockResolvedValue(expected);

      const result = await controller.list(fakeUser(), 'tenant-1');

      expect(service.list).toHaveBeenCalledWith('user-1', 'tenant-1');
      expect(result as unknown).toBe(expected);
    });
  });

  describe('upload', () => {
    it('should delegate to media.uploadLocal with correct args', async () => {
      const fakeFile = { originalname: 'test.png', buffer: Buffer.from('data') } as Express.Multer.File;
      const expected = { id: '1', url: 'http://example.com/test.png' };
      service.uploadLocal.mockResolvedValue(expected);

      const result = await controller.upload(fakeUser(), 'tenant-1', fakeFile);

      expect(service.uploadLocal).toHaveBeenCalledWith('user-1', 'tenant-1', fakeFile);
      expect(result as unknown).toBe(expected);
    });
  });

  describe('remove', () => {
    it('should delegate to media.remove with correct args', async () => {
      const expected = { success: true };
      service.remove.mockResolvedValue(expected);

      const result = await controller.remove(fakeUser(), 'tenant-1', 'media-1');

      expect(service.remove).toHaveBeenCalledWith('user-1', 'tenant-1', 'media-1');
      expect(result as unknown).toBe(expected);
    });
  });
});
