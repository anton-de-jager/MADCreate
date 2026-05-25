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
exports.SitesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const tenants_service_1 = require("../tenants/tenants.service");
const client_1 = require("@prisma/client");
let SitesService = class SitesService {
    prisma;
    tenants;
    constructor(prisma, tenants) {
        this.prisma = prisma;
        this.tenants = tenants;
    }
    async list(userId, tenantId) {
        await this.tenants.get(userId, tenantId);
        return this.prisma.site.findMany({
            where: { tenantId, deletedAt: null },
            orderBy: { updatedAt: 'desc' },
            include: { theme: true, _count: { select: { pages: { where: { deletedAt: null } } } } },
        });
    }
    async get(userId, siteId) {
        const site = await this.prisma.site.findFirst({
            where: { id: siteId, deletedAt: null },
            include: { theme: true, pages: { where: { deletedAt: null }, orderBy: { order: 'asc' } } },
        });
        if (!site)
            throw new common_1.NotFoundException('Site not found');
        await this.tenants.get(userId, site.tenantId);
        return site;
    }
    async create(userId, tenantId, dto) {
        await this.tenants.get(userId, tenantId);
        return this.prisma.site.create({
            data: { tenantId, name: dto.name, themeId: dto.themeId, status: client_1.SiteStatus.DRAFT },
        });
    }
    async update(userId, siteId, patch) {
        const site = await this.get(userId, siteId);
        return this.prisma.site.update({
            where: { id: site.id },
            data: {
                ...patch,
                navigation: patch.navigation,
                settings: patch.settings,
            },
        });
    }
    async publish(userId, siteId) {
        const site = await this.get(userId, siteId);
        return this.prisma.site.update({
            where: { id: site.id },
            data: { status: client_1.SiteStatus.PUBLISHED, publishedAt: new Date(), version: { increment: 1 } },
        });
    }
    async remove(userId, siteId) {
        const site = await this.get(userId, siteId);
        return this.prisma.site.update({ where: { id: site.id }, data: { deletedAt: new Date() } });
    }
};
exports.SitesService = SitesService;
exports.SitesService = SitesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, tenants_service_1.TenantsService])
], SitesService);
//# sourceMappingURL=sites.service.js.map