import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AnalyticsService } from './analytics.service';
import { IngestEventDto } from './dto/ingest-event.dto';
import type { JwtPayload } from '@madcreate/shared';

@ApiTags('analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  // Public: tenant sites POST here. Tenant resolution happens via the middleware
  // (hostname → tenant) or via explicit ?tenantId for previews.
  @Public()
  @Throttle({ short: { limit: 30, ttl: 60_000 } })
  @Post('ingest')
  ingest(
    @Req() req: Request,
    @Body() body: IngestEventDto,
    @Query('tenantId') tenantId?: string,
  ) {
    const id = tenantId ?? req.tenant?.id;
    if (!id) return { ok: false };
    return this.analytics.ingest(id, {
      kind: body.kind,
      pageSlug: body.pageSlug,
      userKey: body.userKey,
      sessionKey: body.sessionKey,
      referrer: req.header('referer') ?? undefined,
      userAgent: req.header('user-agent') ?? undefined,
      ip: req.ip,
      payload: body.payload,
    });
  }

  @ApiBearerAuth()
  @Get('summary')
  summary(@CurrentUser() u: JwtPayload, @Query('tenantId') tenantId: string, @Query('days') days?: string) {
    return this.analytics.summary(u.sub, tenantId, days ? Number(days) : undefined);
  }

  @ApiBearerAuth()
  @Get('timeline')
  timeline(@CurrentUser() u: JwtPayload, @Query('tenantId') tenantId: string, @Query('days') days?: string) {
    return this.analytics.timeline(u.sub, tenantId, days ? Number(days) : undefined);
  }

  @ApiBearerAuth()
  @Get('timeseries')
  timeseries(@CurrentUser() u: JwtPayload, @Query('tenantId') tenantId: string, @Query('days') days?: string) {
    return this.analytics.timeseries(u.sub, tenantId, days ? Number(days) : undefined);
  }

  @ApiBearerAuth()
  @Get('top-pages')
  topPages(@CurrentUser() u: JwtPayload, @Query('tenantId') tenantId: string, @Query('days') days?: string) {
    return this.analytics.topPages(u.sub, tenantId, days ? Number(days) : undefined);
  }

  @ApiBearerAuth()
  @Get('referrers')
  referrers(@CurrentUser() u: JwtPayload, @Query('tenantId') tenantId: string, @Query('days') days?: string) {
    return this.analytics.referrers(u.sub, tenantId, days ? Number(days) : undefined);
  }
}
