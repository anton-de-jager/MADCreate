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
exports.ThemesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const tenants_service_1 = require("../tenants/tenants.service");
let ThemesService = class ThemesService {
    prisma;
    tenants;
    constructor(prisma, tenants) {
        this.prisma = prisma;
        this.tenants = tenants;
    }
    async list(userId, tenantId) {
        await this.tenants.get(userId, tenantId);
        return this.prisma.theme.findMany({ where: { tenantId, deletedAt: null }, orderBy: { updatedAt: 'desc' } });
    }
    async get(userId, themeId) {
        const t = await this.prisma.theme.findFirst({ where: { id: themeId, deletedAt: null } });
        if (!t)
            throw new common_1.NotFoundException('Theme not found');
        await this.tenants.get(userId, t.tenantId);
        return t;
    }
    async create(userId, tenantId, dto) {
        await this.tenants.get(userId, tenantId);
        return this.prisma.theme.create({ data: { tenantId, name: dto.name, tokens: dto.tokens } });
    }
    async update(userId, themeId, patch) {
        const t = await this.get(userId, themeId);
        if (patch.isActive) {
            await this.prisma.theme.updateMany({ where: { tenantId: t.tenantId, isActive: true }, data: { isActive: false } });
        }
        return this.prisma.theme.update({
            where: { id: t.id },
            data: {
                ...(patch.name !== undefined && { name: patch.name }),
                ...(patch.tokens !== undefined && { tokens: patch.tokens }),
                ...(patch.isActive !== undefined && { isActive: patch.isActive }),
            },
        });
    }
    async remove(userId, themeId) {
        const t = await this.get(userId, themeId);
        return this.prisma.theme.update({ where: { id: t.id }, data: { deletedAt: new Date() } });
    }
};
exports.ThemesService = ThemesService;
exports.ThemesService = ThemesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, tenants_service_1.TenantsService])
], ThemesService);
//# sourceMappingURL=themes.service.js.map