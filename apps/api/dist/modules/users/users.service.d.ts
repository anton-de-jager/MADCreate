import { PrismaService } from '../../prisma/prisma.service';
export declare class UsersService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    me(userId: string): Promise<{
        memberships: ({
            workspace: {
                name: string;
                id: string;
                slug: string;
                logoUrl: string | null;
            };
        } & {
            status: import("@prisma/client").$Enums.WorkspaceMemberStatus;
            role: import("@prisma/client").$Enums.Role;
            id: string;
            userId: string;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            invitedAt: Date;
            joinedAt: Date | null;
            workspaceId: string;
        })[];
        email: string;
        id: string;
        createdAt: Date;
        emailVerifiedAt: Date | null;
        firstName: string | null;
        lastName: string | null;
        avatarUrl: string | null;
        phone: string | null;
        locale: string;
        timezone: string;
        isSuperAdmin: boolean;
        lastLoginAt: Date | null;
        lastLoginIp: string | null;
        updatedAt: Date;
        deletedAt: Date | null;
    }>;
    updateProfile(userId: string, patch: {
        firstName?: string;
        lastName?: string;
        avatarUrl?: string;
        locale?: string;
        timezone?: string;
        phone?: string;
    }): Promise<{
        email: string;
        id: string;
        firstName: string | null;
        lastName: string | null;
        avatarUrl: string | null;
        phone: string | null;
        locale: string;
        timezone: string;
    }>;
    deleteAccount(userId: string): Promise<{
        deletedAt: Date;
    }>;
}
