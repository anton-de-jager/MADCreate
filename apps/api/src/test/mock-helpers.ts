/**
 * Shared typed mock factories for service specs.
 *
 * Each factory returns a plain-object mock whose methods are jest.Mock so
 * `.mockResolvedValue()` / `.mock.calls` work without `as any`.
 *
 * Spec files pass these mocks to service constructors via a single
 * `as unknown as <ServiceType>` cast in each `makeService()` helper,
 * which is strictly safer than `as any` - it still requires the cast
 * target to be a real type so constructor-signature drift is caught.
 *
 * Why not `as any`?
 *   • `as any` silently swallows every type error.
 *   • `as unknown as T` requires the caller to name the correct target type,
 *     so adding/removing a constructor param surfaces immediately.
 */

import type { PrismaService } from '../prisma/prisma.service';
import type { TokenService } from '../modules/auth/token.service';
import type { MailService } from '../modules/mail/mail.service';
import type { TenantsService } from '../modules/tenants/tenants.service';
import type { WorkspacesService } from '../modules/workspaces/workspaces.service';
import type { ConfigService } from '@nestjs/config';
import type { Queue } from 'bullmq';

// Re-export the service types so spec files can import them from one place.
export type { PrismaService, TokenService, MailService, TenantsService, WorkspacesService, ConfigService, Queue };

// ---------------------------------------------------------------------------
// PrismaService - Proxy-backed: any model.method auto-creates a jest.fn()
// ---------------------------------------------------------------------------

/** A Prisma model delegate where every method is a jest.Mock. */
export interface MockDelegate {
  [method: string]: jest.Mock;
}

/**
 * The mock Prisma shape that spec files use for assertions.
 * Model delegates are auto-created by the Proxy at runtime; explicit
 * properties listed here give TypeScript visibility for the most-used
 * models. Accessing any unlisted model still works at runtime via Proxy.
 */
export interface MockPrisma {
  $transaction: jest.Mock;
  $connect: jest.Mock;
  $disconnect: jest.Mock;
  $queryRaw: jest.Mock;
  // Models used across specs:
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

export function createMockPrisma(): MockPrisma {
  const store: Record<string, unknown> = {};

  return new Proxy(store, {
    get(_target, prop) {
      if (typeof prop === 'symbol') return undefined;
      const key = prop as string;
      if (!(key in store)) {
        if (key.startsWith('$') || key === 'then') {
          store[key] = jest.fn();
        } else {
          const ds: Record<string, jest.Mock> = {};
          store[key] = new Proxy(ds, {
            get(dt, method) {
              if (typeof method === 'symbol') return undefined;
              const m = method as string;
              if (!(m in dt)) dt[m] = jest.fn();
              return dt[m];
            },
          });
        }
      }
      return store[key];
    },
  }) as unknown as MockPrisma;
}

// ---------------------------------------------------------------------------
// ConfigService
// ---------------------------------------------------------------------------

export interface MockConfig {
  get: jest.Mock;
  getOrThrow: jest.Mock;
}

export function createMockConfig(): MockConfig {
  return { get: jest.fn(), getOrThrow: jest.fn() };
}

// ---------------------------------------------------------------------------
// TokenService
// ---------------------------------------------------------------------------

export interface MockTokenService {
  generateToken: jest.Mock;
  issueTokens: jest.Mock;
  rotateRefresh: jest.Mock;
  revokeAllForUser: jest.Mock;
  hash: jest.Mock;
}

export function createMockTokenService(): MockTokenService {
  return {
    generateToken: jest.fn(),
    issueTokens: jest.fn(),
    rotateRefresh: jest.fn(),
    revokeAllForUser: jest.fn(),
    hash: jest.fn(),
  };
}

// ---------------------------------------------------------------------------
// MailService
// ---------------------------------------------------------------------------

export interface MockMailService {
  sendVerificationEmail: jest.Mock;
  sendPasswordResetEmail: jest.Mock;
  sendMagicLink: jest.Mock;
  sendWorkspaceInvite: jest.Mock;
}

export function createMockMailService(): MockMailService {
  return {
    sendVerificationEmail: jest.fn(),
    sendPasswordResetEmail: jest.fn(),
    sendMagicLink: jest.fn(),
    sendWorkspaceInvite: jest.fn(),
  };
}

// ---------------------------------------------------------------------------
// TenantsService
// ---------------------------------------------------------------------------

export interface MockTenantsService {
  get: jest.Mock;
  list: jest.Mock;
  create: jest.Mock;
  update: jest.Mock;
  remove: jest.Mock;
  purge: jest.Mock;
  purgeAll: jest.Mock;
}

export function createMockTenantsService(): MockTenantsService {
  return {
    get: jest.fn(),
    list: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    purge: jest.fn(),
    purgeAll: jest.fn(),
  };
}

// ---------------------------------------------------------------------------
// WorkspacesService
// ---------------------------------------------------------------------------

export interface MockWorkspacesService {
  assertMember: jest.Mock;
  assertRole: jest.Mock;
}

export function createMockWorkspacesService(): MockWorkspacesService {
  return {
    assertMember: jest.fn(),
    assertRole: jest.fn(),
  };
}

// ---------------------------------------------------------------------------
// BullMQ Queue
// ---------------------------------------------------------------------------

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

export function createMockQueue(): MockQueue {
  return {
    add: jest.fn(),
    addBulk: jest.fn(),
    close: jest.fn(),
    getJob: jest.fn(),
    getJobs: jest.fn(),
    obliterate: jest.fn(),
    pause: jest.fn(),
    resume: jest.fn(),
  };
}
