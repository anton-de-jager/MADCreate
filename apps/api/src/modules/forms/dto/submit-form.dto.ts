import { IsEmail, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class SubmitFormDto {
  @IsString() formKey!: string;
  @IsOptional() @IsString() pageSlug?: string;
  @IsObject() data!: Record<string, unknown>;
  /** If absent, server falls back to data.email / data.phone / data.name */
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() @MaxLength(40) phone?: string;
  @IsOptional() @IsString() @MaxLength(200) name?: string;
}
