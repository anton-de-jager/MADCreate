import { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
export interface MailMessage {
    to: string;
    subject: string;
    html: string;
    text?: string;
}
export declare class MailService implements OnModuleInit {
    private readonly config;
    private readonly logger;
    private transporter?;
    private fromAddress;
    constructor(config: ConfigService);
    onModuleInit(): void;
    send(msg: MailMessage): Promise<void>;
    sendVerificationEmail(to: string, token: string, appUrl: string): Promise<void>;
    sendPasswordResetEmail(to: string, token: string, appUrl: string): Promise<void>;
    sendMagicLink(to: string, token: string, appUrl: string, redirect?: string): Promise<void>;
    sendWorkspaceInvite(to: string, inviterName: string, workspaceName: string, token: string, appUrl: string): Promise<void>;
}
