import { IsEnum, IsOptional, IsString } from 'class-validator';
import { AnalyticsEventKind } from '@prisma/client';

export class IngestEventDto {
  @IsEnum(AnalyticsEventKind) kind!: AnalyticsEventKind;
  @IsOptional() @IsString() pageSlug?: string;
  @IsOptional() @IsString() userKey?: string;
  @IsOptional() @IsString() sessionKey?: string;
  @IsOptional() payload?: unknown;
}
