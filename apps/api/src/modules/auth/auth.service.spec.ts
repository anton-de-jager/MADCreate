import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import * as argon2 from 'argon2';
import {
  createMockPrisma,
  createMockTokenService,
  createMockConfig,
  createMockMailService,
  type PrismaService,
  type TokenService,
  type ConfigService,
  type MailService,
} from '../../test/mock-helpers';
import type { RegisterDto, LoginDto, ResetPasswordDto, ChangePasswordDto, MagicLinkRequestDto } from './dto/auth.dto';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeService() {
  const prisma = createMockPrisma();
  const tokens = createMockTokenService();
  const config = createMockConfig();
  const mail = createMockMailService();

  // Set up sensible defaults that many tests rely on
  tokens.generateToken.mockReturnValue({ raw: 'raw-token', hash: 'hashed-token' });
  tokens.issueTokens.mockResolvedValue({ accessToken: 'at', refreshToken: 'rt' });
  tokens.rotateRefresh.mockResolvedValue({ accessToken: 'at2', refreshToken: 'rt2' });
  tokens.revokeAllForUser.mockResolvedValue(undefined);
  tokens.hash.mockReturnValue('hashed-token');
  config.get.mockReturnValue('http://localhost:4200');
  mail.sendVerificationEmail.mockResolvedValue(undefined);
  mail.sendPasswordResetEmail.mockResolvedValue(undefined);
  mail.sendMagicLink.mockResolvedValue(undefined);
  prisma.$transaction.mockImplementation((arr: unknown[]) => Promise.resolve(arr));

  const svc = new AuthService(
    prisma as unknown as PrismaService,
    tokens as unknown as TokenService,
    config as unknown as ConfigService,
    mail as unknown as MailService,
  );
  return { svc, prisma, tokens, config, mail };
}

