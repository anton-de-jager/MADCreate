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
exports.TenantsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const workspaces_service_1 = require("../workspaces/workspaces.service");
const PURGE_AGE_DAYS = 30;
const PURGE_AGE_MS = PURGE_AGE_DAYS * 24 * 60 * 60 * 1000;
let TenantsService = class TenantsService {
    prisma;
    workspaces;
    constructor(prisma, workspaces) {
        this.prisma = prisma;
        this.workspaces = workspaces;
    }
    async list(userId, workspaceId) {
        await this.workspaces.assertMember(userId, workspaceId);
        return this.prisma.tenant.findMany({
            where: { workspaceId, deletedAt: null },
            orderBy: { createdAt: 'desc' },
            include: { domains: { where: { deletedAt: null } } },
        });
    }
    async findAll(userId, workspaceId) {
        return this.list(userId, workspaceId);
    }
    async get(userId, tenantId) {
        const tenant = await this.prisma.tenant.findFirst({
            where: { id: tenantId, deletedAt: null },
            include: {
                domains: { where: { deletedAt: null } },
                sites: { where: { deletedAt: null } },
            },
        });
        if (!tenant)
            throw new common_1.NotFoundException('Tenant not found');
        await this.workspaces.assertMember(userId, tenant.workspaceId);
        return tenant;
    }
    async findOne(userId, tenantId) {
        return this.get(userId, tenantId);
    }
    async create(userId, workspaceId, dto) {
        await this.workspaces.assertRole(userId, workspaceId, ['WORKSPACE_OWNER', 'ADMIN', 'EDITOR']);
        const slug = await this.uniqueSlug(dto.slug);
        return this.prisma.tenant.create({
            data: {
                workspaceId,
                slug,
                name: dto.name,
                industry: dto.industry,
                description: dto.description,
            },
        });
    }
    async update(userId, tenantId, patch) {
        const tenant = await this.get(userId, tenantId);
        const { branding, ...rest } = patch;
        return this.prisma.tenant.update({
            where: { id: tenant.id },
            data: {
                ...rest,
                ...(branding !== undefined && { branding: branding }),
            },
        });
    }
    async remove(userId, tenantId) {
        const tenant = await this.get(userId, tenantId);
        await this.workspaces.assertRole(userId, tenant.workspaceId, ['WORKSPACE_OWNER', 'ADMIN']);
        const now = new Date();
        const [, , , , updatedTenant] = await this.prisma.$transaction([
            this.prisma.site.updateMany({
                where: { tenantId: tenant.id, deletedAt: null },
                data: { deletedAt: now },
            }),
            this.prisma.page.updateMany({
                where: { tenantId: tenant.id, deletedAt: null },
                data: { deletedAt: now },
            }),
            this.prisma.section.updateMany({
                where: { tenantId: tenant.id, deletedAt: null },
                data: { deletedAt: now },
            }),
            this.prisma.theme.updateMany({
                where: { tenantId: tenant.id, deletedAt: null },
                data: { deletedAt: now },
            }),
            this.prisma.tenant.update({
                where: { id: tenant.id },
                data: { deletedAt: now },
            }),
        ]);
        return updatedTenant;
    }
    async purge(userId, tenantId) {
        await this.assertSuperAdmin(userId);
        const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
        if (!tenant)
            throw new common_1.NotFoundException('Tenant not found');
        if (!tenant.deletedAt) {
            throw new common_1.BadRequestException('Tenant is not soft-deleted; call DELETE first');
        }
        const cutoff = new Date(Date.now() - PURGE_AGE_MS);
        if (tenant.deletedAt > cutoff) {
            throw new common_1.BadRequestException(`Tenant was soft-deleted on ${tenant.deletedAt.toISOString()}; must be older than ${PURGE_AGE_DAYS} days to purge`);
        }
        await this.prisma.tenant.delete({ where: { id: tenant.id } });
        return { id: tenant.id, purged: true };
    }
    async purgeAll(userId) {
        await this.assertSuperAdmin(userId);
        const cutoff = new Date(Date.now() - PURGE_AGE_MS);
        const expired = await this.prisma.tenant.findMany({
            where: { deletedAt: { not: null, lt: cutoff } },
            select: { id: true },
        });
        if (!expired.length)
            return { purged: 0, ids: [] };
        const ids = expired.map((t) => t.id);
        const result = await this.prisma.tenant.deleteMany({
            where: { id: { in: ids } },
        });
        return { purged: result.count, ids };
    }
    async assertSuperAdmin(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { isSuperAdmin: true },
        });
        if (!user?.isSuperAdmin) {
            throw new common_1.ForbiddenException('Super admin required');
        }
    }
    async uniqueSlug(base) {
        const baseSlug = base.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'site';
        for (let i = 0; i < 25; i++) {
            const candidate = i === 0 ? baseSlug : `${baseSlug}-${i + 1}`;
            const taken = await this.prisma.tenant.findUnique({ where: { slug: candidate } });
            if (!taken)
                return candidate;
        }
        return `${baseSlug}-${Date.now().toString(36)}`;
    }
};
exports.TenantsService = TenantsService;
exports.TenantsService = TenantsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, workspaces_service_1.WorkspacesService])
], TenantsService);
//# sourceMappingURL=tenants.service.js.map