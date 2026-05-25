import type Redis from 'ioredis';
import { PrismaService } from '../../prisma/prisma.service';
export declare class HealthController {
    private readonly prisma;
    private readonly redis;
    constructor(prisma: PrismaService, redis: Redis);
    alive(): {
        status: string;
        service: string;
        time: string;
    };
    ready(): Promise<{
        status: string;
        checks: Record<string, string>;
    }>;
}
