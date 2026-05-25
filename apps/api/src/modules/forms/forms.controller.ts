import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { FormsService } from './forms.service';
import { SubmitFormDto } from './dto/submit-form.dto';
import type { JwtPayload } from '@madcreate/shared';

@ApiTags('forms')
@Controller('forms')
export class FormsController {
  constructor(private readonly service: FormsService) {}

  /** Public submission endpoint — rendered tenant sites post here. */
  @Public()
  @Throttle({ short: { limit: 10, ttl: 60_000 } })
  @Post()
  submit(@Body() dto: SubmitFormDto, @Query('tenantId') tenantId: string, @Req() req: Request) {
    return this.service.submit(tenantId, dto, req);
  }

  @ApiBearerAuth()
  @Get()
  list(@CurrentUser() u: JwtPayload, @Query('tenantId') tenantId: string) {
    return this.service.listSubmissions(u.sub, tenantId);
  }
}
