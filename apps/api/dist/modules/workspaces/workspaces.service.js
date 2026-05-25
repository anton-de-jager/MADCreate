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
var WorkspacesService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkspacesService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const node_crypto_1 = require("node:crypto");
const prisma_service_1 = require("../../prisma/prisma.service");
const mail_service_1 = require("../mail/mail.service");
let WorkspacesService = WorkspacesService_1 = class WorkspacesService {
    prisma;
    mail;
    config;
    logger = new common_1.Logger(WorkspacesService_1.name);
    constructor(prisma, mail, config) {
        this.prisma = prisma;
        this.mail = mail;
        this.config = config;
    }
    async listMine(userId) {
        const memberships = await this.prisma.workspaceMember.findMany({
            where: { userId, status: 'ACTIVE' },
            include: {
                workspace: {
                    select: { id: true, slug: true, name: true, logoUrl: true, planId: true, createdAt: true },
                },
            },
            orderBy: { createdAt: 'asc' },
        });
        return memberships.map((m) => ({ ...m.workspace, role: m.role }));
    }
    async get(userId, workspaceId) {
        await this.assertMember(userId, workspaceId);
        const ws = await this.prisma.workspace.findFirst({
            where: { id: workspaceId, deletedAt: null },
            include: {
                plan: true,
                subscription: true,
                members: { include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } } },
                tenants: { where: { deletedAt: null } },
            },
        });
        if (!ws)
            throw new common_1.NotFoundException('Workspace not found');
        return ws;
    }
    async update(userId, workspaceId, patch) {
        await this.assertRole(userId, workspaceId, ['WORKSPACE_OWNER', 'ADMIN']);
        return this.prisma.workspace.update({ where: { id: workspaceId }, data: patch });
    }
    async invite(userId, workspaceId, dto) {
        await this.assertRole(userId, workspaceId, ['WORKSPACE_OWNER', 'ADMIN']);
        const ws = await this.prisma.workspace.findUnique({ where: { id: workspaceId }, select: { name: true } });
        const inviter = await this.prisma.user.findUnique({ where: { id: userId }, select: { firstName: true, lastName: true, email: true } });
        const raw = (0, node_crypto_1.randomBytes)(24).toString('hex');
        const tokenHash = (0, node_crypto_1.createHash)('sha256').update(raw).digest('hex');
        const invite = await this.prisma.workspaceInvite.create({
            data: {
                workspaceId,
                email: dto.email.toLowerCase(),
                role: dto.role,
                invitedById: userId,
                tokenHash,
                expiresAt: new Date(Date.now() + 7 * 86_400_000),
            },
        });
        const inviterName = [inviter?.firstName, inviter?.lastName].filter(Boolean).join(' ') || inviter?.email || 'A teammate';
        const appUrl = this.config.get('web.url') ?? 'http://localhost:4200';
        await this.mail.sendWorkspaceInvite(invite.email, inviterName, ws?.name ?? 'a workspace', raw, appUrl).catch((err) => this.logger.error('Failed to send workspace invite email', err.stack ?? err));
        return invite;
    }
    async stats(userId, workspaceId) {
        await this.assertMember(userId, workspaceId);
        const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000);
        const [tenants, sites, generations, deployments] = await Promise.all([
            this.prisma.tenant.count({ where: { workspaceId, deletedAt: null } }),
            this.prisma.site.count({ where: { tenant: { workspaceId, deletedAt: null }, deletedAt: null } }),
            this.prisma.aIGeneration.count({ where: { tenant: { workspaceId }, createdAt: { gte: thirtyDaysAgo } } }),
            this.prisma.deployment.count({ where: { site: { tenant: { workspaceId } }, createdAt: { gte: thirtyDaysAgo } } }),
        ]);
        return { tenants, sites, generations, deployments };
    }
    async members(userId, workspaceId) {
        await this.assertMember(userId, workspaceId);
        const rows = await this.prisma.workspaceMember.findMany({
            where: { workspaceId, status: 'ACTIVE' },
            include: { user: { select: { id: true, email: true, firstName: true, lastName: true, avatarUrl: true } } },
            orderBy: { createdAt: 'asc' },
        });
        return rows.map((m) => ({
            userId: m.userId,
            role: m.role,
            joinedAt: m.createdAt,
            user: m.user,
        }));
    }
    async leave(userId, workspaceId) {
        const role = await this.assertMember(userId, workspaceId);
        if (role === 'WORKSPACE_OWNER') {
            const owners = await this.prisma.workspaceMember.count({
                where: { workspaceId, role: 'WORKSPACE_OWNER', status: 'ACTIVE' },
            });
            if (owners <= 1) {
                throw new common_1.ForbiddenException('You are the only owner of this workspace. Transfer ownership or delete the workspace first.');
            }
        }
        await this.prisma.workspaceMember.update({
            where: { workspaceId_userId: { workspaceId, userId } },
            data: { status: 'SUSPENDED' },
        });
        return { left: true };
    }
    async acceptInvite(userId, token) {
        const hash = (0, node_crypto_1.createHash)('sha256').update(token).digest('hex');
        const invite = await this.prisma.workspaceInvite.findUnique({
            where: { tokenHash: hash },
            include: { workspace: { select: { id: true, slug: true, name: true } } },
        });
        if (!invite)
            throw new common_1.BadRequestException('Invite not found');
        if (invite.acceptedAt)
            throw new common_1.BadRequestException('Invite already accepted');
        if (invite.expiresAt < new Date())
            throw new common_1.BadRequestException('Invite has expired');
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            throw new common_1.BadRequestException('User not found');
        if (user.email.toLowerCase() !== invite.email.toLowerCase()) {
            throw new common_1.ForbiddenException('This invite was sent to a different email address');
        }
        const existing = await this.prisma.workspaceMember.findUnique({
            where: { workspaceId_userId: { workspaceId: invite.workspaceId, userId } },
        });
        if (existing && existing.status === 'ACTIVE') {
            await this.prisma.workspaceInvite.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } });
            return { workspace: invite.workspace, alreadyMember: true };
        }
        if (existing) {
            await this.prisma.workspaceMember.update({
                where: { workspaceId_userId: { workspaceId: invite.workspaceId, userId } },
                data: { status: 'ACTIVE', role: invite.role },
            });
        }
        else {
            await this.prisma.workspaceMember.create({
                data: {
                    workspaceId: invite.workspaceId,
                    userId,
                    role: invite.role,
                    status: 'ACTIVE',
                    joinedAt: new Date(),
                },
            });
        }
        await this.prisma.workspaceInvite.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } });
        return { workspace: invite.workspace, alreadyMember: false };
    }
    async assertMember(userId, workspaceId) {
        const m = await this.prisma.workspaceMember.findUnique({
            where: { workspaceId_userId: { workspaceId, userId } },
        });
        if (!m || m.status !== 'ACTIVE')
            throw new common_1.ForbiddenException('Not a member of this workspace');
        return m.role;
    }
    async assertRole(userId, workspaceId, allowed) {
        const role = await this.assertMember(userId, workspaceId);
        if (!allowed.includes(role))
            throw new common_1.ForbiddenException(`Role ${role} not allowed`);
        return role;
    }
};
exports.WorkspacesService = WorkspacesService;
exports.WorkspacesService = WorkspacesService = WorkspacesService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        mail_service_1.MailService,
        config_1.ConfigService])
], WorkspacesService);
//# sourceMappingURL=workspaces.service.js.map