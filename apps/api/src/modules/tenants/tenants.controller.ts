import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { TenantsService } from './tenants.service';
import type { JwtPayload } from '@madcreate/shared';

class CreateTenantDto {
  @IsString() slug!: string;
  @IsString() name!: string;
  @IsOptional() @IsString() industry?: string;
  @IsOptional() @IsString() description?: string;
}

class UpdateTenantDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() industry?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() branding?: unknown;
}

@ApiTags('tenants')
@ApiBearerAuth()
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenants: TenantsService) {}

  @Get()
  list(@CurrentUser() user: JwtPayload, @Query('workspaceId') workspaceId: string) {
    return this.tenants.list(user.sub, workspaceId);
  }

  @Get(':id')
  get(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.tenants.get(user.sub, id);
  }

  @Post()
  create(
    @CurrentUser() user: JwtPayload,
    @Query('workspaceId') workspaceId: string,
    @Body() dto: CreateTenantDto,
  ) {
    return this.tenants.create(user.sub, workspaceId, dto);
  }

  @Patch(':id')
  update(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: UpdateTenantDto) {
    return this.tenants.update(user.sub, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.tenants.remove(user.sub, id);
  }

  /**
   * Hard-delete a single soft-deleted tenant. Super-admin only.
   * Only succeeds if the tenant was soft-deleted more than 30 days ago.
   */
  @Post('purge-expired')
  purgeExpired(@CurrentUser() user: JwtPayload) {
    return this.tenants.purgeAll(user.sub);
  }

  @Post(':id/purge')
  purge(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.tenants.purge(user.sub, id);
  }
}
