import { Body, Controller, Get, Param, Post, Query, Sse } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { Observable } from 'rxjs';
import { DeploymentTarget } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { DeploymentsService } from './deployments.service';
import type { JwtPayload } from '@madcreate/shared';

class TriggerDeploymentDto {
  @IsOptional() @IsString() siteId?: string;
  @IsEnum(DeploymentTarget) target!: DeploymentTarget;
  @IsOptional() config?: Record<string, unknown>;
}

@ApiTags('deployments')
@ApiBearerAuth()
@Controller('deployments')
export class DeploymentsController {
  constructor(private readonly deployments: DeploymentsService) {}

  /** SSE stream that emits a ping on every deployment mutation. */
  @Sse('events')
  events(): Observable<MessageEvent> {
    return new Observable((subscriber) => {
      const send = () => subscriber.next({ data: { ts: Date.now() } } as MessageEvent);
      const unsub = this.deployments.onChange(send);
      const hb = setInterval(() => subscriber.next({ data: { heartbeat: true } } as MessageEvent), 30_000);
      return () => { unsub(); clearInterval(hb); };
    });
  }

  @Get()
  list(@CurrentUser() u: JwtPayload, @Query('tenantId') tenantId: string) { return this.deployments.list(u.sub, tenantId); }
  @Get(':id')
  get(@CurrentUser() u: JwtPayload, @Param('id') id: string) { return this.deployments.get(u.sub, id); }
  @Post()
  trigger(@CurrentUser() u: JwtPayload, @Query('tenantId') tenantId: string, @Body() dto: TriggerDeploymentDto) {
    return this.deployments.trigger(u.sub, tenantId, dto);
  }
  @Post(':id/cancel')
  cancel(@CurrentUser() u: JwtPayload, @Param('id') id: string) { return this.deployments.cancel(u.sub, id); }
}
