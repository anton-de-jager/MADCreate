import { Observable } from 'rxjs';
import type { Response } from 'express';
import { Prisma } from '@prisma/client';
import { ClaudeTasksService } from './claude-tasks.service';
import { StorageService } from '../storage/storage.service';
import { CreateClaudeTaskDto, UpdateClaudeTaskDto, ImportBulkClaudeTasksDto, UpdateClaudeSettingsDto } from './dto/claude-task.dto';
export declare class ClaudeTasksController {
    private readonly service;
    private readonly storage;
    constructor(service: ClaudeTasksService, storage: StorageService);
    findAll(): Promise<{
        status: import("@prisma/client").$Enums.ClaudeTaskStatus;
        id: number;
        createdAt: Date;
        updatedAt: Date;
        attachments: Prisma.JsonValue | null;
        priority: number;
        description: string | null;
        title: string;
        notes: string | null;
    }[]>;
    findNext(res: Response): Promise<{
        task: import("@prisma/client").ClaudeTask | null;
    } | undefined>;
    importBulk(dto: ImportBulkClaudeTasksDto): Promise<{
        created: number;
        skipped: number;
        createdIndexes: number[];
        skippedTitles: string[];
    }>;
    events(): Observable<MessageEvent>;
    getSettings(): Promise<{
        workerActive: boolean;
        scannerActive: boolean;
        deployNext: boolean;
    }>;
    updateSettings(dto: UpdateClaudeSettingsDto): Promise<{
        workerActive: boolean;
        scannerActive: boolean;
        deployNext: boolean;
    }>;
    findOne(i: number): Promise<{
        status: import("@prisma/client").$Enums.ClaudeTaskStatus;
        id: number;
        createdAt: Date;
        updatedAt: Date;
        attachments: Prisma.JsonValue | null;
        priority: number;
        description: string | null;
        title: string;
        notes: string | null;
    }>;
    create(dto: CreateClaudeTaskDto): Promise<{
        status: import("@prisma/client").$Enums.ClaudeTaskStatus;
        id: number;
        createdAt: Date;
        updatedAt: Date;
        attachments: Prisma.JsonValue | null;
        priority: number;
        description: string | null;
        title: string;
        notes: string | null;
    }>;
    update(i: number, dto: UpdateClaudeTaskDto): Promise<{
        status: import("@prisma/client").$Enums.ClaudeTaskStatus;
        id: number;
        createdAt: Date;
        updatedAt: Date;
        attachments: Prisma.JsonValue | null;
        priority: number;
        description: string | null;
        title: string;
        notes: string | null;
    }>;
    remove(i: number): Promise<void>;
    addAttachments(id: number, files: Express.Multer.File[]): Promise<{
        status: import("@prisma/client").$Enums.ClaudeTaskStatus;
        id: number;
        createdAt: Date;
        updatedAt: Date;
        attachments: Prisma.JsonValue | null;
        priority: number;
        description: string | null;
        title: string;
        notes: string | null;
    }>;
    removeAttachment(id: number, filename: string): Promise<void>;
}
