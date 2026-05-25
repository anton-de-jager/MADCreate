import { Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter } from 'events';
import { PrismaService } from '../../prisma/prisma.service';
import { ClaudeTask, ClaudeTaskStatus, Prisma } from '@prisma/client';
import {
  CreateClaudeTaskDto, UpdateClaudeTaskDto, ImportBulkClaudeTasksDto,
  UpdateClaudeSettingsDto,
} from './dto/claude-task.dto';

const ACTIVE = [ClaudeTaskStatus.PENDING, ClaudeTaskStatus.IN_PROGRESS] as const;

/**
 *  PENDING        — queued, no worker has claimed it
 *  IN_PROGRESS    — actively being worked on
 *  TO_BE_DEPLOYED — done locally but not deployed; NOT picked up by findNext()
 *  COMPLETED      — done and deployed
 *  CANCELLED      — abandoned by operator
 *  FAILED         — worker tried and could not finish; terminal until operator
 *                   reviews. NOT picked up by findNext() (no infinite retry).
 *  DEFERRED       — worker needs operator input before continuing. Operator
 *                   adds a reply to notes and flips back to PENDING when ready.
 */
@Injectable()
export class ClaudeTasksService {
  private readonly events = new EventEmitter();

  constructor(private readonly prisma: PrismaService) {
    this.events.setMaxListeners(50);
  }

  /** Subscribe to task-change events for SSE. */
  onTaskChange(listener: () => void): () => void {
    this.events.on('change', listener);
    return () => this.events.off('change', listener);
  }

  private emitChange() { this.events.emit('change'); }

