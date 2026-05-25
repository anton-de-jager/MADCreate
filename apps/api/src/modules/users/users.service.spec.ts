import { NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { createMockPrisma, type PrismaService } from '../../test/mock-helpers';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeService() {
  const prisma = createMockPrisma();
  prisma.$transaction.mockImplementation((arr: unknown[]) => Promise.resolve(arr));
  const svc = new UsersService(prisma as unknown as PrismaService);
  return { svc, prisma };
}

const fakeUser = {
  id: 'user-1',
  email: 'alice@example.com',
  firstName: 'Alice',
  lastName: 'Smith',
  avatarUrl: null,
  locale: 'en',
  timezone: 'UTC',
  phone: null,
  passwordHash: 'hashed-pw',
  deletedAt: null,
  memberships: [
    {
      status: 'ACTIVE',
      workspace: { id: 'ws-1', slug: 'acme', name: 'Acme', logoUrl: null },
    },
  ],
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('UsersService', () => {
  // ----- me ----------------------------------------------------------------
  describe('me', () => {
    it('returns the user without passwordHash', async () => {
      const { svc, prisma } = makeService();
      prisma.user.findFirst.mockResolvedValue(fakeUser);

      const result = await svc.me('user-1');

      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: { id: 'user-1', deletedAt: null },
        include: {
          memberships: {
            where: { status: 'ACTIVE' },
            include: { workspace: { select: { id: true, slug: true, name: true, logoUrl: true } } },
          },
        },
      });
      expect((result as Record<string, unknown>).passwordHash).toBeUndefined();
      expect(result.id).toBe('user-1');
      expect(result.email).toBe('alice@example.com');
      expect(result.memberships.length).toBe(1);
    });

    it('throws NotFoundException when user does not exist', async () => {
      const { svc, prisma } = makeService();
      prisma.user.findFirst.mockResolvedValue(null);

      try {
        await svc.me('no-user');
        fail('Expected me to throw');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(NotFoundException);
      }
    });
  });

  // ----- updateProfile -----------------------------------------------------
  describe('updateProfile', () => {
    it('updates and returns the profile fields', async () => {
      const { svc, prisma } = makeService();
      const updated = { id: 'user-1', email: 'alice@example.com', firstName: 'Bob', lastName: 'Smith', avatarUrl: null, locale: 'en', timezone: 'UTC', phone: null };
      prisma.user.update.mockResolvedValue(updated);

      const result = await svc.updateProfile('user-1', { firstName: 'Bob' });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { firstName: 'Bob' },
        select: { id: true, email: true, firstName: true, lastName: true, avatarUrl: true, locale: true, timezone: true, phone: true },
      });
      expect(result.firstName).toBe('Bob');
    });

    it('supports updating multiple fields at once', async () => {
      const { svc, prisma } = makeService();
      const patch = { firstName: 'Bob', lastName: 'Jones', timezone: 'US/Eastern' };
      prisma.user.update.mockResolvedValue({ id: 'user-1', email: 'alice@example.com', ...patch, avatarUrl: null, locale: 'en', phone: null });

      await svc.updateProfile('user-1', patch);

      const updateArg = prisma.user.update.mock.calls[0][0];
      expect(updateArg.where).toEqual({ id: 'user-1' });
      expect(updateArg.data).toEqual(patch);
    });
  });

  // ----- deleteAccount -----------------------------------------------------
  describe('deleteAccount', () => {
    it('soft-deletes user, revokes tokens, and suspends memberships', async () => {
      const { svc, prisma } = makeService();
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1', email: 'alice@example.com' });
      prisma.user.update.mockResolvedValue({});
      prisma.refreshToken.updateMany.mockResolvedValue({});
      prisma.workspaceMember.updateMany.mockResolvedValue({});

      const result = await svc.deleteAccount('user-1');

      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 'user-1' } });
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      const txnArgs = prisma.$transaction.mock.calls[0][0];
      expect(txnArgs.length).toBe(3);
      expect(result.deletedAt).toBeDefined();
      expect(result.deletedAt instanceof Date).toBe(true);
    });

    it('tombstones the email with a timestamp suffix', async () => {
      const { svc, prisma } = makeService();
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1', email: 'alice@example.com' });

      await svc.deleteAccount('user-1');

      const updateArg = prisma.user.update.mock.calls[0][0];
      expect(updateArg.where).toEqual({ id: 'user-1' });
      expect(updateArg.data.email).toContain('alice@example.com.deleted.');
    });

    it('throws NotFoundException when user does not exist', async () => {
      const { svc, prisma } = makeService();
      prisma.user.findUnique.mockResolvedValue(null);

      try {
        await svc.deleteAccount('no-user');
        fail('Expected deleteAccount to throw');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(NotFoundException);
      }
    });

    it('revokes all refresh tokens for the user', async () => {
      const { svc, prisma } = makeService();
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1', email: 'alice@example.com' });

      await svc.deleteAccount('user-1');

      const rtArgs = prisma.refreshToken.updateMany.mock.calls[0][0];
      expect(rtArgs.where.userId).toBe('user-1');
      expect(rtArgs.where.revokedAt).toBeNull();
      expect(rtArgs.data.revokedAt).toBeDefined();
    });

    it('suspends all workspace memberships', async () => {
      const { svc, prisma } = makeService();
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1', email: 'alice@example.com' });

      await svc.deleteAccount('user-1');

      expect(prisma.workspaceMember.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        data: { status: 'SUSPENDED' },
      });
    });
  });
});
