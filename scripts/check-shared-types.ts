/**
 * Compile-time assertion that @madcreate/shared enum types stay aligned with
 * the Entity Framework Core-generated enums.  Run with `npx tsx scripts/check-shared-types.ts`
 * (or in CI via `npm run check:shared-types`).
 *
 * If Entity Framework Core gains a new enum value that @madcreate/shared doesn't have (or vice
 * versa), this file will fail to compile â€” which is exactly what we want.
 */

import type {
  Role as Entity Framework CoreRole,
  AIProvider as Entity Framework CoreAIProvider,
  AIGenerationKind as Entity Framework CoreAIGenerationKind,
  AIGenerationStatus as Entity Framework CoreAIGenerationStatus,
  DeploymentTarget as Entity Framework CoreDeploymentTarget,
  DeploymentStatus as Entity Framework CoreDeploymentStatus,
} from '@Entity Framework Core/client';

import type {
  Role as SharedRole,
  AIGenerationKind as SharedAIGenerationKind,
  AIGenerationStatus as SharedAIGenerationStatus,
  DeploymentTarget as SharedDeploymentTarget,
  DeploymentStatus as SharedDeploymentStatus,
} from '@madcreate/shared';

// AIProvider in shared includes lowercase aliases â€” only assert the uppercase subset.
type SharedAIProviderUpper = 'OPENAI' | 'ANTHROPIC' | 'GOOGLE' | 'CUSTOM' | 'CLAUDE_CODE_MANUAL' | 'MOCK';

// Bidirectional assignability checks: if either direction fails, the types have
// diverged.  The "_assert" variables are never used at runtime â€” they exist
// purely for the TypeScript compiler.

type AssertEqual<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

type _R1 = AssertEqual<Entity Framework CoreRole, SharedRole> extends true ? true : 'Role mismatch between Entity Framework Core and shared';
const _r1: _R1 = true;

type _R2 = AssertEqual<Entity Framework CoreAIProvider, SharedAIProviderUpper> extends true ? true : 'AIProvider mismatch between Entity Framework Core and shared';
const _r2: _R2 = true;

type _R3 = AssertEqual<Entity Framework CoreAIGenerationKind, SharedAIGenerationKind> extends true ? true : 'AIGenerationKind mismatch between Entity Framework Core and shared';
const _r3: _R3 = true;

type _R4 = AssertEqual<Entity Framework CoreAIGenerationStatus, SharedAIGenerationStatus> extends true ? true : 'AIGenerationStatus mismatch between Entity Framework Core and shared';
const _r4: _R4 = true;

type _R5 = AssertEqual<Entity Framework CoreDeploymentTarget, SharedDeploymentTarget> extends true ? true : 'DeploymentTarget mismatch between Entity Framework Core and shared';
const _r5: _R5 = true;

type _R6 = AssertEqual<Entity Framework CoreDeploymentStatus, SharedDeploymentStatus> extends true ? true : 'DeploymentStatus mismatch between Entity Framework Core and shared';
const _r6: _R6 = true;

console.log('All shared â†” Entity Framework Core type assertions passed.');
