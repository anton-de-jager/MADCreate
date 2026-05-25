import { UsersService } from './users.service';
import type { JwtPayload } from '@madcreate/shared';
declare class UpdateProfileDto {
    firstName?: string;
    lastName?: string;
    avatarUrl?: string;
    locale?: string;
    timezone?: string;
    phone?: string;
}
export declare class UsersController {
    private readonly users;
    constructor(users: UsersService);
    me(user: JwtPayload): Promise<{
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
    updateMe(user: JwtPayload, dto: UpdateProfileDto): Promise<{
        email: string;
        id: string;
        firstName: string | null;
        lastName: string | null;
        avatarUrl: string | null;
        phone: string | null;
        locale: string;
        timezone: string;
    }>;
    deleteMe(user: JwtPayload): Promise<{
        deletedAt: Date;
    }>;
}
export {};
