import { TokenService } from './token.service';
import {
  createMockPrisma,
  createMockConfig,
  type PrismaService,
  type ConfigService,
} from '../../test/mock-helpers';
import type { JwtService } from '@nestjs/jwt';

// ---------------------------------------------------------------------------
// Mock JwtService
// ---------------------------------------------------------------------------

interface MockJwtService {
  signAsync: jest.Mock;
  verifyAsync: jest.Mock;
}

function createMockJwt(): MockJwtService {
  return {
    signAsync: jest.fn().mockResolvedValue('mock-jwt'),
    verifyAsync: jest.fn(),
  };
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

function makeService() {
  const prisma = createMockPrisma();
  const config = createMockConfig();
  const jwt = createMockJwt();

  config.get.mockImplementation((key: string) => {
    const map: Record<string, string> = {
      'jwt.refreshTtl': '30d',
      'jwt.accessTtl': '15m',
    };
    return map[key];
  });

  prisma.refreshToken.create.mockResolvedValue({ id: 'rt-1' });
  prisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });

  const svc = new TokenService(
    jwt as unknown as JwtService,
    config as unknown as ConfigService,
    prisma as unknown as PrismaService,
  );

  return { svc, prisma, config, jwt };
}

// ===========================================================================
// Tests
// ===========================================================================

