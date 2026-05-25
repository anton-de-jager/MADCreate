import { IsEnum, IsOptional, IsString } from 'class-validator';
import { BillingInterval } from '@prisma/client';

export class CheckoutDto {
  @IsString() workspaceId!: string;
  @IsString() planCode!: string;
  @IsOptional() @IsEnum(BillingInterval) interval?: BillingInterval;
}

export class PortalDto {
  @IsString() workspaceId!: string;
}