const fakeUser = {
  id: 'user-1',
  email: 'alice@example.com',
  firstName: 'Alice',
  lastName: 'Smith',
  avatarUrl: null,
  isSuperAdmin: false,
  emailVerifiedAt: null,
  passwordHash: 'hashed-pw',
  deletedAt: null,
  lastLoginAt: null,
  lastLoginIp: null,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AuthService', () => {
  // ----- register ----------------------------------------------------------
  describe('register', () => {
    it('creates a user, workspace, and returns tokens', async () => {
      const { svc, prisma, tokens } = makeService();
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(fakeUser);
      prisma.plan.findUnique.mockResolvedValue({ id: 'plan-free' });
      prisma.workspace.findUnique.mockResolvedValue(null); // slug not taken
      prisma.workspace.create.mockResolvedValue({ id: 'ws-1', slug: 'alice-s-workspace', name: "Alice's Workspace" });
      prisma.emailVerification.create.mockResolvedValue({});

      const result = await svc.register({
        email: 'Alice@Example.com',
        password: 'Secret123!',
        firstName: 'Alice',
        lastName: 'Smith',
      } as RegisterDto);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { email: 'alice@example.com' } });
      expect(prisma.user.create).toHaveBeenCalledTimes(1);
      expect(prisma.workspace.create).toHaveBeenCalledTimes(1);
      expect(tokens.issueTokens).toHaveBeenCalledTimes(1);
      expect(result.user.email).toBe('alice@example.com');
      expect(result.tokens).toBeDefined();
      expect(result.workspace.id).toBe('ws-1');
    });

    it('throws BadRequest when email is already in use', async () => {
      const { svc, prisma } = makeService();
      prisma.user.findUnique.mockResolvedValue(fakeUser);

      try {
        await svc.register({ email: 'alice@example.com', password: 'P@ss1234' } as RegisterDto);
        fail('Expected register to throw');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(BadRequestException);
      }
    });
  });

  // ----- login -------------------------------------------------------------
  describe('login', () => {
    it('returns tokens and memberships on valid credentials', async () => {
      const { svc, prisma } = makeService();
      const hashedPw = await argon2.hash('Secret123!');
      const user = { ...fakeUser, passwordHash: hashedPw };
      prisma.user.findFirst.mockResolvedValue(user);
      prisma.user.update.mockResolvedValue(user);
      prisma.workspaceMember.findFirst.mockResolvedValue({
        workspaceId: 'ws-1',
        role: 'WORKSPACE_OWNER',
        workspace: { id: 'ws-1', slug: 'acme', name: 'Acme' },
      });
      prisma.workspaceMember.findMany.mockResolvedValue([
        {
          workspaceId: 'ws-1',
          role: 'WORKSPACE_OWNER',
          workspace: { id: 'ws-1', slug: 'acme', name: 'Acme' },
        },
      ]);

      const result = await svc.login({ email: 'alice@example.com', password: 'Secret123!' } as LoginDto);

      expect(result.user.id).toBe('user-1');
      expect(result.tokens).toBeDefined();
      expect(result.memberships.length).toBe(1);
      expect(result.currentWorkspaceId).toBe('ws-1');
    });

    it('throws Unauthorized when user not found', async () => {
      const { svc, prisma } = makeService();
      prisma.user.findFirst.mockResolvedValue(null);

      try {
        await svc.login({ email: 'no@example.com', password: 'pw' } as LoginDto);
        fail('Expected login to throw');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(UnauthorizedException);
      }
    });

    it('throws Unauthorized on wrong password', async () => {
      const { svc, prisma } = makeService();
      const hashedPw = await argon2.hash('correct');
      prisma.user.findFirst.mockResolvedValue({ ...fakeUser, passwordHash: hashedPw });

      try {
        await svc.login({ email: 'alice@example.com', password: 'wrong' } as LoginDto);
        fail('Expected login to throw');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(UnauthorizedException);
      }
    });
  });

  // ----- refresh -----------------------------------------------------------
  describe('refresh', () => {
    it('delegates to tokens.rotateRefresh and returns new tokens', async () => {
      const { svc, tokens } = makeService();
      const result = await svc.refresh('old-rt');
      expect(tokens.rotateRefresh).toHaveBeenCalledWith('old-rt', undefined, undefined);
      expect(result.tokens).toBeDefined();
    });

    it('throws Unauthorized when rotateRefresh fails', async () => {
      const { svc, tokens } = makeService();
      tokens.rotateRefresh.mockRejectedValue(new Error('bad token'));

      try {
        await svc.refresh('bad-rt');
        fail('Expected refresh to throw');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(UnauthorizedException);
      }
    });
  });

  // ----- logout ------------------------------------------------------------
  describe('logout', () => {
    it('revokes all tokens for the user', async () => {
      const { svc, tokens } = makeService();
      await svc.logout('user-1');
      expect(tokens.revokeAllForUser).toHaveBeenCalledWith('user-1');
    });
  });

  // ----- resetPassword -----------------------------------------------------
  describe('resetPassword', () => {
    it('updates password and marks token used', async () => {
      const { svc, prisma, tokens } = makeService();
      prisma.passwordReset.findUnique.mockResolvedValue({
        id: 'pr-1',
        userId: 'user-1',
        tokenHash: 'hashed-token',
        usedAt: null,
        expiresAt: new Date(Date.now() + 60_000),
      });

      await svc.resetPassword({ token: 'raw-token', password: 'NewP@ss1!' } as ResetPasswordDto);

      expect(tokens.hash).toHaveBeenCalledWith('raw-token');
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('throws BadRequest when token is expired', async () => {
      const { svc, prisma } = makeService();
      prisma.passwordReset.findUnique.mockResolvedValue({
        id: 'pr-1',
        userId: 'user-1',
        tokenHash: 'hashed-token',
        usedAt: null,
        expiresAt: new Date(Date.now() - 60_000),
      });

      try {
        await svc.resetPassword({ token: 'raw-token', password: 'NewP@ss1!' } as ResetPasswordDto);
        fail('Expected resetPassword to throw');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(BadRequestException);
      }
    });

    it('throws BadRequest when token was already used', async () => {
      const { svc, prisma } = makeService();
      prisma.passwordReset.findUnique.mockResolvedValue({
        id: 'pr-1',
        userId: 'user-1',
        tokenHash: 'hashed-token',
        usedAt: new Date(),
        expiresAt: new Date(Date.now() + 60_000),
      });

      try {
        await svc.resetPassword({ token: 'raw-token', password: 'NewP@ss1!' } as ResetPasswordDto);
        fail('Expected resetPassword to throw');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(BadRequestException);
      }
    });
  });

  // ----- changePassword ----------------------------------------------------
  describe('changePassword', () => {
    it('changes password when current password is correct', async () => {
      const { svc, prisma } = makeService();
      const hashedPw = await argon2.hash('OldP@ss1!');
      prisma.user.findUnique.mockResolvedValue({ ...fakeUser, passwordHash: hashedPw });

      await svc.changePassword('user-1', {
        currentPassword: 'OldP@ss1!',
        newPassword: 'NewP@ss2!',
      } as ChangePasswordDto);

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('throws Unauthorized when current password is wrong', async () => {
      const { svc, prisma } = makeService();
      const hashedPw = await argon2.hash('correct');
      prisma.user.findUnique.mockResolvedValue({ ...fakeUser, passwordHash: hashedPw });

      try {
        await svc.changePassword('user-1', { currentPassword: 'wrong', newPassword: 'New1!' } as ChangePasswordDto);
        fail('Expected changePassword to throw');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(UnauthorizedException);
      }
    });

    it('throws BadRequest when user not found', async () => {
      const { svc, prisma } = makeService();
      prisma.user.findUnique.mockResolvedValue(null);

      try {
        await svc.changePassword('user-1', { currentPassword: 'x', newPassword: 'y' } as ChangePasswordDto);
        fail('Expected changePassword to throw');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(BadRequestException);
      }
    });

    it('throws BadRequest when new password equals current', async () => {
      const { svc, prisma } = makeService();
      const hashedPw = await argon2.hash('Same1234!');
      prisma.user.findUnique.mockResolvedValue({ ...fakeUser, passwordHash: hashedPw });

      try {
        await svc.changePassword('user-1', { currentPassword: 'Same1234!', newPassword: 'Same1234!' } as ChangePasswordDto);
        fail('Expected changePassword to throw');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(BadRequestException);
      }
    });
  });

  // ----- verifyEmail -------------------------------------------------------
  describe('verifyEmail', () => {
    it('marks user email as verified', async () => {
      const { svc, prisma } = makeService();
      prisma.emailVerification.findUnique.mockResolvedValue({
        id: 'ev-1',
        userId: 'user-1',
        tokenHash: 'hashed-token',
        usedAt: null,
        expiresAt: new Date(Date.now() + 60_000),
      });

      await svc.verifyEmail('raw-token');
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('throws BadRequest for invalid token', async () => {
      const { svc, prisma } = makeService();
      prisma.emailVerification.findUnique.mockResolvedValue(null);

      try {
        await svc.verifyEmail('bad');
        fail('Expected verifyEmail to throw');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(BadRequestException);
      }
    });
  });

  // ----- requestPasswordReset ----------------------------------------------
  describe('requestPasswordReset', () => {
    it('creates a reset token and sends email when user exists', async () => {
      const { svc, prisma, mail } = makeService();
      prisma.user.findUnique.mockResolvedValue(fakeUser);

      await svc.requestPasswordReset('alice@example.com');

      expect(prisma.passwordReset.create).toHaveBeenCalledTimes(1);
      expect(mail.sendPasswordResetEmail).toHaveBeenCalledTimes(1);
    });

    it('does nothing when user does not exist (no leak)', async () => {
      const { svc, prisma, mail } = makeService();
      prisma.user.findUnique.mockResolvedValue(null);

      await svc.requestPasswordReset('unknown@example.com');

      expect(prisma.passwordReset.create).not.toHaveBeenCalled();
      expect(mail.sendPasswordResetEmail).not.toHaveBeenCalled();
    });
  });

  // ----- requestMagicLink --------------------------------------------------
  describe('requestMagicLink', () => {
    it('creates a magic link token and sends email when user exists', async () => {
      const { svc, prisma, mail } = makeService();
      prisma.user.findUnique.mockResolvedValue(fakeUser);
      prisma.magicLink.create.mockResolvedValue({});

      await svc.requestMagicLink({ email: 'Alice@Example.com', redirect: '/dashboard' } as MagicLinkRequestDto);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { email: 'alice@example.com' } });
      expect(prisma.magicLink.create).toHaveBeenCalledTimes(1);
      expect(mail.sendMagicLink).toHaveBeenCalledTimes(1);
      expect(mail.sendMagicLink).toHaveBeenCalledWith(
        'alice@example.com',
        'raw-token',
        'http://localhost:4200',
        '/dashboard',
      );
    });

    it('does nothing when user does not exist (no leak)', async () => {
      const { svc, prisma, mail } = makeService();
      prisma.user.findUnique.mockResolvedValue(null);

      await svc.requestMagicLink({ email: 'unknown@example.com' } as MagicLinkRequestDto);

      expect(prisma.magicLink.create).not.toHaveBeenCalled();
      expect(mail.sendMagicLink).not.toHaveBeenCalled();
    });
  });

  // ----- consumeMagicLink --------------------------------------------------
  describe('consumeMagicLink', () => {
    const fakeMagicLinkRecord = {
      id: 'ml-1',
      userId: 'user-1',
      tokenHash: 'hashed-token',
      usedAt: null,
      redirect: '/dashboard',
      expiresAt: new Date(Date.now() + 60_000),
      user: { ...fakeUser },
    };

    const fakeMembership = {
      workspaceId: 'ws-1',
      role: 'WORKSPACE_OWNER',
      workspace: { id: 'ws-1', slug: 'acme', name: 'Acme' },
    };

    it('returns user, tokens, memberships, and redirect for a valid token', async () => {
      const { svc, prisma } = makeService();
      prisma.magicLink.findUnique.mockResolvedValue({ ...fakeMagicLinkRecord });
      prisma.magicLink.update.mockResolvedValue({});
      prisma.user.update.mockResolvedValue(fakeUser);
      prisma.workspaceMember.findFirst.mockResolvedValue(fakeMembership);
      prisma.workspaceMember.findMany.mockResolvedValue([fakeMembership]);

      const result = await svc.consumeMagicLink('raw-token', { ip: '127.0.0.1' });

      expect(result.user.id).toBe('user-1');
      expect(result.tokens).toBeDefined();
      expect(result.memberships.length).toBe(1);
      expect(result.currentWorkspaceId).toBe('ws-1');
      expect(result.redirect).toBe('/dashboard');
    });

    it('auto-verifies email if not yet verified', async () => {
      const { svc, prisma } = makeService();
      prisma.magicLink.findUnique.mockResolvedValue({
        ...fakeMagicLinkRecord,
        user: { ...fakeUser, emailVerifiedAt: null },
      });
      prisma.magicLink.update.mockResolvedValue({});
      prisma.user.update.mockResolvedValue(fakeUser);
      prisma.workspaceMember.findFirst.mockResolvedValue(fakeMembership);
      prisma.workspaceMember.findMany.mockResolvedValue([fakeMembership]);

      await svc.consumeMagicLink('raw-token');

      // First call: emailVerifiedAt update; second call: lastLoginAt update
      expect(prisma.user.update).toHaveBeenCalledTimes(2);
      const firstCall = prisma.user.update.mock.calls[0][0];
      expect(firstCall.where).toEqual({ id: 'user-1' });
      expect(firstCall.data.emailVerifiedAt).toBeInstanceOf(Date);
    });

    it('skips email verification if already verified', async () => {
      const { svc, prisma } = makeService();
      prisma.magicLink.findUnique.mockResolvedValue({
        ...fakeMagicLinkRecord,
        user: { ...fakeUser, emailVerifiedAt: new Date() },
      });
      prisma.magicLink.update.mockResolvedValue({});
      prisma.user.update.mockResolvedValue(fakeUser);
      prisma.workspaceMember.findFirst.mockResolvedValue(fakeMembership);
      prisma.workspaceMember.findMany.mockResolvedValue([fakeMembership]);

      await svc.consumeMagicLink('raw-token');

      // Only the lastLoginAt update, no emailVerifiedAt update
      expect(prisma.user.update).toHaveBeenCalledTimes(1);
    });

    it('throws BadRequest when token is not found', async () => {
      const { svc, prisma } = makeService();
      prisma.magicLink.findUnique.mockResolvedValue(null);

      try {
        await svc.consumeMagicLink('bad-token');
        fail('Expected consumeMagicLink to throw');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(BadRequestException);
      }
    });

    it('throws BadRequest when token is expired', async () => {
      const { svc, prisma } = makeService();
      prisma.magicLink.findUnique.mockResolvedValue({
        ...fakeMagicLinkRecord,
        expiresAt: new Date(Date.now() - 60_000),
      });

      try {
        await svc.consumeMagicLink('raw-token');
        fail('Expected consumeMagicLink to throw');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(BadRequestException);
      }
    });

    it('throws BadRequest when token was already used', async () => {
      const { svc, prisma } = makeService();
      prisma.magicLink.findUnique.mockResolvedValue({
        ...fakeMagicLinkRecord,
        usedAt: new Date(),
      });

      try {
        await svc.consumeMagicLink('raw-token');
        fail('Expected consumeMagicLink to throw');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(BadRequestException);
      }
    });
  });
});
