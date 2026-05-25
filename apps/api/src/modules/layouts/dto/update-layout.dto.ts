import { IsBoolean, IsObject, IsOptional, IsString } from 'class-validator';

export class UpdateLayoutDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsObject() schema?: Record<string, unknown>;
  @IsOptional() @IsBoolean() isDefault?: boolean;
}
