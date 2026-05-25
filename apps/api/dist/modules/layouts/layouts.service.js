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
exports.LayoutsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const tenants_service_1 = require("../tenants/tenants.service");
let LayoutsService = class LayoutsService {
    prisma;
    tenants;
    constructor(prisma, tenants) {
        this.prisma = prisma;
        this.tenants = tenants;
    }
    async list(userId, tenantId) {
        await this.tenants.get(userId, tenantId);
        return this.prisma.layout.findMany({ where: { tenantId, deletedAt: null }, orderBy: { updatedAt: 'desc' } });
    }
    async get(userId, id) {
        const l = await this.prisma.layout.findFirst({ where: { id, deletedAt: null } });
        if (!l)
            throw new common_1.NotFoundException();
        await this.tenants.get(userId, l.tenantId);
        return l;
    }
    async create(userId, tenantId, dto) {
        await this.tenants.get(userId, tenantId);
        return this.prisma.layout.create({ data: { tenantId, name: dto.name, schema: dto.schema, isDefault: !!dto.isDefault } });
    }
    async update(userId, id, patch) {
        const l = await this.get(userId, id);
        const data = { ...patch, schema: patch.schema !== undefined ? patch.schema : undefined };
        return this.prisma.layout.update({ where: { id: l.id }, data });
    }
};
exports.LayoutsService = LayoutsService;
exports.LayoutsService = LayoutsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, tenants_service_1.TenantsService])
], LayoutsService);
//# sourceMappingURL=layouts.service.js.map