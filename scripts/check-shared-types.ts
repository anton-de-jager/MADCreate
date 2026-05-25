/**
 * Compile-time assertion that @madcreate/shared enum types stay aligned with
 * the Prisma-generated enums.  Run with `npx tsx scripts/check-shared-types.ts`
 * (or in CI via `npm run check:shared-types`).
 *
 * If Prisma gains a new enum value that @madcreate/shared doesn't have (or vice
 * versa), this file will fail to compile — which is exactly what we want.
 */

import type {
  Role as PrismaRole,
  AIProvider as PrismaAIProvider,
  AIGenerationKind as PrismaAIGenerationKind,
  AIGenerationStatus as PrismaAIGenerationStatus,
  DeploymentTarget as PrismaDeploymentTarget,
  DeploymentStatus as PrismaDeploymentStatus,
} from '@prisma/client';

import type {
  Role as SharedRole,
  AIGenerationKind as SharedAIGenerationKind,
  AIGenerationStatus as SharedAIGenerationStatus,
  DeploymentTarget as SharedDeploymentTarget,
  DeploymentStatus as SharedDeploymentStatus,
} from '@madcreate/shared';

// AIProvider in shared includes lowercase aliases — only assert the uppercase subset.
type SharedAIProviderUpper = 'OPENAI' | 'ANTHROPIC' | 'GOOGLE' | 'CUSTOM' | 'CLAUDE_CODE_MANUAL' | 'MOCK';

// Bidirectional assignability checks: if either direction fails, the types have
// diverged.  The "_assert" variables are never used at runtime — they exist
// purely for the TypeScript compiler.

type AssertEqual<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

type _R1 = AssertEqual<PrismaRole, SharedRole> extends true ? true : 'Role mismatch between Prisma and shared';
const _r1: _R1 = true;

type _R2 = AssertEqual<PrismaAIProvider, SharedAIProviderUpper> extends true ? true : 'AIProvider mismatch between Prisma and shared';
const _r2: _R2 = true;

type _R3 = AssertEqual<PrismaAIGenerationKind, SharedAIGenerationKind> extends true ? true : 'AIGenerationKind mismatch between Prisma and shared';
const _r3: _R3 = true;

type _R4 = AssertEqual<PrismaAIGenerationStatus, SharedAIGenerationStatus> extends true ? true : 'AIGenerationStatus mismatch between Prisma and shared';
const _r4: _R4 = true;

type _R5 = AssertEqual<PrismaDeploymentTarget, SharedDeploymentTarget> extends true ? true : 'DeploymentTarget mismatch between Prisma and shared';
const _r5: _R5 = true;

type _R6 = AssertEqual<PrismaDeploymentStatus, SharedDeploymentStatus> extends true ? true : 'DeploymentStatus mismatch between Prisma and shared';
const _r6: _R6 = true;

console.log('All shared ↔ Prisma type assertions passed.');
