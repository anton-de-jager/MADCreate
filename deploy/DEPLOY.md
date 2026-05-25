# Deploying MADCreate to DreamHost CloudCompute

A single PowerShell script (`deploy/deploy.ps1`) handles the full publish: builds the Angular app with the production API URL baked in, builds NestJS, ships a single tarball over SFTP, runs `prisma db push` against the production MySQL, then runs `pm2 reload mc-api` (or starts it on first run) over SSH. The Apache vhost in front of `madcreateapi.madprospects.com` reverse-proxies all requests to the PM2 process via `mod_proxy`. **Passenger is intentionally not used — it's broken on this hosting.**

Credentials and per-environment values live in **`.deploy/.env.deploy`** (gitignored) . Edit them there — never in `deploy/deploy.ps1`.

---

## Architecture in one picture

```
                                 Internet
                                    │
                       ┌────────────┴─────────────┐
                       │                          │
              madcreate.madprospects.com       madcreateapi.madprospects.com
                  (Apache, TLS)              (Apache, TLS)
                       │                          │
            ┌──────────┴───────────┐    ┌─────────┴──────────┐
            │  static SPA bundle   │    │ .htaccess  [P]     │
            │ /home/<user>/        │    │ reverse-proxy to   │
            │ madcreate.madleads…/ │    │ 127.0.0.1:<PORT>   │
            └──────────────────────┘    └─────────┬──────────┘
                                                  │
                                                  ▼
                                        ┌──────────────────┐
                                        │ PM2 process      │
                                        │ name: mc-api     │
                                        │ port: 3005 (def) │
                                        └─────────┬────────┘
                                                  │
                                                  ▼
                                          MySQL (DB_HOST)
```

---

## One-time prerequisites in the DreamHost panel & on the CloudCompute box

Do these **once**, before the first `deploy/deploy.ps1` run.

### 1. CloudCompute instance

Provision a CloudCompute Ubuntu instance and note its **public IPv4**. SSH in as your deploy user and run the full bootstrap once:

```bash
# Node + PM2 are required. Versions matter — Node 20+ for NestJS 11.
node -v                              # must be 20+
npm -v
pm2 -v || sudo npm i -g pm2

# One-time: register the systemd unit so PM2 survives reboot.
# This prints a `sudo …` command — copy/paste it as-is to enable the service.
pm2 startup

# Log rotation.
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 14

# Apache modules required by the reverse-proxy .htaccess.
apachectl -M 2>&1 | grep -E "proxy_http|proxy_module|rewrite|headers"

# Confirm AllowOverride permits .htaccess on the API web root.
sudo grep -A2 "<Directory.*madcreateapi" /etc/apache2/sites-enabled/*.conf
```

### 2. DNS

Both subdomains must resolve to the CloudCompute public IPv4.

| Host | Type | Target |
|---|---|---|
| `madcreate.madprospects.com`    | A | `<CloudCompute public IPv4>` |
| `madcreateapi.madprospects.com` | A | `<CloudCompute public IPv4>` |

### 3. Two domains in DreamHost panel

In **Domains → Manage Domains → Add Hosting**:

| Domain | Type | Notes |
|---|---|---|
| `madcreate.madprospects.com`    | Fully Hosted (static) | Web root e.g. `/home/<user>/madcreate.madprospects.com`. **Do NOT** tick Passenger. |
| `madcreateapi.madprospects.com` | Fully Hosted          | Web root e.g. `/home/<user>/madcreateapi.madprospects.com`. **Do NOT** tick Passenger. Apache must have `mod_proxy`, `mod_proxy_http`, `mod_rewrite`, and `mod_headers` enabled. |

### 4. Vhost ProxyPass to port 3005

DreamHost's panel only exposes the high-level vhost; on the CloudCompute box, edit the vhost config (or have DreamHost set it) so the `madcreateapi` vhost has a `ProxyPass` pointed at the PM2 port. The `.htaccess` we ship is the fallback; a vhost-level `ProxyPass` is cleaner. Pass `-SkipApiHtaccess` on the deploy when the vhost-level config is in place.

Default port for this stack is **3005** (mh-api occupies 3002 on the same box). If you pick a different port, update `API_PORT` in `.deploy/.env.deploy` **and** the vhost config — they must match.

### 5. TLS certificates

In **Domains → Manage Domains → Secure Hosting**, add a free **Let's Encrypt** certificate for *both* subdomains.

### 6. SFTP/SSH user with shell access

The deploy script needs SSH (not just SFTP) to extract the tarball, run `prisma db push`, and run PM2. The same user can own both subdomains' web roots. **Shell access must be enabled** on the user in the panel.

### 7. MySQL

You can use DreamHost's managed MySQL or MySQL running on the CloudCompute box itself. Wherever it runs:

