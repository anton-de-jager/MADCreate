import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantsService } from '../tenants/tenants.service';
import { AnalyticsEventKind, Prisma } from '@prisma/client';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService, private readonly tenants: TenantsService) {}

  /** Public ingest: called from rendered tenant sites. Tenant identified by request middleware. */
  async ingest(tenantId: string, evt: {
    kind: AnalyticsEventKind;
    pageSlug?: string;
    userKey?: string;
    sessionKey?: string;
    referrer?: string;
    userAgent?: string;
    ip?: string;
    payload?: unknown;
  }) {
    return this.prisma.analyticsEvent.create({
      data: {
        tenantId,
        kind: evt.kind,
        pageSlug: evt.pageSlug,
        userKey: evt.userKey,
        sessionKey: evt.sessionKey,
        referrer: evt.referrer,
        userAgent: evt.userAgent,
        ip: evt.ip,
        payload: evt.payload as Prisma.InputJsonValue,
      },
    });
  }

  async summary(userId: string, tenantId: string, days = 30) {
    await this.tenants.get(userId, tenantId);
    const since = new Date(Date.now() - days * 86_400_000);
    const [views, conversions, aiGens, deploys] = await Promise.all([
      this.prisma.analyticsEvent.count({ where: { tenantId, kind: 'PAGE_VIEW', occurredAt: { gte: since } } }),
      this.prisma.analyticsEvent.count({ where: { tenantId, kind: 'CONVERSION', occurredAt: { gte: since } } }),
      this.prisma.aIGeneration.count({ where: { tenantId, createdAt: { gte: since } } }),
      this.prisma.deployment.count({ where: { tenantId, createdAt: { gte: since } } }),
    ]);
    return { since, views, conversions, aiGenerations: aiGens, deployments: deploys };
  }

  async timeline(userId: string, tenantId: string, days = 14) {
    await this.tenants.get(userId, tenantId);
    const since = new Date(Date.now() - days * 86_400_000);
    const events = await this.prisma.analyticsEvent.groupBy({
      by: ['kind'],
      where: { tenantId, occurredAt: { gte: since } },
      _count: { _all: true },
    });
    return { since, byKind: events.map((e) => ({ kind: e.kind, count: e._count._all })) };
  }

  async timeseries(userId: string, tenantId: string, days = 28) {
    await this.tenants.get(userId, tenantId);
    const since = new Date(Date.now() - days * 86_400_000);
    const rows: { day: string; views: bigint; conversions: bigint }[] = await this.prisma.$queryRaw`
      SELECT DATE(occurredAt) as day,
             SUM(CASE WHEN kind = 'PAGE_VIEW' THEN 1 ELSE 0 END) as views,
             SUM(CASE WHEN kind = 'CONVERSION' THEN 1 ELSE 0 END) as conversions
      FROM AnalyticsEvent
      WHERE tenantId = ${tenantId} AND occurredAt >= ${since}
      GROUP BY DATE(occurredAt)
      ORDER BY day ASC
    `;
    return rows.map((r) => ({ day: r.day, views: Number(r.views), conversions: Number(r.conversions) }));
  }

  async topPages(userId: string, tenantId: string, days = 28, limit = 10) {
    await this.tenants.get(userId, tenantId);
    const since = new Date(Date.now() - days * 86_400_000);
    const rows: { pageSlug: string; views: bigint; conversions: bigint }[] = await this.prisma.$queryRaw`
      SELECT pageSlug,
             SUM(CASE WHEN kind = 'PAGE_VIEW' THEN 1 ELSE 0 END) as views,
             SUM(CASE WHEN kind = 'CONVERSION' THEN 1 ELSE 0 END) as conversions
      FROM AnalyticsEvent
      WHERE tenantId = ${tenantId} AND occurredAt >= ${since} AND pageSlug IS NOT NULL
      GROUP BY pageSlug
      ORDER BY views DESC
      LIMIT ${limit}
    `;
    return rows.map((r) => ({
      path: r.pageSlug,
      views: Number(r.views),
      conversions: Number(r.conversions),
      conversionRate: Number(r.views) > 0 ? Math.round((Number(r.conversions) / Number(r.views)) * 10000) / 100 : 0,
    }));
  }

  async referrers(userId: string, tenantId: string, days = 28, limit = 10) {
    await this.tenants.get(userId, tenantId);
    const since = new Date(Date.now() - days * 86_400_000);
    const rows: { referrer: string; count: bigint }[] = await this.prisma.$queryRaw`
      SELECT referrer, COUNT(*) as count
      FROM AnalyticsEvent
      WHERE tenantId = ${tenantId} AND occurredAt >= ${since} AND referrer IS NOT NULL AND referrer != ''
      GROUP BY referrer
      ORDER BY count DESC
      LIMIT ${limit}
    `;
    return rows.map((r) => ({ referrer: r.referrer, count: Number(r.count) }));
  }
}
