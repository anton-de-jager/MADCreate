import { NotFoundException } from '@nestjs/common';
import { ClaudeTaskStatus } from '@prisma/client';
import { ClaudeTasksService } from './claude-tasks.service';
import { createMockPrisma, type MockPrisma, type PrismaService } from '../../test/mock-helpers';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeService() {
  const prisma: MockPrisma = createMockPrisma();
  const ct = prisma.claudeTask;
  const ff = prisma.featureFlag;
  const svc = new ClaudeTasksService(prisma as unknown as PrismaService);
  return { svc, prisma, ct, ff };
}

/** Minimal task factory. */
function fakeTask(overrides: Record<string, unknown> = {}) {
  return {
    id: overrides.id ?? 1,
    title: overrides.title ?? 'task',
    description: overrides.description ?? null,
    notes: overrides.notes ?? null,
    status: overrides.status ?? ClaudeTaskStatus.PENDING,
    priority: overrides.priority ?? 3,
    createdAt: overrides.createdAt ?? new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    attachments: overrides.attachments ?? [],
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ClaudeTasksService', () => {
  // ----- findAll -----------------------------------------------------------
  describe('findAll', () => {
    it('returns tasks sorted into 3 buckets: active, to-be-deployed, done', async () => {
      const { svc, ct } = makeService();

      const completed = fakeTask({ id: 1, status: ClaudeTaskStatus.COMPLETED, priority: 1, createdAt: new Date('2026-01-05') });
      const pending = fakeTask({ id: 2, status: ClaudeTaskStatus.PENDING, priority: 2, createdAt: new Date('2026-01-01') });
      const tbd = fakeTask({ id: 3, status: ClaudeTaskStatus.TO_BE_DEPLOYED, priority: 1, createdAt: new Date('2026-01-03') });
      const inProgress = fakeTask({ id: 4, status: ClaudeTaskStatus.IN_PROGRESS, priority: 1, createdAt: new Date('2026-01-02') });
      const failed = fakeTask({ id: 5, status: ClaudeTaskStatus.FAILED, priority: 1, createdAt: new Date('2026-01-04') });
      const cancelled = fakeTask({ id: 6, status: ClaudeTaskStatus.CANCELLED, priority: 1, createdAt: new Date('2026-01-06') });

      // Return in arbitrary order; service must re-sort
      ct.findMany.mockResolvedValue([completed, tbd, failed, pending, cancelled, inProgress]);

      const result = await svc.findAll();

      // Bucket 0: active (PENDING, IN_PROGRESS) sorted by priority ASC then createdAt ASC
      expect(result[0].id).toBe(4); // IN_PROGRESS prio 1
      expect(result[1].id).toBe(2); // PENDING prio 2
      // Bucket 1: TO_BE_DEPLOYED
      expect(result[2].id).toBe(3);
      // Bucket 2: done (COMPLETED, CANCELLED, FAILED) sorted by createdAt DESC
      expect(result[3].id).toBe(6); // CANCELLED Jan 6
      expect(result[4].id).toBe(1); // COMPLETED Jan 5
      expect(result[5].id).toBe(5); // FAILED Jan 4
    });
  });

  // ----- findNext ----------------------------------------------------------
  describe('findNext', () => {
    it('returns the first PENDING task by priority and createdAt', async () => {
      const { svc, ct } = makeService();
      const task = fakeTask({ id: 10, status: ClaudeTaskStatus.PENDING });
      ct.findFirst.mockResolvedValue(task);

      const result = await svc.findNext();

      expect(result.task).toBeTruthy();
      expect(result.task!.id).toBe(10);
      expect(ct.findFirst).toHaveBeenCalledWith({
        where: { status: { in: [ClaudeTaskStatus.PENDING, ClaudeTaskStatus.IN_PROGRESS] } },
        orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
      });
    });

    it('returns { task: null } when no active tasks exist', async () => {
      const { svc, ct } = makeService();
      ct.findFirst.mockResolvedValue(null);

      const result = await svc.findNext();

      expect(result).toEqual({ task: null });
    });
  });

  // ----- findOne -----------------------------------------------------------
  describe('findOne', () => {
    it('returns task by id', async () => {
      const { svc, ct } = makeService();
      const task = fakeTask({ id: 5 });
      ct.findUnique.mockResolvedValue(task);

      const result = await svc.findOne(5);

      expect(result.id).toBe(5);
      expect(ct.findUnique).toHaveBeenCalledWith({ where: { id: 5 } });
    });

    it('throws NotFoundException when task does not exist', async () => {
      const { svc, ct } = makeService();
      ct.findUnique.mockResolvedValue(null);

      await expect(svc.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  // ----- create ------------------------------------------------------------
  describe('create', () => {
    it('creates task with given fields and emits change', async () => {
      const { svc, ct } = makeService();
      const created = fakeTask({ id: 7, title: 'new task' });
      ct.create.mockResolvedValue(created);

      const listener = jest.fn();
      svc.onTaskChange(listener);

      const result = await svc.create({ title: 'new task', description: 'desc', priority: 2 });

      expect(result.id).toBe(7);
      expect(ct.create).toHaveBeenCalledWith({
        data: {
          title: 'new task',
          description: 'desc',
          notes: null,
          status: ClaudeTaskStatus.PENDING,
          priority: 2,
        },
      });
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('uses defaults for optional fields', async () => {
      const { svc, ct } = makeService();
      ct.create.mockResolvedValue(fakeTask());

      await svc.create({ title: 'minimal' });

      expect(ct.create).toHaveBeenCalledWith({
        data: {
          title: 'minimal',
          description: null,
          notes: null,
          status: ClaudeTaskStatus.PENDING,
          priority: 3,
        },
      });
    });
  });

  // ----- update ------------------------------------------------------------
  describe('update', () => {
    it('partial update only sets defined fields', async () => {
      const { svc, ct } = makeService();
      const existing = fakeTask({ id: 1 });
      ct.findUnique.mockResolvedValue(existing);
      ct.update.mockResolvedValue({ ...existing, status: ClaudeTaskStatus.IN_PROGRESS });

      const listener = jest.fn();
      svc.onTaskChange(listener);

      await svc.update(1, { status: 'IN_PROGRESS' });

      expect(ct.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { status: ClaudeTaskStatus.IN_PROGRESS },
      });
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('throws NotFoundException on missing id', async () => {
      const { svc, ct } = makeService();
      ct.findUnique.mockResolvedValue(null);

      await expect(svc.update(999, { title: 'nope' })).rejects.toThrow(NotFoundException);
    });
  });

  // ----- remove ------------------------------------------------------------
  describe('remove', () => {
    it('deletes task and emits change', async () => {
      const { svc, ct } = makeService();
      ct.findUnique.mockResolvedValue(fakeTask({ id: 3 }));
      ct.delete.mockResolvedValue(undefined);

      const listener = jest.fn();
      svc.onTaskChange(listener);

      await svc.remove(3);

      expect(ct.delete).toHaveBeenCalledWith({ where: { id: 3 } });
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('throws NotFoundException on missing id', async () => {
      const { svc, ct } = makeService();
      ct.findUnique.mockResolvedValue(null);

      await expect(svc.remove(999)).rejects.toThrow(NotFoundException);
    });
  });

  // ----- importBulk --------------------------------------------------------
  describe('importBulk', () => {
    it('creates new tasks and skips duplicates by title', async () => {
      const { svc, ct, ff } = makeService();

      // Scanner is active
      ff.findMany.mockResolvedValue([
        { key: 'claude_scanner_active', enabled: true, workspaceId: null },
      ]);
      // One existing active task
      ct.findMany.mockResolvedValue([{ title: 'Existing Task' }]);
      // create returns a task with an id
      let nextId = 100;
      ct.create.mockImplementation(async () => fakeTask({ id: nextId++ }));

      const result = await svc.importBulk({
        items: [
          { title: 'existing task' },   // duplicate (case-insensitive)
          { title: 'Brand New Task' },
          { title: 'Another New' },
          { title: 'brand new task' },   // duplicate within payload
        ],
      });

      expect(result.created).toBe(2);
      expect(result.skipped).toBe(2);
      expect(result.skippedTitles).toEqual(['existing task', 'brand new task']);
      expect(ct.create).toHaveBeenCalledTimes(2);
    });

    it('skips all when scanner is disabled and source is not error-reporter', async () => {
      const { svc, ct, ff } = makeService();

      ff.findMany.mockResolvedValue([
        { key: 'claude_scanner_active', enabled: false, workspaceId: null },
      ]);

      const result = await svc.importBulk({
        items: [{ title: 'task A' }, { title: 'task B' }],
        source: 'scanner',
      });

      expect(result.created).toBe(0);
      expect(result.skipped).toBe(2);
      // Should NOT have queried for active tasks
      expect(ct.findMany).not.toHaveBeenCalled();
    });

    it('allows error-reporter source even when scanner is disabled', async () => {
      const { svc, ct, ff } = makeService();

      // No flags at all (scanner defaults to false)
      ff.findMany.mockResolvedValue([]);
      ct.findMany.mockResolvedValue([]);
      ct.create.mockImplementation(async () => fakeTask({ id: 50 }));

      const result = await svc.importBulk({
        items: [{ title: 'error fix' }],
        source: 'error-reporter',
      });

      expect(result.created).toBe(1);
    });
  });

  // ----- getSettings -------------------------------------------------------
  describe('getSettings', () => {
    it('returns defaults when no flags exist', async () => {
      const { svc, ff } = makeService();
      ff.findMany.mockResolvedValue([]);

      const settings = await svc.getSettings();

      expect(settings).toEqual({
        workerActive: false,
        scannerActive: false,
        deployNext: false,
      });
    });

    it('maps stored flags to settings', async () => {
      const { svc, ff } = makeService();
      ff.findMany.mockResolvedValue([
        { key: 'claude_worker_active', enabled: true },
        { key: 'claude_scanner_active', enabled: false },
        { key: 'claude_deploy_next', enabled: true },
      ]);

      const settings = await svc.getSettings();

      expect(settings).toEqual({
        workerActive: true,
        scannerActive: false,
        deployNext: true,
      });
    });
  });

  // ----- updateSettings ----------------------------------------------------
  describe('updateSettings', () => {
    it('creates new flags when none exist', async () => {
      const { svc, ff } = makeService();
      ff.findFirst.mockResolvedValue(null);
      ff.findMany.mockResolvedValue([
        { key: 'claude_worker_active', enabled: true },
      ]);

      await svc.updateSettings({ workerActive: true });

      expect(ff.create).toHaveBeenCalledWith({
        data: {
          key: 'claude_worker_active',
          enabled: true,
          workspaceId: null,
          description: 'Claude worker setting: claude_worker_active',
        },
      });
    });

    it('updates existing flags', async () => {
      const { svc, ff } = makeService();
      ff.findFirst.mockResolvedValue({ id: 'flag-1', key: 'claude_scanner_active', enabled: true });
      ff.findMany.mockResolvedValue([
        { key: 'claude_scanner_active', enabled: false },
      ]);

      await svc.updateSettings({ scannerActive: false });

      expect(ff.update).toHaveBeenCalledWith({
        where: { id: 'flag-1' },
        data: { enabled: false },
      });
    });

    it('handles multiple settings at once', async () => {
      const { svc, ff } = makeService();
      ff.findFirst
        .mockResolvedValueOnce(null)                                                     // worker
        .mockResolvedValueOnce({ id: 'f2', key: 'claude_deploy_next', enabled: false }); // deploy
      ff.findMany.mockResolvedValue([
        { key: 'claude_worker_active', enabled: true },
        { key: 'claude_deploy_next', enabled: true },
      ]);

      const result = await svc.updateSettings({ workerActive: true, deployNext: true });

      expect(ff.create).toHaveBeenCalledTimes(1);
      expect(ff.update).toHaveBeenCalledTimes(1);
      expect(result.workerActive).toBe(true);
      expect(result.deployNext).toBe(true);
    });
  });
});
