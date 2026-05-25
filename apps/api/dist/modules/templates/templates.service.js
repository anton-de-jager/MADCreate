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
exports.TemplatesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const client_1 = require("@prisma/client");
let TemplatesService = class TemplatesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async listPublic(opts) {
        return this.prisma.template.findMany({
            where: {
                deletedAt: null,
                visibility: client_1.TemplateVisibility.PUBLIC,
                ...(opts.category ? { category: opts.category } : {}),
                ...(opts.industry ? { industry: opts.industry } : {}),
                ...(opts.search
                    ? { OR: [{ name: { contains: opts.search } }, { description: { contains: opts.search } }] }
                    : {}),
            },
            orderBy: [{ popularity: 'desc' }, { updatedAt: 'desc' }],
            take: 100,
        });
    }
    async get(slug) {
        const t = await this.prisma.template.findUnique({ where: { slug } });
        if (!t)
            throw new common_1.NotFoundException();
        return t;
    }
    async instantiate(tenantId, templateSlug) {
        const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
        if (!tenant)
            throw new common_1.NotFoundException('Tenant not found');
        const template = await this.prisma.template.findUnique({ where: { slug: templateSlug } });
        if (!template)
            throw new common_1.NotFoundException('Template not found');
        const schema = template.schema;
        if (!schema || !Array.isArray(schema.pages) || schema.pages.length === 0) {
            throw new common_1.BadRequestException('Template has no pages to clone');
        }
        return this.prisma.$transaction(async (tx) => {
            const site = await tx.site.create({
                data: {
                    tenantId,
                    name: schema.name ?? template.name,
                    status: client_1.SiteStatus.DRAFT,
                    navigation: (schema.navigation ?? null),
                    settings: (schema.settings ?? null),
                },
            });
            for (const [i, p] of schema.pages.entries()) {
                await tx.page.create({
                    data: {
                        tenantId,
                        siteId: site.id,
                        slug: p.slug,
                        title: p.title,
                        metaTitle: p.metaTitle ?? null,
                        metaDescription: p.metaDescription ?? null,
                        order: i,
                        schema: { sections: p.sections ?? [] },
                    },
                });
            }
            await tx.template.update({
                where: { id: template.id },
                data: { popularity: { increment: 1 } },
            });
            return tx.site.findUnique({
                where: { id: site.id },
                include: { pages: { orderBy: { order: 'asc' } } },
            });
        });
    }
};
exports.TemplatesService = TemplatesService;
exports.TemplatesService = TemplatesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TemplatesService);
//# sourceMappingURL=templates.service.js.map