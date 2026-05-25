import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import type { JwtPayload, Role } from '@madcreate/shared';

function ttlToMs(ttl: string): number {
  const m = /^(\d+)([smhd])$/.exec(ttl);
  if (!m) return 15 * 60 * 1000;
  const n = Number(m[1]);
  const u = m[2];
  return n * { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[u as 's' | 'm' | 'h' | 'd']!;
}

@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  /** Mint short-lived access JWT + persist refresh token (sha256 hash only). */
  async issueTokens(
    userId: string,
    email: string,
    opts: { workspaceId?: string; role?: Role; superAdmin?: boolean; userAgent?: string; ip?: string } = {},
  ) {
    const payload: JwtPayload = {
      sub: userId,
      email,
      superAdmin: opts.superAdmin,
      wsid: opts.workspaceId,
      role: opts.role,
    };
    const accessToken = await this.jwt.signAsync(payload);

    const rawRefresh = randomBytes(48).toString('hex');
    const refreshHash = this.hash(rawRefresh);
    const refreshTtl = this.config.get<string>('jwt.refreshTtl') ?? '30d';

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: refreshHash,
        userAgent: opts.userAgent?.slice(0, 1024),
        ip: opts.ip,
        expiresAt: new Date(Date.now() + ttlToMs(refreshTtl)),
      },
    });

    return {
      accessToken,
      refreshToken: rawRefresh,
      expiresIn: Math.floor(ttlToMs(this.config.get<string>('jwt.accessTtl') ?? '15m') / 1000),
      tokenType: 'Bearer' as const,
    };
  }

  async rotateRefresh(rawRefresh: string, userAgent?: string, ip?: string) {
    const hash = this.hash(rawRefresh);
    const current = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hash },
      include: { user: true },
    });
    if (!current || current.revokedAt || current.expiresAt < new Date()) {
      throw new Error('Refresh token invalid or expired');
    }
    await this.prisma.refreshToken.update({
      where: { id: current.id },
      data: { revokedAt: new Date() },
    });
    return this.issueTokens(current.user.id, current.user.email, {
      superAdmin: current.user.isSuperAdmin,
      userAgent,
      ip,
    });
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  hash(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }

  generateToken(bytes = 32): { raw: string; hash: string } {
    const raw = randomBytes(bytes).toString('hex');
    return { raw, hash: this.hash(raw) };
  }
}
