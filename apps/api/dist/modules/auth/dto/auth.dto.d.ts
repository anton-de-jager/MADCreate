export declare class RegisterDto {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    workspaceName?: string;
}
export declare class LoginDto {
    email: string;
    password: string;
}
export declare class RefreshDto {
    refreshToken: string;
}
export declare class RequestPasswordResetDto {
    email: string;
}
export declare class ResetPasswordDto {
    token: string;
    password: string;
}
export declare class VerifyEmailDto {
    token: string;
}
export declare class MagicLinkRequestDto {
    email: string;
    redirect?: string;
}
export declare class MagicLinkConsumeDto {
    token: string;
}
export declare class ChangePasswordDto {
    currentPassword: string;
    newPassword: string;
}