- Database: `madcreate`
- User with full access to that database
- Hostname/port reachable from the CloudCompute instance

`prisma db push` runs from the API host after every deploy (unless you pass `-SkipDbPush`) so the schema stays in sync. No manual migration files needed in dev mode.

### 8. `.deploy/.env.deploy`

Create `.deploy/.env.deploy` at the project root (gitignored) with the values for your environment. Required keys:

```bash
FRONTEND_PUBLIC_URL=https://madcreate.madprospects.com
API_PUBLIC_URL=https://madcreateapi.madprospects.com

FRONTEND_SFTP_HOST=<CloudCompute public IPv4 or hostname>
FRONTEND_SFTP_USER=<shell user>
FRONTEND_SFTP_PASS=<password>
FRONTEND_REMOTE_PATH=/home/<user>/madcreate.madprospects.com

API_SFTP_HOST=<CloudCompute public IPv4 or hostname>
API_SFTP_USER=<shell user>
API_SFTP_PASS=<password>
API_REMOTE_PATH=/home/<user>/madcreate-api              # PM2 app dir — OUTSIDE web root
API_WEB_ROOT=/home/<user>/madcreateapi.madprospects.com      # Apache web root (.htaccess lands here)
API_PORT=3005                                           # upstream PM2 port; matches .htaccess [P] rule
PM2_PROCESS_NAME=mc-api                                 # check `pm2 ls` on the box first

DB_HOST=mysql.madcreate.madprospects.com
DB_PORT=3306
DB_USERNAME=madcreate
DB_PASSWORD=<password>
DB_DATABASE=madcreate

DEFAULT_USER_EMAIL=admin@madcreate.local
DEFAULT_USER_PASSWORD=<something stronger than ChangeMeNow!23>

# Optional — defaults to FRONTEND_PUBLIC_URL. Comma-separated for multiple origins.
# CORS_ORIGINS=https://madcreate.madprospects.com,https://staging.madcreate.madprospects.com
```

> **PM2 process name:** before the first deploy, SSH in and run `pm2 ls`. If a different naming convention is already in use on the box, set `PM2_PROCESS_NAME` accordingly.

---

## First-ever deploy

From the project root in PowerShell:

```powershell
.\deploy\deploy.ps1 -Seed
```

What `-Seed` does after upload: SSHes to the API host and runs `npx tsx database/prisma/seed.ts`, which populates:

- 5 plans (free / starter / growth / scale / enterprise)
- 22 integrations in the catalog
- 7 AI prompt templates
- Default super-admin user (`admin@madcreate.local` / `ChangeMeNow!23`)
- Demo workspace + demo tenant (`/demo`) with a fully-rendered sample site

The seed is idempotent — re-running won't duplicate.

**As soon as the deploy finishes:** log in at https://madcreate.madprospects.com and change the default password from `/app/settings`.

---

## Subsequent deploys

```powershell
.\deploy\deploy.ps1                    # build both, upload both, prisma db push, pm2 reload mc-api
.\deploy\deploy.ps1 -SkipBackend       # frontend-only push (e.g. CSS tweak)
.\deploy\deploy.ps1 -SkipFrontend      # API-only push
.\deploy\deploy.ps1 -SkipBuild         # re-upload the last build, no rebuild
.\deploy\deploy.ps1 -SkipDbPush        # code-only deploy (schema unchanged)
.\deploy\deploy.ps1 -SkipApiHtaccess   # vhost-level ProxyPass in place; skip .htaccess fallback
.\deploy\deploy.ps1 -DryRun            # build & stage locally, no uploads
.\deploy\deploy.ps1 -Seed              # re-run the seed (idempotent — won't duplicate)
```

The script is **idempotent** on the API side: it does `pm2 describe mc-api` first and chooses `pm2 reload` vs `pm2 start` accordingly. Safe to re-run.

---

## What ends up where

### Frontend host (`<FRONTEND_REMOTE_PATH>`, e.g. `/home/<user>/madcreate.madprospects.com/`)

```
index.html
.htaccess          ← SPA rewrite: /app/xxx etc. → index.html
main-*.js
polyfills-*.js
styles-*.css
assets/
```

### API host

**PM2 app dir** (`<API_REMOTE_PATH>`, e.g. `/home/<user>/madcreate-api/`):
```
app.js                ← PM2 entry: dotenv + require('./dist/main')
package.json          ← Modified: @madcreate/shared as file: ref, prisma in prod deps
package-lock.json
.env                  ← Prod DB creds + JWT secrets (auto-generated, persisted under .deploy/)
dist/                 ← Compiled NestJS
database/prisma/               ← schema.prisma + seed.ts (used by prisma generate / db push / seed)
shared-pkg/           ← Bundled @madcreate/shared (dist + package.json)
scripts/              ← Operator scripts (e.g. reset-super-admin.js)
node_modules/         ← Bundled into the tarball at build time; prisma client regenerated on the server
storage/uploads/      ← Tenant media uploads (persisted across deploys)
```

