# MADCreate

> **AI-native website & app generation platform** — built by MAD Prospects.
> Generate, edit, host and ship production-grade SME websites and business systems.

```
madcreate.madprospects.com     -> frontend + dynamic site rendering
madcreateapi.madprospects.com  -> API
mssql.madcreate.madleads.ai      -> MSSQL
```

---

## Architecture

```
madcreate/
├── apps/
│   ├── api/         .NET Core 11 backend (REST + BullMQ workers)
│   └── web/         Angular 19 frontend (standalone, signals, Tailwind, Material)
├── packages/
│   └── shared/      Cross-app TypeScript types & DTOs
├── database/       Entity Framework Core schema, seed, SQL init assets
├── deploy/         Deploy scripts, Dockerfiles, nginx/Apache config
│   └── docker-compose.yml
├── .env.example
└── tsconfig.base.json
```

### The full stack

| Layer        | Choice                                                  |
| ------------ | ------------------------------------------------------- |
| Frontend     | Angular 22 (standalone, signals), Tailwind 3, Angular Material |
| Backend      | .NET Core 11, Entity Framework Core 5, MSSQL 8, Redis 7, BullMQ           |
| AI           | OpenAI (with mock fallback), provider-pluggable         |
| Auth         | JWT + refresh tokens (argon2 hashes)                    |
| Queues       | BullMQ (AI gen, deployments, email, domain verification) |
| Storage      | Local disk (S3 wired but not yet implemented)           |
| Hosting      | Docker Compose (mssql, redis, api, web, nginx)          |
| Reverse proxy | nginx with wildcard catch-all for tenant custom domains |
| Observability | pino structured logs                                    |

---

## Getting started

### Prerequisites

- Node.js ≥ 20.11
- Docker + Docker Compose
- pnpm 11 (store in `C:/Code/.pnpm`)

### Quick start (local dev)

```bash
# 1. Copy env
cp .env.example .env

# 2. Bring up MSSQL + Redis
pnpm run docker:up -- mssql redis

# 3. Install workspaces
pnpm install

# 4. Generate Entity Framework Core client, migrate, seed
pnpm run Entity Framework Core:generate
pnpm run Entity Framework Core:migrate
pnpm run Entity Framework Core:seed

# 5. Start both apps (api on :4213, web on :3013)
pnpm run dev
```

Open:
- **App**: <http://localhost:3013>
- **API**: <http://localhost:4213/v1>
- **Swagger**: <http://localhost:4213/docs>
- **Default super admin**: `admin@madcreate.local` / `ChangeMeNow!23` — change immediately

### Full Docker stack

```bash
pnpm run docker:up
```

Brings up mssql, redis, api, web and an nginx ingress in front of everything.

---

## Environment

All variables documented in [`.env.example`](.env.example). Key ones:

| Var                    | What it controls                                        |
| ---------------------- | ------------------------------------------------------- |
| `DATABASE_URL`         | MSSQL connection                                        |
| `REDIS_URL`            | Redis connection (queues + caching)                     |
| `JWT_SECRET` / `JWT_REFRESH_SECRET` | Token signing                              |
| `OPENAI_API_KEY`       | If unset, the mock AI provider is used                  |
| `APP_PUBLIC_DOMAIN`    | The domain serving tenant sites at /:slug               |
| `API_PUBLIC_DOMAIN`    | The API domain                                          |
| `FEATURE_*`            | Feature flags (ai, builder, custom domains, billing)    |

---

## Multi-tenant model

```
User ── member of ──> Workspace ── owns many ──> Tenant ── has many ──> Site → Page → Section
                                                    │
                                                    ├── Theme
                                                    ├── Domain  (subdomain | apex | cname | wildcard)
                                                    ├── Deployment
                                                    ├── Integration
                                                    └── Media / Analytics / AI Generations
```

- **Workspace** is a customer account (one billing entity).
- **Tenant** is a deployable site/app — one workspace can own many.
- All tenant-scoped models carry `tenantId` for fast isolation.
- The frontend stores the current workspace in `localStorage` and adds `X-Workspace-Id` on every request.
- The backend's `TenantMiddleware` resolves a tenant from `X-Tenant-Id`, `X-Tenant-Slug`, or the request `Host` header (for custom domains).

