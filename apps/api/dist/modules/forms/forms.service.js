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
exports.FormsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const tenants_service_1 = require("../tenants/tenants.service");
function extractStringField(data, ...keys) {
    for (const key of keys) {
        const val = data[key];
        if (typeof val === 'string' && val.length > 0)
            return val;
    }
    return null;
}
let FormsService = class FormsService {
    prisma;
    tenants;
    constructor(prisma, tenants) {
        this.prisma = prisma;
        this.tenants = tenants;
    }
    async submit(tenantId, dto, req) {
        if (!tenantId)
            throw new common_1.BadRequestException('tenantId is required');
        const tenant = await this.prisma.tenant.findFirst({ where: { id: tenantId, deletedAt: null } });
        if (!tenant)
            throw new common_1.NotFoundException('Tenant not found');
        const sub = await this.prisma.formSubmission.create({
            data: {
                tenantId: tenant.id,
                formKey: dto.formKey,
                pageSlug: dto.pageSlug ?? null,
                data: dto.data,
                ip: req.ip ?? null,
                userAgent: req.headers['user-agent']?.toString().slice(0, 1000) ?? null,
            },
        });
        const data = dto.data ?? {};
        const email = dto.email ?? extractStringField(data, 'email', 'Email');
        const phone = dto.phone ?? extractStringField(data, 'phone', 'tel');
        const name = dto.name ?? extractStringField(data, 'name', 'fullName');
        let leadId = null;
        if (email || phone) {
            const lead = await this.prisma.lead.create({
                data: {
                    tenantId: tenant.id,
                    email,
                    phone,
                    name,
                    source: `form:${dto.formKey}`,
                    status: 'new',
                    data: { submissionId: sub.id },
                },
            });
            leadId = lead.id;
        }
        return { submissionId: sub.id, leadId };
    }
    async listSubmissions(userId, tenantId, limit = 100) {
        await this.tenants.get(userId, tenantId);
        return this.prisma.formSubmission.findMany({
            where: { tenantId },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });
    }
};
exports.FormsService = FormsService;
exports.FormsService = FormsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        tenants_service_1.TenantsService])
], FormsService);
//# sourceMappingURL=forms.service.js.map