**Apache web root** (`<API_WEB_ROOT>`, e.g. `/home/<user>/madcreateapi.madprospects.com/`):
```
.htaccess             ← Reverse-proxy to 127.0.0.1:<API_PORT> via [P]
```

---

## How the deploy handles the monorepo

The source layout is pnpm workspaces:

```
apps/api/             # NestJS backend
apps/web/             # Angular frontend
packages/shared/      # Shared TypeScript types/DTOs (imported by both apps)
```

The deploy script:

1. Runs `pnpm install` at the root (workspaces install everything in one go).
2. Builds `@madcreate/shared` first (`apps/api` and `apps/web` import from its `dist/`).
3. Builds the API and stages it into `.deploy/backend/`.
4. **Rewrites the staged `package.json`**: replaces `"@madcreate/shared": "*"` with `"@madcreate/shared": "file:./shared-pkg"`, and moves `prisma` into prod deps so the CLI is available on the server for `db push`.
5. Bundles the shared package's built `dist/` next to the staged API as `shared-pkg/`.
6. Runs `npm install --omit=dev` inside the staging dir so we ship a self-contained tarball.
7. On the server, runs `npx prisma generate` so the Prisma client uses the Linux-native engine (the version cached in your local node_modules won't run on Ubuntu).

This means the server never has to know about pnpm workspaces or our monorepo layout — it sees a single self-contained Node app.

---

## Troubleshooting

**"Install-Module Posh-SSH failed"**
Open PowerShell **as Administrator** once and run:
```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
Install-Module Posh-SSH -Scope CurrentUser -Force
```

**API returns 502 / 503 / connection refused**
The reverse-proxy works but PM2 is down. SSH in and check:
```
pm2 ls
pm2 logs mc-api --lines 200
```
Common causes: bad DB creds in `.env`, port collision (something else bound to `API_PORT`), or `dist/main.js` not present (build skipped on a fresh dir).

**API returns 500 but PM2 says it's up**
Hit it directly on the box to bypass Apache:
```
curl -i http://127.0.0.1:3005/v1/health
```
If that returns 200, the issue is Apache config — confirm `mod_proxy_http` is enabled and that the `.htaccess` actually landed at `<API_WEB_ROOT>/.htaccess`.

**Prisma fails at startup with "Cannot find module @prisma/client"**
The `prisma generate` step didn't run, or it generated against the wrong platform. Re-run the deploy (the script regenerates on every deploy). If it persists, SSH in and:
```
cd /home/madprospects/madcreate-api
npx prisma generate --schema=database/prisma/schema.prisma
pm2 reload mc-api
```

**`prisma db push` fails with auth error**
Confirm the DB creds in `.deploy/.env.deploy` match the DreamHost-managed MySQL. The script URL-encodes `@` in the password automatically; if your password has other special chars (`/`, `:`, `?`, `#`, `&`), they need to be safe for a URL — change them, or override `DATABASE_URL` directly in `.deploy/.env.deploy`.

**Frontend loads but API calls fail with CORS**
Inspect what got baked: `cat <API_REMOTE_PATH>/.env | grep API_CORS_ORIGINS`. The script defaults the origins to `FRONTEND_PUBLIC_URL`. Override via `CORS_ORIGINS` in `.deploy/.env.deploy` if you need multiple origins, then re-deploy.

**"Refresh on /app/home returns 404"**
The SPA `.htaccess` rewrite didn't make it. Check that `<FRONTEND_REMOTE_PATH>/.htaccess` exists.

**Tenant uploads vanish between deploys**
The script preserves `storage/uploads/` because it only uploads files (never deletes via SFTP). The tarball's extraction unpacks alongside the existing dir; uploads stay put.

**PM2 doesn't survive reboot**
Run `pm2 startup` once on the box and follow the printed sudo command. After every deploy the script calls `pm2 save`.

**I'm locked out of the super-admin account**
Use the bundled recovery script — it lands in `<API_REMOTE_PATH>/scripts/` on every deploy:

```powershell
# From your laptop (PowerShell)
ssh madprospects@<host> "cd /home/madprospects/madcreate-api && node scripts/reset-super-admin.js admin@madcreate.local <newpassword>"
```

Or, to keep the password out of shell history:

```bash
# On the server
cd /home/madprospects/madcreate-api
RESET_EMAIL=admin@madcreate.local RESET_PASSWORD='<newpassword>' node scripts/reset-super-admin.js
```

The script also sets `isSuperAdmin = true` and clears `deletedAt`, so it'll recover a soft-deleted account too. Log in immediately afterwards and rotate the password via `/app/settings`.
