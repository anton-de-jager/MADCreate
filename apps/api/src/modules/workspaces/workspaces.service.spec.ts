import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { WorkspacesService } from './workspaces.service';
import { Role } from '@prisma/client';
import {
  createMockPrisma,
  createMockConfig,
  createMockMailService,
  type MockMailService,
  type PrismaService,
  type ConfigService,
  type MailService,
} from '../../test/mock-helpers';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeService() {
  const prisma = createMockPrisma();
  const mail: MockMailService = createMockMailService();
  mail.sendWorkspaceInvite.mockResolvedValue(undefined);
  const config = createMockConfig();
  config.get.mockReturnValue('http://localhost:4200');
  prisma.$transaction.mockImplementation((arr: unknown[]) => Promise.resolve(arr));
  const svc = new WorkspacesService(
    prisma as unknown as PrismaService,
    mail as unknown as MailService,
    config as unknown as ConfigService,
  );
  return { svc, prisma, mail, config };
}

const UID = 'user-1';
const WS_ID = 'ws-1';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('WorkspacesService', () => {
  // ----- assertMember -------------------------------------------------------
  describe('assertMember', () => {
    it('returns role for active member', async () => {
      const { svc, prisma } = makeService();
      prisma.workspaceMember.findUnique.mockResolvedValue({ role: 'WORKSPACE_OWNER', status: 'ACTIVE' });

      const role = await svc.assertMember(UID, WS_ID);

      expect(role).toBe('WORKSPACE_OWNER');
      expect(prisma.workspaceMember.findUnique).toHaveBeenCalledWith({
        where: { workspaceId_userId: { workspaceId: WS_ID, userId: UID } },
      });
    });

    it('throws ForbiddenException when member not found', async () => {
      const { svc, prisma } = makeService();
      prisma.workspaceMember.findUnique.mockResolvedValue(null);

      await expect(svc.assertMember(UID, WS_ID)).rejects.toThrow(ForbiddenException);
    });

    it('throws ForbiddenException when member is not ACTIVE', async () => {
      const { svc, prisma } = makeService();
      prisma.workspaceMember.findUnique.mockResolvedValue({ role: 'WORKSPACE_OWNER', status: 'SUSPENDED' });

      await expect(svc.assertMember(UID, WS_ID)).rejects.toThrow(ForbiddenException);
    });
  });

  // ----- assertRole ---------------------------------------------------------
  describe('assertRole', () => {
    it('passes for allowed roles', async () => {
      const { svc, prisma } = makeService();
      prisma.workspaceMember.findUnique.mockResolvedValue({ role: 'WORKSPACE_OWNER', status: 'ACTIVE' });

      const role = await svc.assertRole(UID, WS_ID, ['WORKSPACE_OWNER', 'ADMIN']);

      expect(role).toBe('WORKSPACE_OWNER');
    });

    it('throws ForbiddenException for disallowed roles', async () => {
      const { svc, prisma } = makeService();
      prisma.workspaceMember.findUnique.mockResolvedValue({ role: 'MEMBER', status: 'ACTIVE' });

      await expect(svc.assertRole(UID, WS_ID, ['WORKSPACE_OWNER', 'ADMIN'])).rejects.toThrow(ForbiddenException);
    });
  });

  // ----- listMine -----------------------------------------------------------
  describe('listMine', () => {
    it('returns workspaces with role attached', async () => {
      const { svc, prisma } = makeService();
      const memberships = [
        { role: 'WORKSPACE_OWNER', workspace: { id: WS_ID, slug: 'ws', name: 'My WS', logoUrl: null, planId: 'p1', createdAt: new Date() } },
        { role: 'MEMBER', workspace: { id: 'ws-2', slug: 'ws2', name: 'Other', logoUrl: null, planId: 'p1', createdAt: new Date() } },
      ];
      prisma.workspaceMember.findMany.mockResolvedValue(memberships);

      const result = await svc.listMine(UID);

      expect(prisma.workspaceMember.findMany).toHaveBeenCalledWith({
        where: { userId: UID, status: 'ACTIVE' },
        include: {
          workspace: { select: { id: true, slug: true, name: true, logoUrl: true, planId: true, createdAt: true } },
        },
        orderBy: { createdAt: 'asc' },
      });
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ ...memberships[0].workspace, role: 'WORKSPACE_OWNER' });
      expect(result[1]).toEqual({ ...memberships[1].workspace, role: 'MEMBER' });
    });
  });

  // ----- get ----------------------------------------------------------------
  describe('get', () => {
    it('returns full workspace', async () => {
      const { svc, prisma } = makeService();
      prisma.workspaceMember.findUnique.mockResolvedValue({ role: 'MEMBER', status: 'ACTIVE' });
      const ws = { id: WS_ID, name: 'WS', plan: {}, subscription: null, members: [], tenants: [] };
      prisma.workspace.findFirst.mockResolvedValue(ws);

      const result = await svc.get(UID, WS_ID);

      expect(result).toBe(ws);
      expect(prisma.workspace.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: WS_ID, deletedAt: null } }),
      );
    });

    it('throws NotFoundException when workspace missing', async () => {
      const { svc, prisma } = makeService();
      prisma.workspaceMember.findUnique.mockResolvedValue({ role: 'MEMBER', status: 'ACTIVE' });
      prisma.workspace.findFirst.mockResolvedValue(null);

      await expect(svc.get(UID, WS_ID)).rejects.toThrow(NotFoundException);
    });

    it('calls assertMember (throws if not a member)', async () => {
      const { svc, prisma } = makeService();
      prisma.workspaceMember.findUnique.mockResolvedValue(null);

      await expect(svc.get(UID, WS_ID)).rejects.toThrow(ForbiddenException);
    });
  });

  // ----- update -------------------------------------------------------------
  describe('update', () => {
    it('updates workspace when user has OWNER/ADMIN role', async () => {
      const { svc, prisma } = makeService();
      prisma.workspaceMember.findUnique.mockResolvedValue({ role: 'WORKSPACE_OWNER', status: 'ACTIVE' });
      const updated = { id: WS_ID, name: 'New Name' };
      prisma.workspace.update.mockResolvedValue(updated);

      const result = await svc.update(UID, WS_ID, { name: 'New Name' });

      expect(result).toBe(updated);
      expect(prisma.workspace.update).toHaveBeenCalledWith({
        where: { id: WS_ID },
        data: { name: 'New Name' },
      });
    });

    it('throws ForbiddenException for non-owner/admin', async () => {
      const { svc, prisma } = makeService();
      prisma.workspaceMember.findUnique.mockResolvedValue({ role: 'MEMBER', status: 'ACTIVE' });

      await expect(svc.update(UID, WS_ID, { name: 'New Name' })).rejects.toThrow(ForbiddenException);
    });
  });

  // ----- invite -------------------------------------------------------------
  describe('invite', () => {
    it('creates invite, sends email, and asserts role', async () => {
      const { svc, prisma, mail } = makeService();
      prisma.workspaceMember.findUnique.mockResolvedValue({ role: 'WORKSPACE_OWNER', status: 'ACTIVE' });
      prisma.workspace.findUnique.mockResolvedValue({ name: 'My WS' });
      prisma.user.findUnique.mockResolvedValue({ firstName: 'John', lastName: 'Doe', email: 'john@example.com' });
      const invite = { id: 'inv-1', email: 'new@example.com', role: 'MEMBER', tokenHash: 'abc' };
      prisma.workspaceInvite.create.mockResolvedValue(invite);

      const result = await svc.invite(UID, WS_ID, { email: 'new@example.com', role: Role.EDITOR });

      expect(result).toBe(invite);
      expect(prisma.workspaceInvite.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            workspaceId: WS_ID,
            email: 'new@example.com',
            role: 'EDITOR',
            invitedById: UID,
          }),
        }),
      );
      expect(mail.sendWorkspaceInvite).toHaveBeenCalled();
    });

    it('throws ForbiddenException for non-owner/admin', async () => {
      const { svc, prisma } = makeService();
      prisma.workspaceMember.findUnique.mockResolvedValue({ role: 'MEMBER', status: 'ACTIVE' });

      await expect(svc.invite(UID, WS_ID, { email: 'new@example.com', role: Role.EDITOR })).rejects.toThrow(ForbiddenException);
    });
  });

  // ----- stats --------------------------------------------------------------
  describe('stats', () => {
    it('returns 4 count values', async () => {
      const { svc, prisma } = makeService();
      prisma.workspaceMember.findUnique.mockResolvedValue({ role: 'MEMBER', status: 'ACTIVE' });
      prisma.tenant.count.mockResolvedValue(3);
      prisma.site.count.mockResolvedValue(5);
      prisma.aIGeneration.count.mockResolvedValue(10);
      prisma.deployment.count.mockResolvedValue(2);

      const result = await svc.stats(UID, WS_ID);

      expect(result).toEqual({ tenants: 3, sites: 5, generations: 10, deployments: 2 });
    });
  });

  // ----- members ------------------------------------------------------------
  describe('members', () => {
    it('returns member list with user details', async () => {
      const { svc, prisma } = makeService();
      prisma.workspaceMember.findUnique.mockResolvedValue({ role: 'MEMBER', status: 'ACTIVE' });
      const now = new Date();
      const rows = [
        { userId: UID, role: 'WORKSPACE_OWNER', createdAt: now, user: { id: UID, email: 'a@b.com', firstName: 'A', lastName: 'B', avatarUrl: null } },
      ];
      prisma.workspaceMember.findMany.mockResolvedValue(rows);

      const result = await svc.members(UID, WS_ID);

      expect(result).toEqual([
        { userId: UID, role: 'WORKSPACE_OWNER', joinedAt: now, user: rows[0].user },
      ]);
    });
  });

  // ----- leave --------------------------------------------------------------
  describe('leave', () => {
    it('sets member status to SUSPENDED', async () => {
      const { svc, prisma } = makeService();
      prisma.workspaceMember.findUnique.mockResolvedValue({ role: 'MEMBER', status: 'ACTIVE' });
      prisma.workspaceMember.update.mockResolvedValue({});

      const result = await svc.leave(UID, WS_ID);

      expect(result).toEqual({ left: true });
      expect(prisma.workspaceMember.update).toHaveBeenCalledWith({
        where: { workspaceId_userId: { workspaceId: WS_ID, userId: UID } },
        data: { status: 'SUSPENDED' },
      });
    });

    it('allows owner to leave when there are other owners', async () => {
      const { svc, prisma } = makeService();
      prisma.workspaceMember.findUnique.mockResolvedValue({ role: 'WORKSPACE_OWNER', status: 'ACTIVE' });
      prisma.workspaceMember.count.mockResolvedValue(2);
      prisma.workspaceMember.update.mockResolvedValue({});

      const result = await svc.leave(UID, WS_ID);

      expect(result).toEqual({ left: true });
    });

    it('throws ForbiddenException when sole owner tries to leave', async () => {
      const { svc, prisma } = makeService();
      prisma.workspaceMember.findUnique.mockResolvedValue({ role: 'WORKSPACE_OWNER', status: 'ACTIVE' });
      prisma.workspaceMember.count.mockResolvedValue(1);

      await expect(svc.leave(UID, WS_ID)).rejects.toThrow(ForbiddenException);
    });
  });

  // ----- acceptInvite -------------------------------------------------------
  describe('acceptInvite', () => {
    const TOKEN = 'raw-invite-token-abc123';
    const TOKEN_HASH = createHash('sha256').update(TOKEN).digest('hex');

    function makeInvite(overrides: Record<string, unknown> = {}) {
      return {
        id: 'inv-1',
        workspaceId: WS_ID,
        email: 'user@example.com',
        role: 'MEMBER',
        tokenHash: TOKEN_HASH,
        acceptedAt: null,
        expiresAt: new Date(Date.now() + 86_400_000), // future
        workspace: { id: WS_ID, slug: 'ws', name: 'My WS' },
        ...overrides,
      };
    }

    it('creates membership and marks invite accepted', async () => {
      const { svc, prisma } = makeService();
      const invite = makeInvite();
      prisma.workspaceInvite.findUnique.mockResolvedValue(invite);
      prisma.user.findUnique.mockResolvedValue({ id: UID, email: 'user@example.com' });
      prisma.workspaceMember.findUnique.mockResolvedValue(null);
      prisma.workspaceMember.create.mockResolvedValue({});
      prisma.workspaceInvite.update.mockResolvedValue({});

      const result = await svc.acceptInvite(UID, TOKEN);

      expect(result).toEqual({ workspace: invite.workspace, alreadyMember: false });
      expect(prisma.workspaceInvite.findUnique).toHaveBeenCalledWith({
        where: { tokenHash: TOKEN_HASH },
        include: { workspace: { select: { id: true, slug: true, name: true } } },
      });
      expect(prisma.workspaceMember.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          workspaceId: WS_ID,
          userId: UID,
          role: 'MEMBER',
          status: 'ACTIVE',
        }),
      });
      expect(prisma.workspaceInvite.update).toHaveBeenCalledWith({
        where: { id: 'inv-1' },
        data: { acceptedAt: expect.any(Date) },
      });
    });

    it('throws BadRequestException for missing invite', async () => {
      const { svc, prisma } = makeService();
      prisma.workspaceInvite.findUnique.mockResolvedValue(null);

      await expect(svc.acceptInvite(UID, TOKEN)).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException for already-accepted invite', async () => {
      const { svc, prisma } = makeService();
      prisma.workspaceInvite.findUnique.mockResolvedValue(makeInvite({ acceptedAt: new Date() }));

      await expect(svc.acceptInvite(UID, TOKEN)).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException for expired invite', async () => {
      const { svc, prisma } = makeService();
      prisma.workspaceInvite.findUnique.mockResolvedValue(makeInvite({ expiresAt: new Date(Date.now() - 86_400_000) }));

      await expect(svc.acceptInvite(UID, TOKEN)).rejects.toThrow(BadRequestException);
    });

    it('throws ForbiddenException when email does not match', async () => {
      const { svc, prisma } = makeService();
      prisma.workspaceInvite.findUnique.mockResolvedValue(makeInvite());
      prisma.user.findUnique.mockResolvedValue({ id: UID, email: 'other@example.com' });

      await expect(svc.acceptInvite(UID, TOKEN)).rejects.toThrow(ForbiddenException);
    });

    it('handles already-member case', async () => {
      const { svc, prisma } = makeService();
      const invite = makeInvite();
      prisma.workspaceInvite.findUnique.mockResolvedValue(invite);
      prisma.user.findUnique.mockResolvedValue({ id: UID, email: 'user@example.com' });
      prisma.workspaceMember.findUnique.mockResolvedValue({ status: 'ACTIVE' });
      prisma.workspaceInvite.update.mockResolvedValue({});

      const result = await svc.acceptInvite(UID, TOKEN);

      expect(result).toEqual({ workspace: invite.workspace, alreadyMember: true });
      expect(prisma.workspaceMember.create).not.toHaveBeenCalled();
    });

    it('reactivates suspended member', async () => {
      const { svc, prisma } = makeService();
      const invite = makeInvite();
      prisma.workspaceInvite.findUnique.mockResolvedValue(invite);
      prisma.user.findUnique.mockResolvedValue({ id: UID, email: 'user@example.com' });
      prisma.workspaceMember.findUnique.mockResolvedValue({ status: 'SUSPENDED' });
      prisma.workspaceMember.update.mockResolvedValue({});
      prisma.workspaceInvite.update.mockResolvedValue({});

      const result = await svc.acceptInvite(UID, TOKEN);

      expect(result).toEqual({ workspace: invite.workspace, alreadyMember: false });
      expect(prisma.workspaceMember.update).toHaveBeenCalledWith({
        where: { workspaceId_userId: { workspaceId: WS_ID, userId: UID } },
        data: { status: 'ACTIVE', role: 'MEMBER' },
      });
      expect(prisma.workspaceMember.create).not.toHaveBeenCalled();
    });
  });
});
