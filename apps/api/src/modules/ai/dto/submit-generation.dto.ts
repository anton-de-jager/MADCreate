import { IsObject, IsOptional, IsString } from 'class-validator';

export class SubmitGenerationDto {
  @IsOptional()
  @IsString()
  raw?: string;

  @IsOptional()
  @IsObject()
  json?: object;
}
