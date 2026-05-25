import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateTemplateDto {
  @IsString() @MaxLength(200) name!: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsString() content!: string;
}

export class UpdateTemplateDto {
  @IsOptional() @IsString() @MaxLength(200) name?: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsOptional() @IsString() content?: string;
}
