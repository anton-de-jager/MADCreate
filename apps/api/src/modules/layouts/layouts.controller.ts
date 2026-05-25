import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { LayoutsService } from './layouts.service';
import { CreateLayoutDto } from './dto/create-layout.dto';
import { UpdateLayoutDto } from './dto/update-layout.dto';
import type { JwtPayload } from '@madcreate/shared';

@ApiTags('layouts')
@ApiBearerAuth()
@Controller('layouts')
export class LayoutsController {
  constructor(private readonly layouts: LayoutsService) {}

  @Get() list(@CurrentUser() u: JwtPayload, @Query('tenantId') tenantId: string) { return this.layouts.list(u.sub, tenantId); }
  @Get(':id') get(@CurrentUser() u: JwtPayload, @Param('id') id: string) { return this.layouts.get(u.sub, id); }
  @Post() create(@CurrentUser() u: JwtPayload, @Query('tenantId') tenantId: string, @Body() dto: CreateLayoutDto) {
    return this.layouts.create(u.sub, tenantId, dto);
  }
  @Patch(':id') update(@CurrentUser() u: JwtPayload, @Param('id') id: string, @Body() dto: UpdateLayoutDto) {
    return this.layouts.update(u.sub, id, dto);
  }
}
