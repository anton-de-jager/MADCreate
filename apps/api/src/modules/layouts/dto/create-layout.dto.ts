import { IsBoolean, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateLayoutDto {
  @IsString() @IsNotEmpty() name!: string;
  @IsObject() schema!: Record<string, unknown>;
  @IsOptional() @IsBoolean() isDefault?: boolean;
}
