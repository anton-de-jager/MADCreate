import type { Request } from 'express';
import { AuthService } from './auth.service';
import { ChangePasswordDto, LoginDto, MagicLinkConsumeDto, MagicLinkRequestDto, RefreshDto, RegisterDto, RequestPasswordResetDto, ResetPasswordDto, VerifyEmailDto } from './dto/auth.dto';
import type { JwtPayload } from '@madcreate/shared';
export declare class AuthController {
    private readonly auth;
    constructor(auth: AuthService);
    register(dto: RegisterDto, req: Request): Promise<{
        user: {
            id: string;
            email: string;
            firstName: string | null;
            lastName: string | null;
            avatarUrl: string | null;
            isSuperAdmin: boolean;
            emailVerified: boolean;
        };
        tokens: {
            accessToken: string;
            refreshToken: string;
            expiresIn: number;
            tokenType: "Bearer";
        };
        workspace: {
            id: string;
            slug: string;
            name: string;
        };
    }>;
    login(dto: LoginDto, req: Request): Promise<{
        user: {
            id: string;
            email: string;
            firstName: string | null;
            lastName: string | null;
            avatarUrl: string | null;
            isSuperAdmin: boolean;
            emailVerified: boolean;
        };
        tokens: {
            accessToken: string;
            refreshToken: string;
            expiresIn: number;
            tokenType: "Bearer";
        };
        memberships: {
            workspaceId: string;
            workspaceName: string;
            workspaceSlug: string;
            role: import("@prisma/client").$Enums.Role;
        }[];
        currentWorkspaceId: string | undefined;
    }>;
    refresh(dto: RefreshDto, req: Request): Promise<{
        tokens: {
            accessToken: string;
            refreshToken: string;
            expiresIn: number;
            tokenType: "Bearer";
        };
    }>;
    logout(user: JwtPayload): Promise<void>;
    requestPasswordReset(dto: RequestPasswordResetDto): Promise<{
        accepted: boolean;
    }>;
    resetPassword(dto: ResetPasswordDto): Promise<{
        reset: boolean;
    }>;
    verifyEmail(dto: VerifyEmailDto): Promise<{
        verified: boolean;
    }>;
    changePassword(user: JwtPayload, dto: ChangePasswordDto): Promise<{
        changed: boolean;
    }>;
    requestMagicLink(dto: MagicLinkRequestDto): Promise<{
        accepted: boolean;
    }>;
    consumeMagicLink(dto: MagicLinkConsumeDto, req: Request): Promise<{
        user: {
            id: string;
            email: string;
            firstName: string | null;
            lastName: string | null;
            avatarUrl: string | null;
            isSuperAdmin: boolean;
            emailVerified: boolean;
        };
        tokens: {
            accessToken: string;
            refreshToken: string;
            expiresIn: number;
            tokenType: "Bearer";
        };
        memberships: {
            workspaceId: string;
            workspaceName: string;
            workspaceSlug: string;
            role: import("@prisma/client").$Enums.Role;
        }[];
        currentWorkspaceId: string | undefined;
        redirect: string | null;
    }>;
}