---

## How a tenant site is rendered

1. A request hits `madcreate.madprospects.com/acme` (or a custom domain that CNAMEs to it).
2. nginx forwards to the Angular SPA. The router matches `/:slug` and loads `TenantRenderPage`.
3. The page calls `GET /v1/render/site?slug=acme` (or `?` no-slug, where the backend reads the `Host` header).
4. The API returns: tenant info, active theme tokens, navigation, settings and all published pages.
5. The renderer applies theme tokens to CSS variables at runtime and feeds the page schema into `SiteRendererComponent`, which dispatches to per-kind section components (`hero`, `features`, `pricing`, …).

`/render/:slug/robots.txt` and `/render/:slug/sitemap.xml` are also generated dynamically.

---

## Custom domains

1. User adds `www.client.com` in the Domains page.
2. The API issues a verify token and shows DNS instructions (CNAME + TXT records).
3. User points DNS at `madcreate.madprospects.com` and adds the TXT record.
4. User clicks **Verify** — the API does a DNS lookup; on match, the domain becomes `ACTIVE`.
5. nginx's wildcard server block forwards any unmatched Host to the web app, which the API resolves via the `Domain` table.

---

## AI generation

- **Prompt registry**: `AIPrompt` table holds versioned, named system/user templates (`generate.site`, `generate.page`, `generate.palette`, …) seeded on first run.
- **Providers**: `OpenAIProvider` is real (uses `gpt-4o` / `gpt-4o-mini` by default), `MockProvider` returns deterministic JSON when no API key is set, so you can demo end-to-end without OpenAI.
- **Workflow**:
  1. Client calls `POST /v1/ai/generate?tenantId=…` with a kind + variables.
  2. API creates an `AIGeneration` row, enqueues a BullMQ job, returns the id.
  3. Worker calls the provider, parses JSON output, persists tokens/cost/duration.
  4. Client polls `/v1/ai/generations` or `/v1/ai/generations/:id`.

The Studio page (`/app/studio/:tenantId`) drives this end to end.

---

## Deployments

`DeploymentsService` enqueues, the `DeploymentProcessor` picks an adapter based on target:

| Target              | Adapter            | Status                                    |
| ------------------- | ------------------ | ----------------------------------------- |
| `INTERNAL`          | `InternalAdapter`        | ✅ Real — bumps site version, publishes   |
| `STATIC_EXPORT`     | `StaticExportAdapter`    | ✅ Real — writes HTML to `./storage/exports` |
| `CUSTOM_WEBHOOK`    | `WebhookAdapter`         | ✅ Real — POSTs to configured URL         |
| `FTP`               | `FtpAdapter`             | ✅ Real — `basic-ftp` push                |
| `SFTP`              | `SftpAdapter`            | ✅ Real — `ssh2-sftp-client` push         |
| `CLOUDFLARE_PAGES`  | `CloudflarePagesAdapter` | ✅ Real — Cloudflare v4 direct upload     |
| `VERCEL`            | `VercelAdapter`          | ✅ Real — Vercel v13 deployments API      |
| `DIGITAL_OCEAN`     | `DigitalOceanAdapter`    | ✅ Real — DO App Platform deployment      |
| `DOCKER`            | `DockerAdapter`          | ✅ Real — `docker build && push` via CLI  |

---

## What's deep vs. what's stubbed (be honest)

