# MADCreate — Claude project notes

AI-native website & business-system generator. **NestJS API + Angular SPA, MySQL (Prisma ORM), DreamHost CloudCompute (PM2 + Apache reverse-proxy).**

This is NOT the .NET + MSSQL + 1-grid Plesk stack the other MAD apps use.

## Canonical infrastructure values

| Thing            | Value                                            |
|------------------|--------------------------------------------------|
| API URL          | `https://madcreateapi.madprospects.com`         |
| FE URL           | `https://madcreate.madprospects.com`            |
| DB host          | `mysql.madcreate.madleads.ai:3306` (MySQL 8)     |
| DB name          | `madcreate`                                      |
| No Hangfire DB   | No Hangfire — this is Node.js                    |
| API port (PM2)   | 3005 (proxied via Apache mod_proxy on DreamHost) |

> **DNS note:** Deploy SFTP targets DreamHost (see `.env.deploy`). Ensure DNS A-records
> for `madcreate.madprospects.com` and `madcreateapi.madprospects.com` point to
> the same DreamHost CloudCompute IPv4 as the `madleads.ai` entries.

## Layout

| Path                                      | Purpose                                  |
|-------------------------------------------|------------------------------------------|
| `apps/api/src/`                           | NestJS API source                        |
| `apps/api/src/config/configuration.ts`   | Config factory (reads env vars)          |
| `apps/web/src/environments/`             | Angular env files (apiBaseUrl here)      |
| `apps/web/public/`                        | Static assets (icons, manifest, og-image)|
| `apps/web/src/index.html`                 | Favicons already wired (16/32/180/512)   |
| `prisma/schema.prisma`                    | Prisma DB schema (MySQL, multi-tenant)   |
| `.env.deploy`                             | FTP/SSH credentials + DB + JWT secrets   |
| `.deploy/`                                | Staging dir (tarballs, jwt secrets)      |
| `deploy.ps1`                              | Full deploy script                       |

## Deploy

```powershell
# Full deploy (API + FE + prisma db push)
pwsh ./deploy.ps1

# Selective
pwsh ./deploy.ps1 -SkipFrontend   # API only
pwsh ./deploy.ps1 -SkipBackend    # FE only
pwsh ./deploy.ps1 -SkipBuild      # re-use existing dist/
pwsh ./deploy.ps1 -SkipDbPush     # skip prisma db push
pwsh ./deploy.ps1 -DryRun         # build only, no upload
pwsh ./deploy.ps1 -Seed           # seed plans + super-admin after deploy
```

Requires PowerShell module `Posh-SSH` and credentials in `.env.deploy`.

## After deploy

- `https://madcreateapi.madleads.ai/v1/health` → `{"ok":true,...}`
- `https://madcreate.madleads.ai` → Angular SPA

## `.env.deploy` keys

- `SFTP_HOST`, `SFTP_USER`, `SFTP_PASS` — DreamHost CloudCompute SSH
- `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE`
- `FE_SFTP_ROOT`, `API_SFTP_ROOT` — remote paths on server
- JWT secrets auto-cached in `.deploy/jwt.secret` + `.deploy/jwt-refresh.secret`

## /claude operator queue

See `.claude/README.md` for scanner + worker scheduled tasks.
Logs land in `.claude/worker/worker.log` and `.claude/scanner/scanner.log`.


## Migration Update (2026-05-25)
- Workspace migration finalized under `C:\\Code\\madprospects`; legacy source directories in `C:\\Code` were removed after true move.
- pnpm shared store remains centralized at `C:/Code/.pnpm`; `pnpm approve-builds --all` was run in active workspace contexts.
- `@madcreate/shared` linkage was finalized for app-level operations (`workspace:*` resolving to `link:../../packages/shared` in installs).
- Added `C:\\Code\\madprospects\\madcreate\\.npmrc` with `recursive-install=false` and kept pnpm-first scripts for shared-package prebuild hooks.

