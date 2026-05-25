import {
  Body, Controller, Get, Post, Patch, Delete, Param, ParseIntPipe,
  HttpCode, HttpStatus, Sse, Res, UploadedFiles, UseInterceptors, BadRequestException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import type { Response } from 'express';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import { ClaudeTasksService } from './claude-tasks.service';
import { StorageService } from '../storage/storage.service';
import {
  CreateClaudeTaskDto, UpdateClaudeTaskDto, ImportBulkClaudeTasksDto,
  UpdateClaudeSettingsDto,
} from './dto/claude-task.dto';

const ALLOWED_MIME = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'application/pdf', 'text/plain', 'text/csv', 'application/json',
]);
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

interface ClaudeTaskAttachment {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
}

@ApiTags('claude-tasks')
@ApiBearerAuth()
@Controller('claude-tasks')
export class ClaudeTasksController {
  constructor(
    private readonly service: ClaudeTasksService,
    private readonly storage: StorageService,
  ) {}

  @Get() findAll() { return this.service.findAll(); }

  /** 200 + {task} when work exists, 204 empty body when the queue is empty. */
  @Get('next')
  async findNext(@Res({ passthrough: true }) res: Response) {
    const result = await this.service.findNext();
    if (result.task === null) { res.status(HttpStatus.NO_CONTENT); return undefined; }
    return result;
  }

  @Post('import-bulk')
  importBulk(@Body() dto: ImportBulkClaudeTasksDto) { return this.service.importBulk(dto); }

  /** SSE stream that emits a ping on every task mutation. Clients reload on each event. */
  @Sse('events')
  events(): Observable<MessageEvent> {
    return new Observable((subscriber) => {
      const send = () => subscriber.next({ data: { ts: Date.now() } } as MessageEvent);
      const unsub = this.service.onTaskChange(send);
      // Heartbeat every 30s to keep the connection alive through proxies.
      const hb = setInterval(() => subscriber.next({ data: { heartbeat: true } } as MessageEvent), 30_000);
      return () => { unsub(); clearInterval(hb); };
    });
  }

  @Get('settings')
  getSettings() { return this.service.getSettings(); }

  @Patch('settings')
  updateSettings(@Body() dto: UpdateClaudeSettingsDto) { return this.service.updateSettings(dto); }

  // NOTE: keep ':id' routes AFTER 'next' / 'import-bulk' so ParseIntPipe
  // doesn't choke on those string segments.
  @Get(':id') findOne(@Param('id', ParseIntPipe) i: number) { return this.service.findOne(i); }
  @Post() create(@Body() dto: CreateClaudeTaskDto) { return this.service.create(dto); }
  @Patch(':id')
  update(@Param('id', ParseIntPipe) i: number, @Body() dto: UpdateClaudeTaskDto) {
    return this.service.update(i, dto);
  }
  @Delete(':id') @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) i: number) { return this.service.remove(i); }

  @Post(':id/attachments')
  @UseInterceptors(FilesInterceptor('files', 10, { limits: { fileSize: MAX_FILE_SIZE } }))
  async addAttachments(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    if (!files?.length) throw new BadRequestException('No files provided');
    const task = await this.service.findOne(id);
    const existing = ((task.attachments as unknown) as ClaudeTaskAttachment[] | null) ?? [];
    const added: ClaudeTaskAttachment[] = [];
    for (const file of files) {
      if (!ALLOWED_MIME.has(file.mimetype)) {
        throw new BadRequestException(`File type not allowed: ${file.mimetype}`);
      }
      // Store under the claude-tasks/<id>/ "tenant" prefix in the existing
      // local-disk storage. The StorageService URL bakes in the public base.
      const stored = await this.storage.put(`claude-tasks-${id}`, {
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        buffer: file.buffer,
      });
      added.push({
        filename: stored.key,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        url: stored.url,
      });
    }
    return this.service.update(id, { attachments: [...existing, ...added] as unknown as Prisma.InputJsonValue[] });
  }

  @Delete(':id/attachments/:filename') @HttpCode(HttpStatus.NO_CONTENT)
  async removeAttachment(
    @Param('id', ParseIntPipe) id: number,
    @Param('filename') filename: string,
  ) {
    const task = await this.service.findOne(id);
    const all = ((task.attachments as unknown) as ClaudeTaskAttachment[] | null) ?? [];
    const target  = all.find((a) => a.filename === filename || a.filename.endsWith('/' + filename));
    const kept    = all.filter((a) => a !== target);
    // Best-effort disk cleanup. A failed unlink shouldn't block the row
    // update — the worst case is an orphaned file the operator can prune.
    if (target) {
      try { await this.storage.delete(target.filename); }
      catch { /* swallow — task row still updates */ }
    }
    await this.service.update(id, { attachments: kept as unknown as Prisma.InputJsonValue[] });
  }
}
