import { BadRequestException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { PrismaService } from '../../prisma/prisma.service';
import { TokenService } from './token.service';
import { MailService } from '../mail/mail.service';
import type { RegisterDto, LoginDto, ResetPasswordDto, ChangePasswordDto, MagicLinkRequestDto } from './dto/auth.dto';
import { Role } from '@prisma/client';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
  ) {}

  async register(dto: RegisterDto, meta: { userAgent?: string; ip?: string } = {}) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (existing) throw new BadRequestException('Email already in use');

    const passwordHash = await argon2.hash(dto.password);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
      },
    });

    // Create personal workspace, unless suppressed by client.
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
          create: { userId: user.id, role: Role.WORKSPACE_OWNER, joinedAt: new Date() },
        },
      },
    });

    // Email verification token
    const { raw, hash } = this.tokens.generateToken(24);
    await this.prisma.emailVerification.create({
      data: { userId: user.id, tokenHash: hash, expiresAt: new Date(Date.now() + 86_400_000) },
    });
    const appUrl = this.config.get<string>('web.url') ?? 'http://localhost:4200';
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

  async login(dto: LoginDto, meta: { userAgent?: string; ip?: string } = {}) {
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email.toLowerCase(), deletedAt: null },
    });
    if (!user || !user.passwordHash) throw new UnauthorizedException('Invalid credentials');
    const ok = await argon2.verify(user.passwordHash, dto.password);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

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

  async refresh(refreshToken: string, meta: { userAgent?: string; ip?: string } = {}) {
    try {
      const tokens = await this.tokens.rotateRefresh(refreshToken, meta.userAgent, meta.ip);
      return { tokens };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: string): Promise<void> {
    await this.tokens.revokeAllForUser(userId);
  }

  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) return; // do not reveal existence
    const { raw, hash } = this.tokens.generateToken(24);
    await this.prisma.passwordReset.create({
      data: { userId: user.id, tokenHash: hash, expiresAt: new Date(Date.now() + 3_600_000) },
    });
    const appUrl = this.config.get<string>('web.url') ?? 'http://localhost:4200';
    await this.mail.sendPasswordResetEmail(user.email, raw, appUrl).catch((err) => this.logger.error('Failed to send password reset email', err.stack ?? err));
  }

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const hash = this.tokens.hash(dto.token);
    const record = await this.prisma.passwordReset.findUnique({ where: { tokenHash: hash } });
    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new BadRequestException('Token invalid or expired');
    }
    const passwordHash = await argon2.hash(dto.password);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
      this.prisma.passwordReset.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
      this.prisma.refreshToken.updateMany({ where: { userId: record.userId, revokedAt: null }, data: { revokedAt: new Date() } }),
    ]);
  }

  /**
   * Change password while logged in. Verifies currentPassword against the
   * stored argon2 hash, rotates the password, and revokes all refresh tokens
   * so any other active sessions get kicked out.
   */
  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');
    if (!user.passwordHash) {
      // Magic-link / SSO-only accounts have no password. Direct them to set one via password reset.
      throw new BadRequestException('This account has no password set. Use the password-reset flow to set one.');
    }
    const ok = await argon2.verify(user.passwordHash, dto.currentPassword);
    if (!ok) throw new UnauthorizedException('Current password is incorrect');
    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException('New password must differ from current.');
    }
    const newHash = await argon2.hash(dto.newPassword);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: { passwordHash: newHash } }),
      this.prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } }),
    ]);
  }

  async verifyEmail(token: string): Promise<void> {
    const hash = this.tokens.hash(token);
    const record = await this.prisma.emailVerification.findUnique({ where: { tokenHash: hash } });
    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new BadRequestException('Token invalid or expired');
    }
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: record.userId }, data: { emailVerifiedAt: new Date() } }),
      this.prisma.emailVerification.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    ]);
  }

  async requestMagicLink(dto: MagicLinkRequestDto): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (!user) return; // do not reveal existence
    const { raw, hash } = this.tokens.generateToken(24);
    const ttl = this.config.get<string>('jwt.magicLinkTtl') ?? '15m';
    const ttlMs = parseTtl(ttl);
    await this.prisma.magicLink.create({
      data: { userId: user.id, tokenHash: hash, redirect: dto.redirect, expiresAt: new Date(Date.now() + ttlMs) },
    });
    const appUrl = this.config.get<string>('web.url') ?? 'http://localhost:4200';
    await this.mail.sendMagicLink(user.email, raw, appUrl, dto.redirect).catch((err) => this.logger.error('Failed to send magic link email', err.stack ?? err));
  }

  async consumeMagicLink(token: string, meta: { userAgent?: string; ip?: string } = {}) {
    const hash = this.tokens.hash(token);
    const record = await this.prisma.magicLink.findUnique({ where: { tokenHash: hash }, include: { user: true } });
    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new BadRequestException('Magic link invalid or expired');
    }
    await this.prisma.magicLink.update({ where: { id: record.id }, data: { usedAt: new Date() } });

    // Auto-verify email if not yet verified.
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

  private async uniqueWorkspaceSlug(base: string): Promise<string> {
    for (let i = 0; i < 25; i++) {
      const candidate = i === 0 ? base : `${base}-${i + 1}`;
      const taken = await this.prisma.workspace.findUnique({ where: { slug: candidate } });
      if (!taken) return candidate;
    }
    return `${base}-${Date.now().toString(36)}`;
  }

  private publicUser(u: { id: string; email: string; firstName: string | null; lastName: string | null; avatarUrl: string | null; isSuperAdmin: boolean; emailVerifiedAt: Date | null }) {
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
}

function parseTtl(ttl: string): number {
  const m = /^(\d+)([smhd])$/.exec(ttl);
  if (!m) return 15 * 60 * 1000;
  const n = Number(m[1]);
  return n * { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[m[2] as 's' | 'm' | 'h' | 'd']!;
}
