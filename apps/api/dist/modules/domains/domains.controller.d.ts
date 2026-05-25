import { DomainType } from '@prisma/client';
import { DomainsService } from './domains.service';
import type { JwtPayload } from '@madcreate/shared';
declare class AddDomainDto {
    hostname: string;
    type: DomainType;
}
export declare class DomainsController {
    private readonly domains;
    constructor(domains: DomainsService);
    list(user: JwtPayload, tenantId: string): Promise<{
        status: import("@prisma/client").$Enums.DomainStatus;
        type: import("@prisma/client").$Enums.DomainType;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        tenantId: string;
        lastError: string | null;
        hostname: string;
        isPrimary: boolean;
        verifyToken: string | null;
        lastCheckedAt: Date | null;
        sslStatus: string | null;
        sslIssuedAt: Date | null;
        sslExpiresAt: Date | null;
        cloudflareId: string | null;
    }[]>;
    add(user: JwtPayload, tenantId: string, dto: AddDomainDto): Promise<{
        status: import("@prisma/client").$Enums.DomainStatus;
        type: import("@prisma/client").$Enums.DomainType;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        tenantId: string;
        lastError: string | null;
        hostname: string;
        isPrimary: boolean;
        verifyToken: string | null;
        lastCheckedAt: Date | null;
        sslStatus: string | null;
        sslIssuedAt: Date | null;
        sslExpiresAt: Date | null;
        cloudflareId: string | null;
    }>;
    instructions(user: JwtPayload, id: string): Promise<import("@madcreate/shared").DomainVerificationInstructions>;
    verify(user: JwtPayload, id: string): Promise<{
        status: import("@prisma/client").$Enums.DomainStatus;
        type: import("@prisma/client").$Enums.DomainType;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        tenantId: string;
        lastError: string | null;
        hostname: string;
        isPrimary: boolean;
        verifyToken: string | null;
        lastCheckedAt: Date | null;
        sslStatus: string | null;
        sslIssuedAt: Date | null;
        sslExpiresAt: Date | null;
        cloudflareId: string | null;
    }>;
    remove(user: JwtPayload, id: string): Promise<{
        status: import("@prisma/client").$Enums.DomainStatus;
        type: import("@prisma/client").$Enums.DomainType;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        tenantId: string;
        lastError: string | null;
        hostname: string;
        isPrimary: boolean;
        verifyToken: string | null;
        lastCheckedAt: Date | null;
        sslStatus: string | null;
        sslIssuedAt: Date | null;
        sslExpiresAt: Date | null;
        cloudflareId: string | null;
    }>;
}
export {};