  /**
   * Returns all tasks sorted into 3 buckets in one query:
   *   0 = PENDING|IN_PROGRESS  (priority ASC, createdAt ASC — oldest first within priority)
   *   1 = TO_BE_DEPLOYED       (priority ASC, createdAt ASC)
   *   2 = COMPLETED|CANCELLED  (createdAt DESC — newest first)
   *
   * Prisma's orderBy can't compose CASE expressions, so we fetch with a
   * simple sort and re-bucket in memory. The table is small (queue, not
   * activity log) so this is fine.
   */
  async findAll() {
    const rows = await this.prisma.claudeTask.findMany({
      orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
    });
    // Bucket 2 contains all terminal statuses: COMPLETED, CANCELLED, FAILED.
    // findNext() pulls from bucket 0 only — FAILED tasks sit in bucket 2
    // until an operator reviews and (optionally) re-queues them.
    const bucket = (s: ClaudeTaskStatus) =>
      s === 'PENDING' || s === 'IN_PROGRESS' || s === 'DEFERRED' ? 0 :
      s === 'TO_BE_DEPLOYED' ? 1 : 2;
    return rows.sort((a, b) => {
      const ba = bucket(a.status), bb = bucket(b.status);
      if (ba !== bb) return ba - bb;
      // Within active/deploy buckets: priority ASC, then createdAt ASC (oldest first).
      if (ba < 2) {
        if (a.priority !== b.priority) return a.priority - b.priority;
        return a.createdAt.getTime() - b.createdAt.getTime();
      }
      // Within done bucket: createdAt DESC (newest first).
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
  }

  /** Worker poll endpoint. Object-wrapped so a 204 stays JSON-parseable. */
  async findNext(): Promise<{ task: ClaudeTask | null }> {
    const task = await this.prisma.claudeTask.findFirst({
      where: { status: { in: ACTIVE as unknown as ClaudeTaskStatus[] } },
      orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
    });
    return { task: task ?? null };
  }

  async findOne(id: number) {
    const t = await this.prisma.claudeTask.findUnique({ where: { id } });
    if (!t) throw new NotFoundException(`Task #${id} not found`);
    return t;
  }

  async create(dto: CreateClaudeTaskDto) {
    const task = await this.prisma.claudeTask.create({
      data: {
        title: dto.title,
        description: dto.description ?? null,
        notes: dto.notes ?? null,
        status: (dto.status as ClaudeTaskStatus) ?? ClaudeTaskStatus.PENDING,
        priority: dto.priority ?? 3,
      },
    });
    this.emitChange();
    return task;
  }

  /**
   * Partial update. Only assigns fields that are !== undefined. The worker
   * PATCHes bodies like { status: 'IN_PROGRESS' } and we must not blow away
   * description/notes/etc.
   */
  async update(id: number, dto: UpdateClaudeTaskDto) {
    await this.findOne(id); // throw on miss
    const data: Prisma.ClaudeTaskUpdateInput = {};
    if (dto.title       !== undefined) data.title       = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.notes       !== undefined) data.notes       = dto.notes;
    if (dto.status      !== undefined) data.status      = dto.status as ClaudeTaskStatus;
    if (dto.attachments !== undefined) data.attachments = dto.attachments;
    if (dto.priority    !== undefined) data.priority    = dto.priority;
    const task = await this.prisma.claudeTask.update({ where: { id }, data });
    this.emitChange();
    return task;
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.claudeTask.delete({ where: { id } });
    this.emitChange();
  }

  /**
   * Bulk-create PENDING rows. Dedup by trim+lowercase title against the
   * current active queue AND within the incoming payload.
   * Respects the scanner toggle — if disabled, silently skips all items.
   */
  async importBulk(dto: ImportBulkClaudeTasksDto) {
    // Scanner-sourced imports respect the scanner toggle; error-reporter
    // imports (from the frontend) are always allowed through.
    if (dto.source !== 'error-reporter') {
      const settings = await this.getSettings();
      if (!settings.scannerActive) {
        return { created: 0, skipped: dto.items.length, createdIndexes: [], skippedTitles: dto.items.map((i) => i.title) };
      }
    }

    const active = await this.prisma.claudeTask.findMany({
      where: { status: { in: ACTIVE as unknown as ClaudeTaskStatus[] } },
      select: { title: true },
    });
    const activeTitles = new Set(active.map((t) => t.title.trim().toLowerCase()));
    const seen = new Set<string>();
    const createdIndexes: number[] = [];
    const skippedTitles: string[] = [];

    for (const item of dto.items) {
      const key = item.title.trim().toLowerCase();
      if (activeTitles.has(key) || seen.has(key)) {
        skippedTitles.push(item.title);
        continue;
      }
      seen.add(key);
      const saved = await this.prisma.claudeTask.create({
        data: {
          title: item.title.trim(),
          description: item.description ?? null,
          notes: item.notes ?? null,
          status: ClaudeTaskStatus.PENDING,
          priority: item.priority ?? 3,
        },
      });
      createdIndexes.push(saved.id);
    }

    if (createdIndexes.length > 0) this.emitChange();
    return {
      created: createdIndexes.length,
      skipped: skippedTitles.length,
      createdIndexes,
      skippedTitles,
    };
  }

  // ---------------------------------------------------------------------------
  // Claude worker settings (stored as global FeatureFlags, workspaceId=null)
  // ---------------------------------------------------------------------------

  private static readonly SETTING_KEYS = [
    'claude_worker_active',
    'claude_scanner_active',
    'claude_deploy_next',
  ] as const;

  async getSettings(): Promise<{ workerActive: boolean; scannerActive: boolean; deployNext: boolean }> {
    const flags = await this.prisma.featureFlag.findMany({
      where: { key: { in: [...ClaudeTasksService.SETTING_KEYS] }, workspaceId: null },
    });
    const map = new Map(flags.map((f) => [f.key, f.enabled]));
    return {
      workerActive: map.get('claude_worker_active') ?? false,
      scannerActive: map.get('claude_scanner_active') ?? false,
      deployNext: map.get('claude_deploy_next') ?? false,
    };
  }

  async updateSettings(dto: UpdateClaudeSettingsDto) {
    const updates: Array<{ key: string; enabled: boolean }> = [];
    if (dto.workerActive !== undefined) updates.push({ key: 'claude_worker_active', enabled: dto.workerActive });
    if (dto.scannerActive !== undefined) updates.push({ key: 'claude_scanner_active', enabled: dto.scannerActive });
    if (dto.deployNext !== undefined) updates.push({ key: 'claude_deploy_next', enabled: dto.deployNext });

    for (const u of updates) {
      const existing = await this.prisma.featureFlag.findFirst({
        where: { key: u.key, workspaceId: null },
      });
      if (existing) {
        await this.prisma.featureFlag.update({ where: { id: existing.id }, data: { enabled: u.enabled } });
      } else {
        await this.prisma.featureFlag.create({
          data: { key: u.key, enabled: u.enabled, workspaceId: null, description: `Claude worker setting: ${u.key}` },
        });
      }
    }

    return this.getSettings();
  }
}
