import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateLeadDto {
  @IsOptional() @IsString() status?: string;   // 'new'|'contacted'|'qualified'|'won'|'lost'
  @IsOptional() @IsString() @MaxLength(200) name?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() @MaxLength(40) phone?: string;
}
