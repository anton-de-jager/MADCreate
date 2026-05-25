import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ThemesService } from './themes.service';
import type { JwtPayload } from '@madcreate/shared';

class CreateThemeDto {
  @IsString() name!: string;
  tokens!: unknown;
}

class UpdateThemeDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() tokens?: unknown;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

@ApiTags('themes')
@ApiBearerAuth()
@Controller('themes')
export class ThemesController {
  constructor(private readonly themes: ThemesService) {}

  @Get()
  list(@CurrentUser() user: JwtPayload, @Query('tenantId') tenantId: string) {
    return this.themes.list(user.sub, tenantId);
  }

  @Get(':id')
  get(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.themes.get(user.sub, id);
  }

  @Post()
  create(@CurrentUser() user: JwtPayload, @Query('tenantId') tenantId: string, @Body() dto: CreateThemeDto) {
    return this.themes.create(user.sub, tenantId, dto);
  }

  @Patch(':id')
  update(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: UpdateThemeDto) {
    return this.themes.update(user.sub, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.themes.remove(user.sub, id);
  }
}
