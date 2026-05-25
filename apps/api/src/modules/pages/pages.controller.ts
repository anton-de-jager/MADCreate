import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { PageStatus } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PagesService } from './pages.service';
import type { JwtPayload } from '@madcreate/shared';

class CreatePageDto {
  @IsString() slug!: string;
  @IsString() title!: string;
  @IsOptional() @IsString() layoutId?: string;
  @IsOptional() @IsInt() order?: number;
  @IsOptional() schema?: unknown;
}

class UpdatePageDto {
  @IsOptional() @IsString() slug?: string;
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() metaTitle?: string;
  @IsOptional() @IsString() metaDescription?: string;
  @IsOptional() @IsString() ogImageUrl?: string;
  @IsOptional() @IsInt() order?: number;
  @IsOptional() @IsString() layoutId?: string;
  @IsOptional() schema?: unknown;
  @IsOptional() @IsEnum(PageStatus) status?: PageStatus;
}

@ApiTags('pages')
@ApiBearerAuth()
@Controller('pages')
export class PagesController {
  constructor(private readonly pages: PagesService) {}

  @Get()
  list(@CurrentUser() user: JwtPayload, @Query('siteId') siteId: string) {
    return this.pages.list(user.sub, siteId);
  }

  @Get(':id')
  get(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.pages.get(user.sub, id);
  }

  @Post()
  create(@CurrentUser() user: JwtPayload, @Query('siteId') siteId: string, @Body() dto: CreatePageDto) {
    return this.pages.create(user.sub, siteId, dto);
  }

  @Patch(':id')
  update(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: UpdatePageDto) {
    return this.pages.update(user.sub, id, dto);
  }

  @Post(':id/publish')
  publish(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.pages.publish(user.sub, id);
  }

  @Delete(':id')
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.pages.remove(user.sub, id);
  }
}
