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
exports.LeadsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const tenants_service_1 = require("../tenants/tenants.service");
let LeadsService = class LeadsService {
    prisma;
    tenants;
    constructor(prisma, tenants) {
        this.prisma = prisma;
        this.tenants = tenants;
    }
    async list(userId, tenantId, opts = {}) {
        await this.tenants.get(userId, tenantId);
        return this.prisma.lead.findMany({
            where: { tenantId, deletedAt: null, ...(opts.status ? { status: opts.status } : {}) },
            orderBy: { createdAt: 'desc' },
            take: opts.limit ?? 200,
        });
    }
    async update(userId, tenantId, leadId, dto) {
        await this.tenants.get(userId, tenantId);
        const lead = await this.prisma.lead.findFirst({ where: { id: leadId, tenantId, deletedAt: null } });
        if (!lead)
            throw new common_1.NotFoundException('Lead not found');
        const data = {};
        if (dto.status !== undefined)
            data.status = dto.status;
        if (dto.name !== undefined)
            data.name = dto.name;
        if (dto.email !== undefined)
            data.email = dto.email;
        if (dto.phone !== undefined)
            data.phone = dto.phone;
        return this.prisma.lead.update({ where: { id: leadId }, data });
    }
    async remove(userId, tenantId, leadId) {
        await this.tenants.get(userId, tenantId);
        await this.prisma.lead.update({ where: { id: leadId }, data: { deletedAt: new Date() } });
    }
};
exports.LeadsService = LeadsService;
exports.LeadsService = LeadsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        tenants_service_1.TenantsService])
], LeadsService);
//# sourceMappingURL=leads.service.js.map