**Deep / production-grade (everything):**
- Entity Framework Core schema (28 models, indexes, soft deletes, audit shape, multi-tenant tenantId on everything)
- Auth (register, login, refresh rotation, password reset, email verification, magic links)
- Tenant + workspace + RBAC model
- AI generation pipeline (provider abstraction, queued jobs, prompt registry, token/cost tracking, mock fallback)
- Render engine (hostname & slug-based, theme token injection, SEO/sitemap/robots)
- Domain verification flow (DNS TXT check) + **Cloudflare auto-CNAME/TXT + Universal SSL** when CF token configured
- Deployment processor + **9 real adapters** (internal, static-export, ftp, sftp, webhook, cloudflare-pages, vercel, digitalocean, docker)
- **Payfast billing**: onsite checkout UUID creation + notification handler for subscriptions
- **SMTP email** via nodemailer (verify / reset / magic-link / workspace invite), graceful no-op when SMTP not set
- **S3 storage driver** (`@aws-sdk/client-s3`) alongside local disk — switches via `STORAGE_DRIVER`
- **Template instantiation**: clone a template's full site schema into a new Site + Pages for a tenant
- Frontend design system (Tailwind tokens, premium dark/light, glassmorphism, motion)
- Onboarding wizard, AI Studio, Visual Builder, all CRUD pages

**Still wisely stubbed:**
- Angular SSR — the renderer is server-fetched JSON but client-rendered. SEO works (sitemap/robots are generated server-side, meta tags injected client-side). Full SSR is a one-day add via `@angular/ssr`; not done because it materially changes the build/serve loop and offers diminishing returns vs. CDN caching for tenant sites.
- Most third-party integrations in the catalog are registry entries; Payfast is the single real payment provider.

These systems each have a real seat at the table.

---

## Scripts

```bash
# Workspace
pnpm run dev            # api + web in parallel
pnpm run build          # build everything
pnpm run lint           # lint api + web
pnpm run test           # test api + web
pnpm run format         # prettier write

# Entity Framework Core
pnpm run Entity Framework Core:generate
pnpm run Entity Framework Core:migrate
pnpm run Entity Framework Core:deploy
pnpm run Entity Framework Core:studio
pnpm run Entity Framework Core:seed

# Docker
pnpm run docker:up
pnpm run docker:down
pnpm run docker:logs
pnpm run docker:build
```

---

## Project structure (apps/api)

```
apps/api/src/
├── main.ts
├── app.module.ts
├── config/configuration.ts
├── database/Entity Framework Core/
├── redis/
├── queue/                BullMQ wiring
├── common/               guards, decorators, middleware, filters, interceptors
└── modules/
    ├── auth/             register, login, refresh, password reset, email verify
    ├── users/
    ├── workspaces/       memberships, invites
    ├── tenants/
    ├── sites/
    ├── pages/
    ├── themes/
    ├── layouts/
    ├── templates/
    ├── integrations/     catalog + per-tenant install
    ├── deployments/      adapters: internal, static-export, ftp, webhook
    ├── domains/          DNS TXT verify, hostname resolution
    ├── ai/               providers: openai, mock; prompt registry; queued gen
    ├── media/            local uploads (S3 stubbed)
    ├── analytics/        ingest + summary + timeline
    ├── render/           tenant site rendering (JSON + robots/sitemap)
    ├── admin/            super-admin overview
    ├── health/           liveness + readiness
    ├── billing/          plans + Payfast subscription handoff
    └── onboarding/       wizard answers + AI generate-from-answers
```

## Project structure (apps/web)

```
apps/web/src/app/
├── app.component.ts
├── app.config.ts             providers + router
├── app.routes.ts             top-level routes (marketing / auth / app / tenant render)
├── core/
│   ├── services/             auth, theme, api, tenant-context
│   ├── interceptors/         auth, workspace, error
│   └── guards/               auth, super-admin
├── layouts/dashboard/        sidebar + topbar shell
└── features/
    ├── marketing/            landing, pricing, header, footer
    ├── auth/                 login, register
    ├── dashboard/home/
    ├── onboarding/           5-step wizard
    ├── tenants/              list + detail
    ├── sites/                list + detail
    ├── studio/               AI Studio (generate + history)
    ├── builder/              live visual builder (drag/edit/preview)
    ├── themes/               theme tokens
    ├── domains/              add + verify + DNS instructions
    ├── integrations/         catalog + install
    ├── deployments/          trigger + history
    ├── analytics/
    ├── media/
    ├── marketplace/          templates
    ├── settings/
    ├── admin/                super-admin overview
    └── tenant-render/        public dynamic site renderer + section components
```

---

## License

Proprietary — © MAD Prospects
