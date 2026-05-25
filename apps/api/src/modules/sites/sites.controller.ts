import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { SiteStatus } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SitesService } from './sites.service';
import type { JwtPayload } from '@madcreate/shared';

class CreateSiteDto {
  @IsString() name!: string;
  @IsOptional() @IsString() themeId?: string;
}

class UpdateSiteDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() themeId?: string;
  @IsOptional() navigation?: unknown;
  @IsOptional() settings?: unknown;
  @IsOptional() @IsEnum(SiteStatus) status?: SiteStatus;
}

@ApiTags('sites')
@ApiBearerAuth()
@Controller('sites')
export class SitesController {
  constructor(private readonly sites: SitesService) {}

  @Get()
  list(@CurrentUser() user: JwtPayload, @Query('tenantId') tenantId: string) {
    return this.sites.list(user.sub, tenantId);
  }

  @Get(':id')
  get(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.sites.get(user.sub, id);
  }

  @Post()
  create(@CurrentUser() user: JwtPayload, @Query('tenantId') tenantId: string, @Body() dto: CreateSiteDto) {
    return this.sites.create(user.sub, tenantId, dto);
  }

  @Patch(':id')
  update(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: UpdateSiteDto) {
    return this.sites.update(user.sub, id, dto);
  }

  @Post(':id/publish')
  publish(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.sites.publish(user.sub, id);
  }

  @Delete(':id')
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.sites.remove(user.sub, id);
  }
}
