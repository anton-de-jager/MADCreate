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
exports.AdminService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let AdminService = class AdminService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    assertSuperAdmin(user) {
        if (!user?.superAdmin)
            throw new common_1.ForbiddenException('Super admin required');
    }
    async overview() {
        const [workspaces, tenants, users, sites, deployments, aiGenerations, customDomains] = await Promise.all([
            this.prisma.workspace.count({ where: { deletedAt: null } }),
            this.prisma.tenant.count({ where: { deletedAt: null } }),
            this.prisma.user.count({ where: { deletedAt: null } }),
            this.prisma.site.count({ where: { deletedAt: null } }),
            this.prisma.deployment.count(),
            this.prisma.aIGeneration.count(),
            this.prisma.domain.count({ where: { deletedAt: null, type: { not: 'SUBDOMAIN' } } }),
        ]);
        return { workspaces, tenants, users, sites, deployments, aiGenerations, customDomains };
    }
    async listTenants(search, status) {
        const tenants = await this.prisma.tenant.findMany({
            where: {
                deletedAt: null,
                ...(search ? { OR: [{ slug: { contains: search } }, { name: { contains: search } }] } : {}),
                ...(status ? { status: status } : {}),
            },
            include: {
                workspace: {
                    include: {
                        members: { where: { role: 'WORKSPACE_OWNER' }, take: 1, include: { user: { select: { email: true } } } },
                    },
                },
                sites: { where: { deletedAt: null }, select: { id: true } },
                deployments: { orderBy: { createdAt: 'desc' }, take: 1, select: { createdAt: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: 200,
        });
        return tenants.map((t) => ({
            id: t.id,
            slug: t.slug,
            name: t.name,
            status: t.status,
            createdAt: t.createdAt,
            workspace: { id: t.workspace.id, name: t.workspace.name, slug: t.workspace.slug },
            ownerEmail: t.workspace.members[0]?.user?.email ?? null,
            siteCount: t.sites.length,
            lastDeploy: t.deployments[0]?.createdAt ?? null,
        }));
    }
    async listFeatureFlags() {
        return this.prisma.featureFlag.findMany({ orderBy: { key: 'asc' } });
    }
    async setFlag(key, enabled, workspaceId) {
        if (workspaceId) {
            return this.prisma.featureFlag.upsert({
                where: { workspaceId_key: { workspaceId, key } },
                update: { enabled },
                create: { key, enabled, workspaceId },
            });
        }
        const existing = await this.prisma.featureFlag.findFirst({
            where: { key, workspaceId: null },
        });
        if (existing) {
            return this.prisma.featureFlag.update({
                where: { id: existing.id },
                data: { enabled },
            });
        }
        return this.prisma.featureFlag.create({
            data: { key, enabled },
        });
    }
    async suspendTenant(id) {
        return this.prisma.tenant.update({ where: { id }, data: { status: 'ARCHIVED' } });
    }
    async unsuspendTenant(id) {
        return this.prisma.tenant.update({ where: { id }, data: { status: 'DRAFT' } });
    }
    async softDeleteTenant(id) {
        return this.prisma.tenant.update({ where: { id }, data: { deletedAt: new Date() } });
    }
};
exports.AdminService = AdminService;
exports.AdminService = AdminService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AdminService);
//# sourceMappingURL=admin.service.js.map