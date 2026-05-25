import type { PrismaService } from '../prisma/prisma.service';
import type { TokenService } from '../modules/auth/token.service';
import type { MailService } from '../modules/mail/mail.service';
import type { TenantsService } from '../modules/tenants/tenants.service';
import type { WorkspacesService } from '../modules/workspaces/workspaces.service';
import type { ConfigService } from '@nestjs/config';
import type { Queue } from 'bullmq';
export type { PrismaService, TokenService, MailService, TenantsService, WorkspacesService, ConfigService, Queue };
export interface MockDelegate {
    [method: string]: jest.Mock;
}
export interface MockPrisma {
    $transaction: jest.Mock;
    $connect: jest.Mock;
    $disconnect: jest.Mock;
    $queryRaw: jest.Mock;
    user: MockDelegate;
    workspace: MockDelegate;
    workspaceMember: MockDelegate;
    plan: MockDelegate;
    emailVerification: MockDelegate;
    passwordReset: MockDelegate;
    refreshToken: MockDelegate;
    magicLink: MockDelegate;
    tenant: MockDelegate;
    site: MockDelegate;
    page: MockDelegate;
    section: MockDelegate;
    theme: MockDelegate;
    formSubmission: MockDelegate;
    lead: MockDelegate;
    subscription: MockDelegate;
    deployment: MockDelegate;
    analyticsEvent: MockDelegate;
    aIGeneration: MockDelegate;
    integrationCatalog: MockDelegate;
    tenantIntegration: MockDelegate;
    domain: MockDelegate;
    featureFlag: MockDelegate;
    template: MockDelegate;
    claudeTask: MockDelegate;
    claudePromptTemplate: MockDelegate;
    workspaceInvite: MockDelegate;
    aIPrompt: MockDelegate;
    layout: MockDelegate;
    media: MockDelegate;
}
export declare function createMockPrisma(): MockPrisma;
export interface MockConfig {
    get: jest.Mock;
    getOrThrow: jest.Mock;
}
export declare function createMockConfig(): MockConfig;
export interface MockTokenService {
    generateToken: jest.Mock;
    issueTokens: jest.Mock;
    rotateRefresh: jest.Mock;
    revokeAllForUser: jest.Mock;
    hash: jest.Mock;
}
export declare function createMockTokenService(): MockTokenService;
export interface MockMailService {
    sendVerificationEmail: jest.Mock;
    sendPasswordResetEmail: jest.Mock;
    sendMagicLink: jest.Mock;
    sendWorkspaceInvite: jest.Mock;
}
export declare function createMockMailService(): MockMailService;
export interface MockTenantsService {
    get: jest.Mock;
    list: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
    purge: jest.Mock;
    purgeAll: jest.Mock;
}
export declare function createMockTenantsService(): MockTenantsService;
export interface MockWorkspacesService {
    assertMember: jest.Mock;
    assertRole: jest.Mock;
}
export declare function createMockWorkspacesService(): MockWorkspacesService;
export interface MockQueue {
    add: jest.Mock;
    addBulk: jest.Mock;
    close: jest.Mock;
    getJob: jest.Mock;
    getJobs: jest.Mock;
    obliterate: jest.Mock;
    pause: jest.Mock;
    resume: jest.Mock;
}
export declare function createMockQueue(): MockQueue;
