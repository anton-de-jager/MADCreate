import {
  IsString, IsOptional, IsIn, MaxLength, IsArray, ValidateNested,
  ArrayMaxSize, ArrayNotEmpty, IsInt, Min, Max, IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Prisma } from '@prisma/client';

const STATUSES = ['PENDING', 'IN_PROGRESS', 'TO_BE_DEPLOYED', 'COMPLETED', 'CANCELLED', 'FAILED', 'DEFERRED'] as const;

export class CreateClaudeTaskDto {
  @IsString() @MaxLength(300) title!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() @IsIn(STATUSES as unknown as string[]) status?: string;
  @IsOptional() @IsInt() @Min(1) @Max(4) priority?: number;
}

export class UpdateClaudeTaskDto {
  @IsOptional() @IsString() @MaxLength(300) title?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() @IsIn(STATUSES as unknown as string[]) status?: string;
  @IsOptional() @IsArray() attachments?: Prisma.InputJsonValue[];
  @IsOptional() @IsInt() @Min(1) @Max(4) priority?: number;
}

export class ImportBulkItemDto {
  @IsString() @MaxLength(300) title!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsInt() @Min(1) @Max(4) priority?: number;
}

export class ImportBulkClaudeTasksDto {
  @IsArray() @ArrayNotEmpty() @ArrayMaxSize(200)
  @ValidateNested({ each: true }) @Type(() => ImportBulkItemDto)
  items!: ImportBulkItemDto[];
  @IsOptional() @IsString() source?: string;
}

export class UpdateClaudeSettingsDto {
  @IsOptional() @IsBoolean() workerActive?: boolean;
  @IsOptional() @IsBoolean() scannerActive?: boolean;
  @IsOptional() @IsBoolean() deployNext?: boolean;
}
