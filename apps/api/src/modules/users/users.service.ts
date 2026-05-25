import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async me(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      include: {
        memberships: {
          where: { status: 'ACTIVE' },
          include: { workspace: { select: { id: true, slug: true, name: true, logoUrl: true } } },
        },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    const { passwordHash: _ph, ...rest } = user;
    return rest;
  }

  async updateProfile(
    userId: string,
    patch: { firstName?: string; lastName?: string; avatarUrl?: string; locale?: string; timezone?: string; phone?: string },
  ) {
    return this.prisma.user.update({
      where: { id: userId },
      data: patch,
      select: { id: true, email: true, firstName: true, lastName: true, avatarUrl: true, locale: true, timezone: true, phone: true },
    });
  }

  /**
   * Soft-delete the current user's account. Revokes every refresh token and
   * marks their memberships INACTIVE so they fall out of workspace lookups
   * immediately. Email is suffixed with a timestamp so the address can be
   * reclaimed by a fresh signup. Soft delete preserves the audit trail.
   */
  async deleteAccount(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    const now = new Date();
    const tombstoneEmail = `${user.email}.deleted.${now.getTime()}`;
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { deletedAt: now, email: tombstoneEmail },
      }),
      this.prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: now } }),
      this.prisma.workspaceMember.updateMany({ where: { userId }, data: { status: 'SUSPENDED' } }),
    ]);
    return { deletedAt: now };
  }
}
