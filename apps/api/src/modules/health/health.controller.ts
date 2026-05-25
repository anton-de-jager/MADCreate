import { Controller, Get, Inject } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type Redis from 'ioredis';
import { Public } from '../../common/decorators/public.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { REDIS_CLIENT } from '../../redis/redis.module';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  @Public()
  @Get()
  alive() {
    return { status: 'ok', service: 'madcreate-api', time: new Date().toISOString() };
  }

  @Public()
  @Get('ready')
  async ready() {
    const checks: Record<string, 'ok' | string> = {};
    try { await this.prisma.$queryRawUnsafe('SELECT 1'); checks.db = 'ok'; } catch (e) { checks.db = (e as Error).message; }
    try { await this.redis.ping(); checks.redis = 'ok'; } catch (e) { checks.redis = (e as Error).message; }
    const allOk = Object.values(checks).every((v) => v === 'ok');
    return { status: allOk ? 'ready' : 'degraded', checks };
  }
}
