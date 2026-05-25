import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { LeadsService } from './leads.service';
import { UpdateLeadDto } from './dto/update-lead.dto';
import type { JwtPayload } from '@madcreate/shared';

@ApiTags('leads')
@ApiBearerAuth()
@Controller('leads')
export class LeadsController {
  constructor(private readonly service: LeadsService) {}

  @Get()
  list(
    @CurrentUser() u: JwtPayload,
    @Query('tenantId') tenantId: string,
    @Query('status') status?: string,
  ) {
    return this.service.list(u.sub, tenantId, { status });
  }

  @Patch(':id')
  update(
    @CurrentUser() u: JwtPayload,
    @Query('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateLeadDto,
  ) {
    return this.service.update(u.sub, tenantId, id, dto);
  }
}
