# MADCreate — Architecture Notes

These are the load-bearing decisions. Read this before making structural changes.

## 1. Multi-tenancy model

- **Logical isolation** via `tenantId` on every tenant-scoped row, with composite indexes `(tenantId, …)`. No schema-per-tenant or database-per-tenant — keeps ops simple and supports thousands of tenants per workspace.
- Tenant resolution at the API layer is in `TenantMiddleware`. Priority order:
  1. `X-Tenant-Id` header (preferred, dashboard sets it from `localStorage`)
  2. `X-Tenant-Slug` header
  3. `Host` header → matched against the `Domain` table for custom domains
- Workspace resolution is in the `AuthService.login` flow (stored in the JWT) and refreshed by the frontend via `X-Workspace-Id` header.

## 2. Data flow for a generated site

```
Onboarding wizard
     │ saves answers
     ▼
Tenant.onboarding JSON
     │
     ▼
Onboarding "Generate" button
     │ enqueues
     ▼
AIGeneration (kind=SITE) ──► BullMQ ──► AiService.run() ──► OpenAI/Mock
                                                                │
                                                                ▼
                                                      AIGeneration.output JSON
                                                                │
                                                                ▼
                                       (TODO: hydrator turns output into Site + Pages)
```

The hydration step (turning the model's JSON output into real `Site` and `Page` rows) is the next worthwhile piece of work. The AI output already conforms to `SiteSchema` from `@madcreate/shared`.

## 3. Render path

```
Browser GET /:slug                 (Angular Router)
   ▼
TenantRenderPage
   ▼
GET /v1/render/site?slug=…         (RenderController.site)
   ▼
RenderService.getSiteForSlug
   ▼
{ tenant, theme, navigation, pages[] }
   ▼
ThemeService.applyTokens (CSS vars)
   ▼
SiteRendererComponent (dispatches per-section components)
```

For custom domains: nginx sets `Host`, middleware resolves the tenant via `Domain.hostname`. The same render endpoint works because it falls back from `?slug=` to the `Host` header.

## 4. Auth shape

- Argon2id for password hashes (no parameter tuning yet — defaults are fine for now).
- Access tokens: short-lived JWT (15m default).
- Refresh tokens: long-lived opaque random bytes, only the sha256 hash stored in DB. Rotation on every use, with the old token marked `revokedAt`. This means a leaked refresh token has a single-use window.
- Email verification / password reset / magic links: same opaque-token-with-stored-hash pattern.

## 5. Adding a new section kind to the renderer

1. Add the kind to `SECTION_REGISTRY` in `packages/shared/src/constants/sections.ts`.
2. Create `apps/web/src/app/features/tenant-render/sections/<kind>.section.ts` as a standalone component taking an `@Input() props`.
3. Register it in `SiteRendererComponent`'s imports + `@switch`.
4. (Optional) Add a prompt template to seed for AI to generate this section type.

## 6. Adding a new deployment target

1. Add the enum value to Prisma `DeploymentTarget`.
2. Create an adapter in `apps/api/src/modules/deployments/adapters/<target>.adapter.ts` implementing `DeploymentAdapter`.
3. Register it in `DeploymentsModule.providers` and `DeploymentProcessor.pick()`.

## 7. Adding a new AI provider

1. Implement `AIProvider` interface in `apps/api/src/modules/ai/providers/<provider>.provider.ts`.
2. Register in `AiModule.providers`.
3. Update `AiService.getProvider()` to dispatch on the new name.

## 8. Frontend conventions

- **Standalone components only.** No NgModules anywhere.
- **Signals as state.** Services expose `readonly` signals; components use `computed()` for derived views.
- **OnPush everywhere.** Strict template type-checking is on.
- **No `any` in templates** — use proper typed `@Input()`s. Service payloads use shared types from `@madcreate/shared`.
- **Lazy routes via `loadComponent`.** Tree-shakes everything not on the current screen.
- **Tailwind for layout & spacing, semantic component classes for repeated styles** (`mc-card`, `mc-btn-primary`, etc.) so themes can swap.

## 9. Theming

- Tailwind colors map to CSS variables: `--brand`, `--surface`, `--fg`, etc.
- `ThemeService.applyTokens()` writes these variables on `document.documentElement` at runtime.
- Tenant theme tokens (in `Theme.tokens.colors`) override the platform defaults for the duration of a tenant render. `TenantRenderPage.ngOnDestroy` cleans up so leaving doesn't pollute the dashboard.

## 10. Worth knowing

- **Mock AI provider.** Activated when `OPENAI_API_KEY` is unset. Returns deterministic JSON shaped like the real output. Lets the whole platform be demoed for free.
- **Soft delete.** Almost every model has `deletedAt`. Use the `PrismaService.liveOnly()` helper or filter explicitly.
- **Audit shape.** `AuditLog` table exists; `AuditInterceptor` is a pass-through today — wire actual writes on mutations when needed.
