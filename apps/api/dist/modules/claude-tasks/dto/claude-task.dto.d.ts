import { Prisma } from '@prisma/client';
export declare class CreateClaudeTaskDto {
    title: string;
    description?: string;
    notes?: string;
    status?: string;
    priority?: number;
}
export declare class UpdateClaudeTaskDto {
    title?: string;
    description?: string;
    notes?: string;
    status?: string;
    attachments?: Prisma.InputJsonValue[];
    priority?: number;
}
export declare class ImportBulkItemDto {
    title: string;
    description?: string;
    notes?: string;
    priority?: number;
}
export declare class ImportBulkClaudeTasksDto {
    items: ImportBulkItemDto[];
    source?: string;
}
export declare class UpdateClaudeSettingsDto {
    workerActive?: boolean;
    scannerActive?: boolean;
    deployNext?: boolean;
}
