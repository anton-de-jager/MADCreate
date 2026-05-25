import { IsObject, IsOptional, IsString } from 'class-validator';

export class InstallIntegrationDto {
  @IsString() catalogKey!: string;
  @IsOptional() @IsObject() config?: Record<string, unknown>;
}
