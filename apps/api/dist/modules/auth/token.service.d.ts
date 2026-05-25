import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import type { Role } from '@madcreate/shared';
export declare class TokenService {
    private readonly jwt;
    private readonly config;
    private readonly prisma;
    constructor(jwt: JwtService, config: ConfigService, prisma: PrismaService);
    issueTokens(userId: string, email: string, opts?: {
        workspaceId?: string;
        role?: Role;
        superAdmin?: boolean;
        userAgent?: string;
        ip?: string;
    }): Promise<{
        accessToken: string;
        refreshToken: string;
        expiresIn: number;
        tokenType: "Bearer";
    }>;
    rotateRefresh(rawRefresh: string, userAgent?: string, ip?: string): Promise<{
        accessToken: string;
        refreshToken: string;
        expiresIn: number;
        tokenType: "Bearer";
    }>;
    revokeAllForUser(userId: string): Promise<void>;
    hash(raw: string): string;
    generateToken(bytes?: number): {
        raw: string;
        hash: string;
    };
}
