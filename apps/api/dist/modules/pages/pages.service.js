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
exports.PagesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const tenants_service_1 = require("../tenants/tenants.service");
const client_1 = require("@prisma/client");
let PagesService = class PagesService {
    prisma;
    tenants;
    constructor(prisma, tenants) {
        this.prisma = prisma;
        this.tenants = tenants;
    }
    async list(userId, siteId) {
        const site = await this.prisma.site.findFirst({ where: { id: siteId, deletedAt: null } });
        if (!site)
            throw new common_1.NotFoundException('Site not found');
        await this.tenants.get(userId, site.tenantId);
        return this.prisma.page.findMany({
            where: { siteId, deletedAt: null },
            orderBy: { order: 'asc' },
        });
    }
    async get(userId, pageId) {
        const page = await this.prisma.page.findFirst({ where: { id: pageId, deletedAt: null } });
        if (!page)
            throw new common_1.NotFoundException('Page not found');
        await this.tenants.get(userId, page.tenantId);
        return page;
    }
    async create(userId, siteId, dto) {
        const site = await this.prisma.site.findFirst({ where: { id: siteId, deletedAt: null } });
        if (!site)
            throw new common_1.NotFoundException('Site not found');
        await this.tenants.get(userId, site.tenantId);
        return this.prisma.page.create({
            data: {
                tenantId: site.tenantId,
                siteId,
                slug: dto.slug,
                title: dto.title,
                order: dto.order ?? 0,
                layoutId: dto.layoutId,
                schema: (dto.schema ?? { sections: [] }),
            },
        });
    }
    async update(userId, pageId, patch) {
        const page = await this.get(userId, pageId);
        const data = {
            ...patch,
            schema: patch.schema !== undefined ? patch.schema : undefined,
        };
        return this.prisma.page.update({ where: { id: page.id }, data });
    }
    async publish(userId, pageId) {
        const page = await this.get(userId, pageId);
        return this.prisma.page.update({
            where: { id: page.id },
            data: { status: client_1.PageStatus.PUBLISHED, publishedAt: new Date() },
        });
    }
    async remove(userId, pageId) {
        const page = await this.get(userId, pageId);
        return this.prisma.page.update({ where: { id: page.id }, data: { deletedAt: new Date() } });
    }
};
exports.PagesService = PagesService;
exports.PagesService = PagesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, tenants_service_1.TenantsService])
], PagesService);
//# sourceMappingURL=pages.service.js.map