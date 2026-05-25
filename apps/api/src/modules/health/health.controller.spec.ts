import type Redis from 'ioredis';
import { HealthController } from './health.controller';
import { PrismaService } from '../../prisma/prisma.service';

// ---------------------------------------------------------------------------
// Mock interfaces
// ---------------------------------------------------------------------------

interface MockPrismaService {
  $queryRawUnsafe: jest.Mock;
}

interface MockRedis {
  ping: jest.Mock;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockPrisma(): MockPrismaService {
  return {
    $queryRawUnsafe: jest.fn(),
  };
}

function mockRedis(): MockRedis {
  return {
    ping: jest.fn(),
  };
}

function makeController() {
  const prisma = mockPrisma();
  const redis = mockRedis();
  const ctrl = new HealthController(
    prisma as unknown as PrismaService,
    redis as unknown as Redis,
  );
  return { ctrl, prisma, redis };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('HealthController', () => {
  // =========================================================================
  // alive
  // =========================================================================

  describe('alive', () => {
    it('returns status ok with service name and ISO time', () => {
      const { ctrl } = makeController();

      const result = ctrl.alive();

      expect(result).toEqual(
        expect.objectContaining({
          status: 'ok',
          service: 'madcreate-api',
        }),
      );
      expect(typeof result.time).toBe('string');
      // Verify it is a valid ISO date string
      expect(new Date(result.time).toISOString()).toBe(result.time);
    });
  });

  // =========================================================================
  // ready
  // =========================================================================

  describe('ready', () => {
    it('returns ready when both Prisma and Redis are healthy', async () => {
      const { ctrl, prisma, redis } = makeController();
      prisma.$queryRawUnsafe.mockResolvedValue([{ '?column?': 1 }]);
      redis.ping.mockResolvedValue('PONG');

      const result = await ctrl.ready();

      expect(prisma.$queryRawUnsafe).toHaveBeenCalledWith('SELECT 1');
      expect(redis.ping).toHaveBeenCalled();
      expect(result).toEqual({
        status: 'ready',
        checks: { db: 'ok', redis: 'ok' },
      });
    });

    it('returns degraded when Prisma is down', async () => {
      const { ctrl, prisma, redis } = makeController();
      prisma.$queryRawUnsafe.mockRejectedValue(new Error('Connection refused'));
      redis.ping.mockResolvedValue('PONG');

      const result = await ctrl.ready();

      expect(result).toEqual({
        status: 'degraded',
        checks: { db: 'Connection refused', redis: 'ok' },
      });
    });

    it('returns degraded when Redis is down', async () => {
      const { ctrl, prisma, redis } = makeController();
      prisma.$queryRawUnsafe.mockResolvedValue([{ '?column?': 1 }]);
      redis.ping.mockRejectedValue(new Error('ECONNREFUSED'));

      const result = await ctrl.ready();

      expect(result).toEqual({
        status: 'degraded',
        checks: { db: 'ok', redis: 'ECONNREFUSED' },
      });
    });

    it('returns degraded when both Prisma and Redis are down', async () => {
      const { ctrl, prisma, redis } = makeController();
      prisma.$queryRawUnsafe.mockRejectedValue(new Error('DB down'));
      redis.ping.mockRejectedValue(new Error('Redis down'));

      const result = await ctrl.ready();

      expect(result).toEqual({
        status: 'degraded',
        checks: { db: 'DB down', redis: 'Redis down' },
      });
    });
  });
});
