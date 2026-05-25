import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsEnum, IsString } from 'class-validator';
import { DomainType } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { DomainsService } from './domains.service';
import type { JwtPayload } from '@madcreate/shared';

class AddDomainDto {
  @IsString() hostname!: string;
  @IsEnum(DomainType) type!: DomainType;
}

@ApiTags('domains')
@ApiBearerAuth()
@Controller('domains')
export class DomainsController {
  constructor(private readonly domains: DomainsService) {}

  @Get()
  list(@CurrentUser() user: JwtPayload, @Query('tenantId') tenantId: string) {
    return this.domains.list(user.sub, tenantId);
  }

  @Post()
  add(@CurrentUser() user: JwtPayload, @Query('tenantId') tenantId: string, @Body() dto: AddDomainDto) {
    return this.domains.add(user.sub, tenantId, dto);
  }

  @Get(':id/instructions')
  instructions(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.domains.instructions(user.sub, id);
  }

  @Post(':id/verify')
  verify(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.domains.verify(user.sub, id);
  }

  @Delete(':id')
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.domains.remove(user.sub, id);
  }
}
