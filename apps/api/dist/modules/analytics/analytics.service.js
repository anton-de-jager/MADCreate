"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const tenants_service_1 = require("../tenants/tenants.service");
let AnalyticsService = class AnalyticsService {
    prisma;
    tenants;
    constructor(prisma, tenants) {
        this.prisma = prisma;
        this.tenants = tenants;
    }
    async ingest(tenantId, evt) {
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
                payload: evt.payload,
            },
        });
    }
    async summary(userId, tenantId, days = 30) {
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
    async timeline(userId, tenantId, days = 14) {
        await this.tenants.get(userId, tenantId);
        const since = new Date(Date.now() - days * 86_400_000);
        const events = await this.prisma.analyticsEvent.groupBy({
            by: ['kind'],
            where: { tenantId, occurredAt: { gte: since } },
            _count: { _all: true },
        });
        return { since, byKind: events.map((e) => ({ kind: e.kind, count: e._count._all })) };
    }
    async timeseries(userId, tenantId, days = 28) {
        await this.tenants.get(userId, tenantId);
        const since = new Date(Date.now() - days * 86_400_000);
        const rows = await this.prisma.$queryRaw `
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
    async topPages(userId, tenantId, days = 28, limit = 10) {
        await this.tenants.get(userId, tenantId);
        const since = new Date(Date.now() - days * 86_400_000);
        const rows = await this.prisma.$queryRaw `
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
    async referrers(userId, tenantId, days = 28, limit = 10) {
        await this.tenants.get(userId, tenantId);
        const since = new Date(Date.now() - days * 86_400_000);
        const rows = await this.prisma.$queryRaw `
      SELECT referrer, COUNT(*) as count
      FROM AnalyticsEvent
      WHERE tenantId = ${tenantId} AND occurredAt >= ${since} AND referrer IS NOT NULL AND referrer != ''
      GROUP BY referrer
      ORDER BY count DESC
      LIMIT ${limit}
    `;
        return rows.map((r) => ({ referrer: r.referrer, count: Number(r.count) }));
    }
};
exports.AnalyticsService = AnalyticsService;
exports.AnalyticsService = AnalyticsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, tenants_service_1.TenantsService])
], AnalyticsService);
//# sourceMappingURL=analytics.service.js.map