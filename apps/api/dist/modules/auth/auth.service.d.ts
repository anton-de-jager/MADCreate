import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { TokenService } from './token.service';
import { MailService } from '../mail/mail.service';
import type { RegisterDto, LoginDto, ResetPasswordDto, ChangePasswordDto, MagicLinkRequestDto } from './dto/auth.dto';
export declare class AuthService {
    private readonly prisma;
    private readonly tokens;
    private readonly config;
    private readonly mail;
    private readonly logger;
    constructor(prisma: PrismaService, tokens: TokenService, config: ConfigService, mail: MailService);
    register(dto: RegisterDto, meta?: {
        userAgent?: string;
        ip?: string;
    }): Promise<{
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
    login(dto: LoginDto, meta?: {
        userAgent?: string;
        ip?: string;
    }): Promise<{
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
    refresh(refreshToken: string, meta?: {
        userAgent?: string;
        ip?: string;
    }): Promise<{
        tokens: {
            accessToken: string;
            refreshToken: string;
            expiresIn: number;
            tokenType: "Bearer";
        };
    }>;
    logout(userId: string): Promise<void>;
    requestPasswordReset(email: string): Promise<void>;
    resetPassword(dto: ResetPasswordDto): Promise<void>;
    changePassword(userId: string, dto: ChangePasswordDto): Promise<void>;
    verifyEmail(token: string): Promise<void>;
    requestMagicLink(dto: MagicLinkRequestDto): Promise<void>;
    consumeMagicLink(token: string, meta?: {
        userAgent?: string;
        ip?: string;
    }): Promise<{
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
    private uniqueWorkspaceSlug;
    private publicUser;
}
