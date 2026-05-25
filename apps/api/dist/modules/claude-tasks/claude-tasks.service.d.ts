import { PrismaService } from '../../prisma/prisma.service';
import { ClaudeTask, Prisma } from '@prisma/client';
import { CreateClaudeTaskDto, UpdateClaudeTaskDto, ImportBulkClaudeTasksDto, UpdateClaudeSettingsDto } from './dto/claude-task.dto';
export declare class ClaudeTasksService {
    private readonly prisma;
    private readonly events;
    constructor(prisma: PrismaService);
    onTaskChange(listener: () => void): () => void;
    private emitChange;
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
    findNext(): Promise<{
        task: ClaudeTask | null;
    }>;
    findOne(id: number): Promise<{
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
    update(id: number, dto: UpdateClaudeTaskDto): Promise<{
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
    remove(id: number): Promise<void>;
    importBulk(dto: ImportBulkClaudeTasksDto): Promise<{
        created: number;
        skipped: number;
        createdIndexes: number[];
        skippedTitles: string[];
    }>;
    private static readonly SETTING_KEYS;
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
}
