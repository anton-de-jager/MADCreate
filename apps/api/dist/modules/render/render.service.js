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
exports.RenderService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const domains_service_1 = require("../domains/domains.service");
let RenderService = class RenderService {
    prisma;
    domains;
    constructor(prisma, domains) {
        this.prisma = prisma;
        this.domains = domains;
    }
    async getSiteForSlug(slug) {
        const tenant = await this.prisma.tenant.findFirst({
            where: { slug, deletedAt: null },
            include: {
                sites: {
                    where: { deletedAt: null, status: 'PUBLISHED' },
                    orderBy: { publishedAt: 'desc' },
                    include: { theme: true, pages: { where: { deletedAt: null, status: 'PUBLISHED' }, orderBy: { order: 'asc' } } },
                    take: 1,
                },
            },
        });
        if (!tenant)
            return null;
        const site = tenant.sites[0];
        if (!site)
            return null;
        return {
            tenant: { id: tenant.id, slug: tenant.slug, name: tenant.name },
            theme: site.theme?.tokens ?? null,
            navigation: site.navigation ?? null,
            settings: site.settings ?? null,
            pages: site.pages.map((p) => ({
                slug: p.slug,
                title: p.title,
                metaTitle: p.metaTitle,
                metaDescription: p.metaDescription,
                schema: p.schema,
            })),
        };
    }
    async getSiteForHostname(hostname) {
        const domain = await this.domains.resolveByHostname(hostname);
        if (!domain)
            return null;
        return this.getSiteForSlug(domain.tenant.slug);
    }
    async getPageBySlug(tenantSlug, pageSlug) {
        const site = await this.getSiteForSlug(tenantSlug);
        if (!site)
            throw new common_1.NotFoundException('Site not found');
        const page = site.pages.find((p) => p.slug === (pageSlug || 'home')) ?? site.pages.find((p) => p.slug === 'home');
        if (!page)
            throw new common_1.NotFoundException('Page not found');
        return { site, page };
    }
};
exports.RenderService = RenderService;
exports.RenderService = RenderService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, domains_service_1.DomainsService])
], RenderService);
//# sourceMappingURL=render.service.js.map