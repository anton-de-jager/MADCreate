import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { Role } from '@prisma/client';

@Injectable()
export class WorkspacesService {
  private readonly logger = new Logger(WorkspacesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

  async listMine(userId: string) {
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

  async get(userId: string, workspaceId: string) {
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
    if (!ws) throw new NotFoundException('Workspace not found');
    return ws;
  }

  async update(userId: string, workspaceId: string, patch: { name?: string; logoUrl?: string; description?: string; billingEmail?: string }) {
    await this.assertRole(userId, workspaceId, ['WORKSPACE_OWNER', 'ADMIN']);
    return this.prisma.workspace.update({ where: { id: workspaceId }, data: patch });
  }

  async invite(userId: string, workspaceId: string, dto: { email: string; role: Role }) {
    await this.assertRole(userId, workspaceId, ['WORKSPACE_OWNER', 'ADMIN']);

    const ws = await this.prisma.workspace.findUnique({ where: { id: workspaceId }, select: { name: true } });
    const inviter = await this.prisma.user.findUnique({ where: { id: userId }, select: { firstName: true, lastName: true, email: true } });

    const raw = randomBytes(24).toString('hex');
    const tokenHash = createHash('sha256').update(raw).digest('hex');

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
    const appUrl = this.config.get<string>('web.url') ?? 'http://localhost:4200';
    await this.mail.sendWorkspaceInvite(invite.email, inviterName, ws?.name ?? 'a workspace', raw, appUrl).catch((err) => this.logger.error('Failed to send workspace invite email', err.stack ?? err));
    return invite;
  }

  /**
   * Cheap aggregate counts for the dashboard home stat strip:
   * tenants in this workspace (active only), sites across those tenants,
   * AI generations in the last 30 days, deployments in the last 30 days.
   * Runs four count queries in parallel — single round trip per count.
   */
  async stats(userId: string, workspaceId: string) {
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

  /** Plain members list for the settings UI — no other workspace metadata. */
  async members(userId: string, workspaceId: string) {
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

  /**
   * Leave a workspace. Owners cannot leave if they're the only owner (would
   * orphan the workspace); they must transfer ownership or delete first.
   */
  async leave(userId: string, workspaceId: string) {
    const role = await this.assertMember(userId, workspaceId);
    if (role === 'WORKSPACE_OWNER') {
      const owners = await this.prisma.workspaceMember.count({
        where: { workspaceId, role: 'WORKSPACE_OWNER', status: 'ACTIVE' },
      });
      if (owners <= 1) {
        throw new ForbiddenException('You are the only owner of this workspace. Transfer ownership or delete the workspace first.');
      }
    }
    await this.prisma.workspaceMember.update({
      where: { workspaceId_userId: { workspaceId, userId } },
      data: { status: 'SUSPENDED' },
    });
    return { left: true };
  }

  async acceptInvite(userId: string, token: string) {
    const hash = createHash('sha256').update(token).digest('hex');
    const invite = await this.prisma.workspaceInvite.findUnique({
      where: { tokenHash: hash },
      include: { workspace: { select: { id: true, slug: true, name: true } } },
    });
    if (!invite) throw new BadRequestException('Invite not found');
    if (invite.acceptedAt) throw new BadRequestException('Invite already accepted');
    if (invite.expiresAt < new Date()) throw new BadRequestException('Invite has expired');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');
    if (user.email.toLowerCase() !== invite.email.toLowerCase()) {
      throw new ForbiddenException('This invite was sent to a different email address');
    }

    // Check if already a member.
    const existing = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: invite.workspaceId, userId } },
    });
    if (existing && existing.status === 'ACTIVE') {
      // Already a member — mark invite accepted and return workspace.
      await this.prisma.workspaceInvite.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } });
      return { workspace: invite.workspace, alreadyMember: true };
    }

    if (existing) {
      // Reactivate suspended member.
      await this.prisma.workspaceMember.update({
        where: { workspaceId_userId: { workspaceId: invite.workspaceId, userId } },
        data: { status: 'ACTIVE', role: invite.role },
      });
    } else {
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

  async assertMember(userId: string, workspaceId: string): Promise<Role> {
    const m = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });
    if (!m || m.status !== 'ACTIVE') throw new ForbiddenException('Not a member of this workspace');
    return m.role;
  }

  async assertRole(userId: string, workspaceId: string, allowed: Role[]): Promise<Role> {
    const role = await this.assertMember(userId, workspaceId);
    if (!allowed.includes(role)) throw new ForbiddenException(`Role ${role} not allowed`);
    return role;
  }
}