describe('TokenService', () => {
  // -------------------------------------------------------------------------
  // issueTokens
  // -------------------------------------------------------------------------
  describe('issueTokens', () => {
    it('signs JWT with correct payload fields', async () => {
      const { svc, jwt } = makeService();

      await svc.issueTokens('user-1', 'alice@example.com', {
        superAdmin: true,
        workspaceId: 'ws-1',
        role: 'WORKSPACE_OWNER',
      });

      expect(jwt.signAsync).toHaveBeenCalledTimes(1);
      const payload = jwt.signAsync.mock.calls[0][0];
      expect(payload).toMatchObject({
        sub: 'user-1',
        email: 'alice@example.com',
        superAdmin: true,
        wsid: 'ws-1',
        role: 'WORKSPACE_OWNER',
      });
    });

    it('persists refresh token with hashed value in DB', async () => {
      const { svc, prisma } = makeService();

      await svc.issueTokens('user-1', 'alice@example.com');

      expect(prisma.refreshToken.create).toHaveBeenCalledTimes(1);
      const data = prisma.refreshToken.create.mock.calls[0][0].data;
      expect(data.userId).toBe('user-1');
      // tokenHash must be a 64-char hex string (sha256)
      expect(data.tokenHash).toMatch(/^[0-9a-f]{64}$/);
      expect(data.expiresAt).toBeInstanceOf(Date);
    });

    it('returns accessToken, refreshToken, expiresIn, tokenType', async () => {
      const { svc } = makeService();

      const result = await svc.issueTokens('user-1', 'alice@example.com');

      expect(result.accessToken).toBe('mock-jwt');
      // refreshToken is raw hex bytes, not the hash stored in DB
      expect(typeof result.refreshToken).toBe('string');
      expect(result.refreshToken.length).toBeGreaterThan(0);
      expect(typeof result.expiresIn).toBe('number');
      expect(result.expiresIn).toBeGreaterThan(0);
      expect(result.tokenType).toBe('Bearer');
    });

    it('slices long userAgent to 1024 chars', async () => {
      const { svc, prisma } = makeService();
      const longUa = 'A'.repeat(2000);

      await svc.issueTokens('user-1', 'a@b.com', { userAgent: longUa });

      const data = prisma.refreshToken.create.mock.calls[0][0].data;
      expect(data.userAgent).toHaveLength(1024);
    });
  });

  // -------------------------------------------------------------------------
  // rotateRefresh
  // -------------------------------------------------------------------------
  describe('rotateRefresh', () => {
    function setupValidToken(prisma: ReturnType<typeof createMockPrisma>) {
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        userId: 'user-1',
        tokenHash: 'some-hash',
        revokedAt: null,
        expiresAt: new Date(Date.now() + 86_400_000),
        user: { id: 'user-1', email: 'alice@example.com', isSuperAdmin: false },
      });
      prisma.refreshToken.update.mockResolvedValue({});
    }

    it('finds token by hash, revokes it, and issues new pair', async () => {
      const { svc, prisma } = makeService();
      setupValidToken(prisma);

      const result = await svc.rotateRefresh('raw-token-value', 'Mozilla/5.0', '127.0.0.1');

      // looked up by hash
      expect(prisma.refreshToken.findUnique).toHaveBeenCalledTimes(1);
      const where = prisma.refreshToken.findUnique.mock.calls[0][0].where;
      expect(where.tokenHash).toBe(svc.hash('raw-token-value'));

      // revoked old token
      expect(prisma.refreshToken.update).toHaveBeenCalledTimes(1);
      const updateArgs = prisma.refreshToken.update.mock.calls[0][0];
      expect(updateArgs.where.id).toBe('rt-1');
      expect(updateArgs.data.revokedAt).toBeInstanceOf(Date);

      // issued new pair
      expect(result.accessToken).toBe('mock-jwt');
      expect(result.tokenType).toBe('Bearer');
    });

    it('throws when token not found', async () => {
      const { svc, prisma } = makeService();
      prisma.refreshToken.findUnique.mockResolvedValue(null);

      await expect(svc.rotateRefresh('unknown')).rejects.toThrow(
        'Refresh token invalid or expired',
      );
    });

    it('throws when token is revoked', async () => {
      const { svc, prisma } = makeService();
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        userId: 'user-1',
        tokenHash: 'h',
        revokedAt: new Date(),
        expiresAt: new Date(Date.now() + 86_400_000),
        user: { id: 'user-1', email: 'a@b.com', isSuperAdmin: false },
      });

      await expect(svc.rotateRefresh('revoked')).rejects.toThrow(
        'Refresh token invalid or expired',
      );
    });

    it('throws when token is expired', async () => {
      const { svc, prisma } = makeService();
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        userId: 'user-1',
        tokenHash: 'h',
        revokedAt: null,
        expiresAt: new Date(Date.now() - 1000), // expired
        user: { id: 'user-1', email: 'a@b.com', isSuperAdmin: false },
      });

      await expect(svc.rotateRefresh('expired')).rejects.toThrow(
        'Refresh token invalid or expired',
      );
    });
  });

  // -------------------------------------------------------------------------
  // revokeAllForUser
  // -------------------------------------------------------------------------
  describe('revokeAllForUser', () => {
    it('calls updateMany with userId filter and revokedAt null', async () => {
      const { svc, prisma } = makeService();

      await svc.revokeAllForUser('user-1');

      expect(prisma.refreshToken.updateMany).toHaveBeenCalledTimes(1);
      const args = prisma.refreshToken.updateMany.mock.calls[0][0];
      expect(args.where).toEqual({ userId: 'user-1', revokedAt: null });
      expect(args.data.revokedAt).toBeInstanceOf(Date);
    });
  });

  // -------------------------------------------------------------------------
  // hash
  // -------------------------------------------------------------------------
  describe('hash', () => {
    it('returns consistent sha256 hex for same input', () => {
      const { svc } = makeService();
      const a = svc.hash('hello');
      const b = svc.hash('hello');
      expect(a).toBe(b);
      expect(a).toMatch(/^[0-9a-f]{64}$/);
    });

    it('returns different hashes for different inputs', () => {
      const { svc } = makeService();
      expect(svc.hash('hello')).not.toBe(svc.hash('world'));
    });
  });

  // -------------------------------------------------------------------------
  // generateToken
  // -------------------------------------------------------------------------
  describe('generateToken', () => {
    it('returns { raw, hash } where hash matches hash(raw)', () => {
      const { svc } = makeService();
      const token = svc.generateToken();

      expect(typeof token.raw).toBe('string');
      expect(typeof token.hash).toBe('string');
      expect(token.hash).toBe(svc.hash(token.raw));
    });

    it('generates different tokens each call', () => {
      const { svc } = makeService();
      const t1 = svc.generateToken();
      const t2 = svc.generateToken();
      expect(t1.raw).not.toBe(t2.raw);
    });
  });
});
