"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const argon2 = __importStar(require("argon2"));
const prisma_service_1 = require("../../prisma/prisma.service");
const token_service_1 = require("./token.service");
const mail_service_1 = require("../mail/mail.service");
const client_1 = require("@prisma/client");
let AuthService = AuthService_1 = class AuthService {
    prisma;
    tokens;
    config;
    mail;
    logger = new common_1.Logger(AuthService_1.name);
    constructor(prisma, tokens, config, mail) {
        this.prisma = prisma;
        this.tokens = tokens;
        this.config = config;
        this.mail = mail;
    }
    async register(dto, meta = {}) {
        const existing = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
        if (existing)
            throw new common_1.BadRequestException('Email already in use');
        const passwordHash = await argon2.hash(dto.password);
        const user = await this.prisma.user.create({
            data: {
                email: dto.email.toLowerCase(),
                passwordHash,
                firstName: dto.firstName,
                lastName: dto.lastName,
            },
        });
        const workspaceName = dto.workspaceName ?? `${dto.firstName ?? 'My'}'s Workspace`;
        const baseSlug = workspaceName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')
            .slice(0, 40) || 'workspace';
        const slug = await this.uniqueWorkspaceSlug(baseSlug);
        const freePlan = await this.prisma.plan.findUnique({ where: { code: 'free' } });
        const workspace = await this.prisma.workspace.create({
            data: {
                slug,
                name: workspaceName,
                ownerUserId: user.id,
                planId: freePlan?.id,
                billingEmail: user.email,
                members: {
                    create: { userId: user.id, role: client_1.Role.WORKSPACE_OWNER, joinedAt: new Date() },
                },
            },
        });
        const { raw, hash } = this.tokens.generateToken(24);
        await this.prisma.emailVerification.create({
            data: { userId: user.id, tokenHash: hash, expiresAt: new Date(Date.now() + 86_400_000) },
        });
        const appUrl = this.config.get('web.url') ?? 'http://localhost:4200';
        await this.mail.sendVerificationEmail(user.email, raw, appUrl).catch((err) => this.logger.error('Failed to send verification email', err.stack ?? err));
        const tokens = await this.tokens.issueTokens(user.id, user.email, {
            workspaceId: workspace.id,
            role: 'WORKSPACE_OWNER',
            superAdmin: user.isSuperAdmin,
            userAgent: meta.userAgent,
            ip: meta.ip,
        });
        return { user: this.publicUser(user), tokens, workspace: { id: workspace.id, slug: workspace.slug, name: workspace.name } };
    }
    async login(dto, meta = {}) {
        const user = await this.prisma.user.findFirst({
            where: { email: dto.email.toLowerCase(), deletedAt: null },
        });
        if (!user || !user.passwordHash)
            throw new common_1.UnauthorizedException('Invalid credentials');
        const ok = await argon2.verify(user.passwordHash, dto.password);
        if (!ok)
            throw new common_1.UnauthorizedException('Invalid credentials');
        await this.prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date(), lastLoginIp: meta.ip },
        });
        const membership = await this.prisma.workspaceMember.findFirst({
            where: { userId: user.id, status: 'ACTIVE' },
            orderBy: { joinedAt: 'asc' },
            include: { workspace: { select: { id: true, slug: true, name: true } } },
        });
        const tokens = await this.tokens.issueTokens(user.id, user.email, {
            workspaceId: membership?.workspaceId,
            role: membership?.role,
            superAdmin: user.isSuperAdmin,
            userAgent: meta.userAgent,
            ip: meta.ip,
        });
        const memberships = await this.prisma.workspaceMember.findMany({
            where: { userId: user.id, status: 'ACTIVE' },
            include: { workspace: { select: { id: true, slug: true, name: true } } },
        });
        return {
            user: this.publicUser(user),
            tokens,
            memberships: memberships.map((m) => ({
                workspaceId: m.workspaceId,
                workspaceName: m.workspace.name,
                workspaceSlug: m.workspace.slug,
                role: m.role,
            })),
            currentWorkspaceId: membership?.workspaceId,
        };
    }
    async refresh(refreshToken, meta = {}) {
        try {
            const tokens = await this.tokens.rotateRefresh(refreshToken, meta.userAgent, meta.ip);
            return { tokens };
        }
        catch {
            throw new common_1.UnauthorizedException('Invalid refresh token');
        }
    }
    async logout(userId) {
        await this.tokens.revokeAllForUser(userId);
    }
    async requestPasswordReset(email) {
        const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
        if (!user)
            return;
        const { raw, hash } = this.tokens.generateToken(24);
        await this.prisma.passwordReset.create({
            data: { userId: user.id, tokenHash: hash, expiresAt: new Date(Date.now() + 3_600_000) },
        });
        const appUrl = this.config.get('web.url') ?? 'http://localhost:4200';
        await this.mail.sendPasswordResetEmail(user.email, raw, appUrl).catch((err) => this.logger.error('Failed to send password reset email', err.stack ?? err));
    }
    async resetPassword(dto) {
        const hash = this.tokens.hash(dto.token);
        const record = await this.prisma.passwordReset.findUnique({ where: { tokenHash: hash } });
        if (!record || record.usedAt || record.expiresAt < new Date()) {
            throw new common_1.BadRequestException('Token invalid or expired');
        }
        const passwordHash = await argon2.hash(dto.password);
        await this.prisma.$transaction([
            this.prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
            this.prisma.passwordReset.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
            this.prisma.refreshToken.updateMany({ where: { userId: record.userId, revokedAt: null }, data: { revokedAt: new Date() } }),
        ]);
    }
    async changePassword(userId, dto) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            throw new common_1.BadRequestException('User not found');
        if (!user.passwordHash) {
            throw new common_1.BadRequestException('This account has no password set. Use the password-reset flow to set one.');
        }
        const ok = await argon2.verify(user.passwordHash, dto.currentPassword);
        if (!ok)
            throw new common_1.UnauthorizedException('Current password is incorrect');
        if (dto.currentPassword === dto.newPassword) {
            throw new common_1.BadRequestException('New password must differ from current.');
        }
        const newHash = await argon2.hash(dto.newPassword);
        await this.prisma.$transaction([
            this.prisma.user.update({ where: { id: userId }, data: { passwordHash: newHash } }),
            this.prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } }),
        ]);
    }
    async verifyEmail(token) {
        const hash = this.tokens.hash(token);
        const record = await this.prisma.emailVerification.findUnique({ where: { tokenHash: hash } });
        if (!record || record.usedAt || record.expiresAt < new Date()) {
            throw new common_1.BadRequestException('Token invalid or expired');
        }
        await this.prisma.$transaction([
            this.prisma.user.update({ where: { id: record.userId }, data: { emailVerifiedAt: new Date() } }),
            this.prisma.emailVerification.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
        ]);
    }
    async requestMagicLink(dto) {
        const user = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
        if (!user)
            return;
        const { raw, hash } = this.tokens.generateToken(24);
        const ttl = this.config.get('jwt.magicLinkTtl') ?? '15m';
        const ttlMs = parseTtl(ttl);
        await this.prisma.magicLink.create({
            data: { userId: user.id, tokenHash: hash, redirect: dto.redirect, expiresAt: new Date(Date.now() + ttlMs) },
        });
        const appUrl = this.config.get('web.url') ?? 'http://localhost:4200';
        await this.mail.sendMagicLink(user.email, raw, appUrl, dto.redirect).catch((err) => this.logger.error('Failed to send magic link email', err.stack ?? err));
    }
    async consumeMagicLink(token, meta = {}) {
        const hash = this.tokens.hash(token);
        const record = await this.prisma.magicLink.findUnique({ where: { tokenHash: hash }, include: { user: true } });
        if (!record || record.usedAt || record.expiresAt < new Date()) {
            throw new common_1.BadRequestException('Magic link invalid or expired');
        }
        await this.prisma.magicLink.update({ where: { id: record.id }, data: { usedAt: new Date() } });
        if (!record.user.emailVerifiedAt) {
            await this.prisma.user.update({ where: { id: record.user.id }, data: { emailVerifiedAt: new Date() } });
        }
        await this.prisma.user.update({
            where: { id: record.user.id },
            data: { lastLoginAt: new Date(), lastLoginIp: meta.ip },
        });
        const membership = await this.prisma.workspaceMember.findFirst({
            where: { userId: record.user.id, status: 'ACTIVE' },
            orderBy: { joinedAt: 'asc' },
            include: { workspace: { select: { id: true, slug: true, name: true } } },
        });
        const tokens = await this.tokens.issueTokens(record.user.id, record.user.email, {
            workspaceId: membership?.workspaceId,
            role: membership?.role,
            superAdmin: record.user.isSuperAdmin,
            userAgent: meta.userAgent,
            ip: meta.ip,
        });
        const memberships = await this.prisma.workspaceMember.findMany({
            where: { userId: record.user.id, status: 'ACTIVE' },
            include: { workspace: { select: { id: true, slug: true, name: true } } },
        });
        return {
            user: this.publicUser(record.user),
            tokens,
            memberships: memberships.map((m) => ({
                workspaceId: m.workspaceId,
                workspaceName: m.workspace.name,
                workspaceSlug: m.workspace.slug,
                role: m.role,
            })),
            currentWorkspaceId: membership?.workspaceId,
            redirect: record.redirect,
        };
    }
    async uniqueWorkspaceSlug(base) {
        for (let i = 0; i < 25; i++) {
            const candidate = i === 0 ? base : `${base}-${i + 1}`;
            const taken = await this.prisma.workspace.findUnique({ where: { slug: candidate } });
            if (!taken)
                return candidate;
        }
        return `${base}-${Date.now().toString(36)}`;
    }
    publicUser(u) {
        return {
            id: u.id,
            email: u.email,
            firstName: u.firstName,
            lastName: u.lastName,
            avatarUrl: u.avatarUrl,
            isSuperAdmin: u.isSuperAdmin,
            emailVerified: !!u.emailVerifiedAt,
        };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        token_service_1.TokenService,
        config_1.ConfigService,
        mail_service_1.MailService])
], AuthService);
function parseTtl(ttl) {
    const m = /^(\d+)([smhd])$/.exec(ttl);
    if (!m)
        return 15 * 60 * 1000;
    const n = Number(m[1]);
    return n * { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[m[2]];
}
//# sourceMappingURL=auth.service.js.map