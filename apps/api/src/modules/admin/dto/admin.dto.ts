import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class SetFlagDto {
  @IsString() key!: string;
  @IsBoolean() enabled!: boolean;
  @IsOptional() @IsString() workspaceId?: string;
}
