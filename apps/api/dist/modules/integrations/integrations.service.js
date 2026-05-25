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
exports.IntegrationsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const tenants_service_1 = require("../tenants/tenants.service");
let IntegrationsService = class IntegrationsService {
    prisma;
    tenants;
    constructor(prisma, tenants) {
        this.prisma = prisma;
        this.tenants = tenants;
    }
    catalog() {
        return this.prisma.integrationCatalog.findMany({ where: { isEnabled: true }, orderBy: [{ category: 'asc' }, { name: 'asc' }] });
    }
    async installed(userId, tenantId) {
        await this.tenants.get(userId, tenantId);
        return this.prisma.tenantIntegration.findMany({
            where: { tenantId, deletedAt: null },
            include: { catalog: true },
        });
    }
    async install(userId, tenantId, dto) {
        await this.tenants.get(userId, tenantId);
        const catalog = await this.prisma.integrationCatalog.findUnique({ where: { key: dto.catalogKey } });
        if (!catalog)
            throw new common_1.NotFoundException('Integration not in catalog');
        return this.prisma.tenantIntegration.upsert({
            where: { tenantId_catalogId: { tenantId, catalogId: catalog.id } },
            update: { config: (dto.config ?? {}), isEnabled: true, deletedAt: null },
            create: { tenantId, catalogId: catalog.id, config: (dto.config ?? {}) },
        });
    }
    async uninstall(userId, tenantId, id) {
        await this.tenants.get(userId, tenantId);
        return this.prisma.tenantIntegration.update({ where: { id }, data: { deletedAt: new Date(), isEnabled: false } });
    }
};
exports.IntegrationsService = IntegrationsService;
exports.IntegrationsService = IntegrationsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, tenants_service_1.TenantsService])
], IntegrationsService);
//# sourceMappingURL=integrations.service.js.map