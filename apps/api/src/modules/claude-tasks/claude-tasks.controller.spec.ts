import { HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import { ClaudeTasksController } from './claude-tasks.controller';
import { ClaudeTasksService } from './claude-tasks.service';
import { StorageService } from '../storage/storage.service';
import {
  CreateClaudeTaskDto, UpdateClaudeTaskDto, ImportBulkClaudeTasksDto,
  UpdateClaudeSettingsDto,
} from './dto/claude-task.dto';

// ---------------------------------------------------------------------------
// Mock service interfaces
// ---------------------------------------------------------------------------

interface MockClaudeTasksService {
  findAll: jest.Mock;
  findNext: jest.Mock;
  importBulk: jest.Mock;
  getSettings: jest.Mock;
  updateSettings: jest.Mock;
  findOne: jest.Mock;
  create: jest.Mock;
  update: jest.Mock;
  remove: jest.Mock;
  onTaskChange: jest.Mock;
}

interface MockStorageService {
  put: jest.Mock;
  delete: jest.Mock;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockService(): MockClaudeTasksService {
  return {
    findAll: jest.fn(),
    findNext: jest.fn(),
    importBulk: jest.fn(),
    getSettings: jest.fn(),
    updateSettings: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    onTaskChange: jest.fn(),
  };
}

function mockStorage(): MockStorageService {
  return {
    put: jest.fn(),
    delete: jest.fn(),
  };
}

function makeController() {
  const service = mockService();
  const storage = mockStorage();
  const ctrl = new ClaudeTasksController(
    service as unknown as ClaudeTasksService,
    storage as unknown as StorageService,
  );
  return { ctrl, service, storage };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ClaudeTasksController', () => {
  // =========================================================================
  // findAll
  // =========================================================================

  describe('findAll', () => {
    it('delegates to service.findAll()', () => {
      const { ctrl, service } = makeController();
      const expected = [{ id: 1, title: 'Task 1' }];
      service.findAll.mockReturnValue(expected);

      const result = ctrl.findAll();

      expect(service.findAll).toHaveBeenCalled();
      expect(result as unknown).toBe(expected);
    });
  });

  // =========================================================================
  // findNext
  // =========================================================================

  describe('findNext', () => {
    it('returns the task when one is available', async () => {
      const { ctrl, service } = makeController();
      const task = { id: 1, title: 'Next task' };
      service.findNext.mockResolvedValue({ task });
      const res = { status: jest.fn() } as unknown as Response;

      const result = await ctrl.findNext(res);

      expect(service.findNext).toHaveBeenCalled();
      expect((res.status as jest.Mock)).not.toHaveBeenCalled();
      expect(result as unknown).toEqual({ task });
    });

    it('sets 204 and returns undefined when no task is available', async () => {
      const { ctrl, service } = makeController();
      service.findNext.mockResolvedValue({ task: null });
      const res = { status: jest.fn() } as unknown as Response;

      const result = await ctrl.findNext(res);

      expect((res.status as jest.Mock)).toHaveBeenCalledWith(HttpStatus.NO_CONTENT);
      expect(result).toBeUndefined();
    });
  });

  // =========================================================================
  // importBulk
  // =========================================================================

  describe('importBulk', () => {
    it('delegates to service.importBulk() with the dto', () => {
      const { ctrl, service } = makeController();
      const dto: ImportBulkClaudeTasksDto = { items: [{ title: 'Bulk 1' }] };
      const expected = { count: 1 };
      service.importBulk.mockReturnValue(expected);

      const result = ctrl.importBulk(dto);

      expect(service.importBulk).toHaveBeenCalledWith(dto);
      expect(result as unknown).toBe(expected);
    });
  });

  // =========================================================================
  // getSettings
  // =========================================================================

  describe('getSettings', () => {
    it('delegates to service.getSettings()', () => {
      const { ctrl, service } = makeController();
      const expected = { autoAssign: true };
      service.getSettings.mockReturnValue(expected);

      const result = ctrl.getSettings();

      expect(service.getSettings).toHaveBeenCalled();
      expect(result as unknown).toBe(expected);
    });
  });

  // =========================================================================
  // updateSettings
  // =========================================================================

  describe('updateSettings', () => {
    it('delegates to service.updateSettings() with the dto', () => {
      const { ctrl, service } = makeController();
      const dto: UpdateClaudeSettingsDto = { workerActive: false };
      const expected = { workerActive: false };
      service.updateSettings.mockReturnValue(expected);

      const result = ctrl.updateSettings(dto);

      expect(service.updateSettings).toHaveBeenCalledWith(dto);
      expect(result as unknown).toBe(expected);
    });
  });

  // =========================================================================
  // findOne
  // =========================================================================

  describe('findOne', () => {
    it('delegates to service.findOne() with the id', () => {
      const { ctrl, service } = makeController();
      const expected = { id: 42, title: 'Task 42' };
      service.findOne.mockReturnValue(expected);

      const result = ctrl.findOne(42);

      expect(service.findOne).toHaveBeenCalledWith(42);
      expect(result as unknown).toBe(expected);
    });
  });

  // =========================================================================
  // create
  // =========================================================================

  describe('create', () => {
    it('delegates to service.create() with the dto', () => {
      const { ctrl, service } = makeController();
      const dto: CreateClaudeTaskDto = { title: 'New task' };
      const expected = { id: 1, title: 'New task' };
      service.create.mockReturnValue(expected);

      const result = ctrl.create(dto);

      expect(service.create).toHaveBeenCalledWith(dto);
      expect(result as unknown).toBe(expected);
    });
  });

  // =========================================================================
  // update
  // =========================================================================

  describe('update', () => {
    it('delegates to service.update() with id and dto', () => {
      const { ctrl, service } = makeController();
      const dto: UpdateClaudeTaskDto = { title: 'Updated' };
      const expected = { id: 5, title: 'Updated' };
      service.update.mockReturnValue(expected);

      const result = ctrl.update(5, dto);

      expect(service.update).toHaveBeenCalledWith(5, dto);
      expect(result as unknown).toBe(expected);
    });
  });

  // =========================================================================
  // remove
  // =========================================================================

  describe('remove', () => {
    it('delegates to service.remove() with the id', () => {
      const { ctrl, service } = makeController();
      service.remove.mockReturnValue(undefined);

      const result = ctrl.remove(99);

      expect(service.remove).toHaveBeenCalledWith(99);
      expect(result).toBeUndefined();
    });
  });
});
