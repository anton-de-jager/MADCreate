<#
.SYNOPSIS
  MADCreate production deploy to DreamHost CloudCompute (PM2 + Apache reverse-proxy).

.DESCRIPTION
  Builds the Angular frontend with the production API URL baked in, builds the
  NestJS backend (monorepo: @madcreate/api + @madcreate/shared), ships a tarball
  over SFTP to the CloudCompute instance, runs `prisma db push` to sync the
  schema, then reloads the API process under PM2 over SSH. The Apache vhost in
  front of the API subdomain reverse-proxies all requests to the PM2 port via an
  .htaccess rule (mod_proxy / [P] flag) - Passenger is intentionally NOT used
  because it is broken on this hosting.

  -------------------------------------------------------------------------
  Deployment targets (set in DreamHost panel before first run)
  -------------------------------------------------------------------------
  Hosting           : DreamHost CloudCompute instance (single Ubuntu VM).
                      Node 20+ and `pm2` must be installed globally on the box
                      (verify with `node -v` and `pm2 -v` over SSH).

  DNS (A records)   : madcreate.madprospects.com      -> <CloudCompute public IPv4>
                      madcreateapi.madprospects.com   -> <CloudCompute public IPv4>
                      Set both in DreamHost panel -> Domains -> Manage Domains.

  TLS certs         : Provisioned per-subdomain via DreamHost panel
                      -> Domains -> Manage Domains -> Secure Hosting ->
                      "Add free Let's Encrypt certificate" for BOTH subdomains.

  Apache vhosts     : Both subdomains "Fully Hosted" (do NOT tick Passenger).
                      mod_proxy + mod_proxy_http + mod_rewrite + mod_headers
                      must be enabled so the API .htaccess [P] proxy rule works.

  PM2 process name  : `mc-api` (override via PM2_PROCESS_NAME in .deploy/.env.deploy).

  Upstream API port : Set via API_PORT in .deploy/.env.deploy (default 3005). The
                      reverse-proxy .htaccess rewrites to 127.0.0.1:<API_PORT>,
                      so this must match the PORT baked into the API's .env.

.PARAMETER SkipFrontend
  Don't build or upload the Angular app.
.PARAMETER SkipBackend
  Don't build or upload the API.
.PARAMETER SkipBuild
  Skip the npm build steps (re-use existing dist/).
.PARAMETER SkipInstall
  Skip the remote npm install step. (No-op: deps are bundled into the tarball
  at build time; kept for backwards compatibility.)
.PARAMETER Seed
  After upload, run `npx tsx database/prisma/seed.ts` on the API host. Use on the FIRST
  deploy to populate plans, integrations, AI prompts, super admin, and the
  demo workspace.
.PARAMETER SkipApiHtaccess
  Don't upload the reverse-proxy .htaccess to API_WEB_ROOT. Use when the
  Apache vhost itself already does `ProxyPass / http://127.0.0.1:<port>/`.
.PARAMETER SkipDbPush
  Don't run `prisma db push` after extract. Use when the remote schema is
  already in sync and you want a strictly code-only deploy.
.PARAMETER DryRun
  Build and stage everything but skip every SFTP/SSH operation.

.EXAMPLE
  .\deploy\deploy.ps1 -Seed             # first-ever deploy
  .\deploy\deploy.ps1                   # subsequent deploys
  .\deploy\deploy.ps1 -SkipBackend      # frontend-only push
  .\deploy\deploy.ps1 -SkipBuild        # re-upload last build
#>

[CmdletBinding()]
param(
  [switch]$SkipFrontend,
  [switch]$SkipBackend,
  [switch]$SkipBuild,
  [switch]$SkipInstall,
  [switch]$SkipApiHtaccess,
  [switch]$SkipDbPush,
  [switch]$Seed,
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
$ProgressPreference    = 'SilentlyContinue'
$deployScriptRoot      = $PSScriptRoot
$scriptRoot            = (Resolve-Path (Join-Path $deployScriptRoot '..')).Path
Set-Location $scriptRoot

function Write-Step  { param($n, $total, $msg) Write-Host ""; Write-Host "[$n/$total] $msg" -ForegroundColor Cyan }
function Write-Ok    { param($msg) Write-Host "  [OK] $msg"   -ForegroundColor Green }
function Write-Warn2 { param($msg) Write-Host "  [!]  $msg"   -ForegroundColor Yellow }
function Write-Info  { param($msg) Write-Host "  ...  $msg"   -ForegroundColor Gray }

# ---------------------------------------------------------------------------
# 1. Load .deploy/.env.deploy
# ---------------------------------------------------------------------------
Write-Step 1 7 "Loading .deploy/.env.deploy"

$envFile = Join-Path $scriptRoot '.deploy\.env.deploy'
if (-not (Test-Path $envFile)) {
  throw ".deploy\.env.deploy not found under $scriptRoot."
}

$cfg = @{}
Get-Content $envFile | ForEach-Object {
  $line = $_.Trim()
  if ($line -eq '' -or $line.StartsWith('#')) { return }
  $idx = $line.IndexOf('=')
  if ($idx -lt 0) { return }
  $k = $line.Substring(0, $idx).Trim()
  $v = $line.Substring($idx + 1).Trim()
  $cfg[$k] = $v
}

$required = @(
  'FRONTEND_PUBLIC_URL','API_PUBLIC_URL',
  'FRONTEND_SFTP_HOST','FRONTEND_SFTP_USER','FRONTEND_SFTP_PASS','FRONTEND_REMOTE_PATH',
  'API_SFTP_HOST','API_SFTP_USER','API_SFTP_PASS','API_REMOTE_PATH',
  'DB_HOST','DB_PORT','DB_USERNAME','DB_PASSWORD','DB_DATABASE'
)
foreach ($k in $required) {
  if (-not $cfg.ContainsKey($k) -or [string]::IsNullOrWhiteSpace($cfg[$k])) {
    throw "Missing or empty key in .deploy/.env.deploy: $k"
  }
}
if (-not $cfg.ContainsKey('FRONTEND_SFTP_PORT'))    { $cfg['FRONTEND_SFTP_PORT'] = '22' }
if (-not $cfg.ContainsKey('API_SFTP_PORT'))         { $cfg['API_SFTP_PORT']     = '22' }
if (-not $cfg.ContainsKey('DEFAULT_USER_EMAIL'))    { $cfg['DEFAULT_USER_EMAIL']    = 'admin@madcreate.local' }
if (-not $cfg.ContainsKey('DEFAULT_USER_PASSWORD')) { $cfg['DEFAULT_USER_PASSWORD'] = 'ChangeMeNow!23' }
if (-not $cfg.ContainsKey('API_PORT'))              { $cfg['API_PORT']              = '3005' }
if (-not $cfg.ContainsKey('PM2_PROCESS_NAME'))      { $cfg['PM2_PROCESS_NAME']      = 'mc-api' }
if (-not $cfg.ContainsKey('API_WEB_ROOT') -or [string]::IsNullOrWhiteSpace($cfg['API_WEB_ROOT'])) {
  $cfg['API_WEB_ROOT'] = $cfg['API_REMOTE_PATH']
}

# Build the DATABASE_URL Prisma uses. URL-encode '@' in the password to '%40'
# so the connection string parses correctly. Add connection-pool params so:
#   - connection_limit=5 keeps the pool small enough that stale connections
#     get cycled out quickly (DreamHost managed MySQL has aggressive
#     wait_timeout that produces P1017 on idle reuse).
#   - pool_timeout=20 = how long Prisma waits for a free connection.
#   - connect_timeout=15 = TCP handshake budget.
$dbPassEncoded = [System.Uri]::EscapeDataString($cfg.DB_PASSWORD)
$cfg['DATABASE_URL'] = "mysql://$($cfg.DB_USERNAME):$dbPassEncoded@$($cfg.DB_HOST):$($cfg.DB_PORT)/$($cfg.DB_DATABASE)?connection_limit=5&pool_timeout=20&connect_timeout=15"

Write-Ok "Config loaded. frontend=$($cfg.FRONTEND_PUBLIC_URL)  api=$($cfg.API_PUBLIC_URL)"

if ($SkipInstall) {
  Write-Warn2 "-SkipInstall is a no-op in the PM2 architecture (deps are bundled into the tarball at build time)."
}

# ---------------------------------------------------------------------------
# 2. Ensure Posh-SSH
# ---------------------------------------------------------------------------
Write-Step 2 7 "Checking PowerShell modules"

if (-not (Get-Module -ListAvailable -Name Posh-SSH)) {
  Write-Info "Posh-SSH not installed. Installing for current user..."
  try {
    Install-Module Posh-SSH -Scope CurrentUser -Force -AllowClobber -ErrorAction Stop
  } catch {
    throw "Failed to install Posh-SSH. Run as Administrator: Install-Module Posh-SSH -Scope CurrentUser -Force"
  }
}
Import-Module Posh-SSH -ErrorAction Stop
Write-Ok "Posh-SSH ready"

# ---------------------------------------------------------------------------
# 3. Frontend build (Angular with prod API URL baked in)
# ---------------------------------------------------------------------------
$frontendBuild = Join-Path $scriptRoot 'apps\web\dist\madcreate-web\browser'
$envTsPath     = Join-Path $scriptRoot 'apps\web\src\environments\environment.production.ts'

if (-not $SkipFrontend -and -not $SkipBuild) {
  Write-Step 3 7 "Building frontend (prod). apiBaseUrl = $($cfg.API_PUBLIC_URL)/v1"

  $oldEAP = $ErrorActionPreference

  # Workspace install once (workspaces pull in apps/api, apps/web, packages/shared).
  $workspaceNodeModules = @(
    (Join-Path $scriptRoot 'node_modules'),
    (Join-Path $scriptRoot 'apps\web\node_modules'),
    (Join-Path $scriptRoot 'apps\api\node_modules'),
    (Join-Path $scriptRoot 'packages\shared\node_modules')
  )
  $missingWorkspaceDeps = $workspaceNodeModules | Where-Object { -not (Test-Path $_) }
  if ($missingWorkspaceDeps.Count -gt 0) {
    Write-Info "Installing workspace deps recursively..."
    $ErrorActionPreference = 'Continue'
    pnpm install --frozen-lockfile
    $code = $LASTEXITCODE
    $ErrorActionPreference = $oldEAP
    if ($code -ne 0) { throw "Workspace pnpm install failed (exit $code)" }
  }

  # Shared package must be built before web (web imports from @madcreate/shared/dist).
  Write-Info "Building @madcreate/shared..."
  $ErrorActionPreference = 'Continue'
  pnpm run build:shared
  $code = $LASTEXITCODE
  $ErrorActionPreference = $oldEAP
  if ($code -ne 0) { throw "Shared package build failed (exit $code)" }

  # Nuke dist/ before building so stale hashed chunks from earlier builds
  # don't end up in the upload set.
  $distRoot = Join-Path $scriptRoot 'apps\web\dist'
  if (Test-Path $distRoot) {
    Remove-Item -Recurse -Force $distRoot -ErrorAction SilentlyContinue
  }

  $envBackup = Get-Content $envTsPath -Raw
  try {
    $prodEnvTs = @"
export const environment = {
  production: true,
  apiBaseUrl: '$($cfg.API_PUBLIC_URL)/v1',
  appName: 'MADCreate',
  publicDomain: '$([System.Uri]::new($cfg.FRONTEND_PUBLIC_URL).Host)',
  errorReporterToken: '$($cfg.CLAUDE_WORKER_TOKEN)',
};
"@
    # BOM-less UTF8 — Set-Content -Encoding UTF8 in PS5.1 prepends a BOM,
    # which Angular tolerates but is untidy and trips strict TS parsers.
    [System.IO.File]::WriteAllText($envTsPath, $prodEnvTs, (New-Object System.Text.UTF8Encoding $false))

    Push-Location 'apps\web'
    $ErrorActionPreference = 'Continue'
    pnpm run build -- --configuration production
    $code = $LASTEXITCODE
    $ErrorActionPreference = $oldEAP
    Pop-Location
    if ($code -ne 0) { throw "Frontend build failed (exit $code)" }
  } finally {
    # Restore in BOM-less UTF8 too so the file's hash on disk matches.
    [System.IO.File]::WriteAllText($envTsPath, $envBackup, (New-Object System.Text.UTF8Encoding $false))
  }

  if (-not (Test-Path $frontendBuild)) {
    $altBuild = Join-Path $scriptRoot 'apps\web\dist\madcreate-web'
    if (Test-Path (Join-Path $altBuild 'index.html')) {
      $frontendBuild = $altBuild
    } else {
      throw "Frontend build output not found at $frontendBuild"
    }
  }

  # SPA-routing .htaccess so /app/xxx etc. don't 404 on refresh.
  # Written as ASCII without BOM - Apache rejects BOMs in .htaccess.
  $htaccess = @'
RewriteEngine On
RewriteBase /

# Don't rewrite real files or directories
RewriteCond %{REQUEST_FILENAME} -f [OR]
RewriteCond %{REQUEST_FILENAME} -d
RewriteRule ^ - [L]

# Everything else falls back to index.html (SPA routing)
RewriteRule ^ /index.html [L]
'@
  [System.IO.File]::WriteAllText((Join-Path $frontendBuild '.htaccess'), $htaccess, [System.Text.Encoding]::ASCII)

  # Stamp version.json with a unique build ID so the app can detect new deploys.
  $buildId = [System.DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds().ToString()
  $versionJson = "{`"buildId`":`"$buildId`"}"
  [System.IO.File]::WriteAllText((Join-Path $frontendBuild 'version.json'), $versionJson, (New-Object System.Text.UTF8Encoding $false))

  Write-Ok "Frontend built at $frontendBuild (buildId=$buildId)"
} elseif (-not $SkipFrontend) {
  Write-Step 3 7 "Frontend build skipped (-SkipBuild)"
  if (-not (Test-Path (Join-Path $frontendBuild 'index.html'))) {
    throw "No existing build at $frontendBuild. Drop -SkipBuild on first run."
  }
}

# ---------------------------------------------------------------------------
# 4. Backend build + stage PM2 bundle
# ---------------------------------------------------------------------------
$backendStage = Join-Path $scriptRoot '.deploy\backend'

if (-not $SkipBackend -and -not $SkipBuild) {
  Write-Step 4 7 "Building backend"

  $oldEAP = $ErrorActionPreference

  $workspaceNodeModules = @(
    (Join-Path $scriptRoot 'node_modules'),
    (Join-Path $scriptRoot 'apps\web\node_modules'),
    (Join-Path $scriptRoot 'apps\api\node_modules'),
    (Join-Path $scriptRoot 'packages\shared\node_modules')
  )
  $missingWorkspaceDeps = $workspaceNodeModules | Where-Object { -not (Test-Path $_) }
  if ($missingWorkspaceDeps.Count -gt 0) {
    Write-Info "Installing workspace deps recursively..."
    $ErrorActionPreference = 'Continue'
    pnpm install --frozen-lockfile
    $code = $LASTEXITCODE
    $ErrorActionPreference = $oldEAP
    if ($code -ne 0) { throw "Workspace pnpm install failed (exit $code)" }
  }

  # Build shared first (api imports from @madcreate/shared/dist).
  Write-Info "Building @madcreate/shared..."
  $ErrorActionPreference = 'Continue'
  pnpm run build:shared
  $code = $LASTEXITCODE
  $ErrorActionPreference = $oldEAP
  if ($code -ne 0) { throw "Shared package build failed (exit $code)" }

  Write-Info "Generating Prisma client..."
  $ErrorActionPreference = 'Continue'
  pnpm run prisma:generate
  $code = $LASTEXITCODE
  $ErrorActionPreference = $oldEAP
  if ($code -ne 0) { throw "Prisma client generation failed (exit $code)" }

  Write-Info "Building @madcreate/api..."
  $ErrorActionPreference = 'Continue'
  pnpm run build:api
  $code = $LASTEXITCODE
  $ErrorActionPreference = $oldEAP
  if ($code -ne 0) { throw "Backend build failed (exit $code)" }

  if (Test-Path $backendStage) { Remove-Item $backendStage -Recurse -Force }
  New-Item -ItemType Directory -Path $backendStage | Out-Null

  # API artefacts
  Copy-Item 'apps\api\dist'         "$backendStage\dist"                 -Recurse
  if (Test-Path 'apps\api\package-lock.json') {
    Copy-Item 'apps\api\package-lock.json' "$backendStage\package-lock.json"
  }

  # Prisma schema travels with the build (required by `prisma generate` and
  # `prisma db push` on the server).
  New-Item -ItemType Directory -Path "$backendStage\database" -Force | Out-Null
  Copy-Item 'database\prisma' "$backendStage\database\prisma" -Recurse

  # Shared package (with built dist/). The staged package.json points at this
  # via a `file:` reference instead of the workspace `*` version.
  New-Item -ItemType Directory -Path "$backendStage\shared-pkg" | Out-Null
  Copy-Item 'packages\shared\dist'         "$backendStage\shared-pkg\dist"         -Recurse
  Copy-Item 'packages\shared\package.json' "$backendStage\shared-pkg\package.json"

  # Operator scripts (e.g. reset-super-admin.js).
  if (Test-Path 'apps\api\scripts') {
    Copy-Item 'apps\api\scripts' "$backendStage\scripts" -Recurse
  }

  # Apache vhost configs + install.sh ship with the tarball so a root user on
  # the box can run `bash apache/install.sh` once per box to land the vhosts
  # and request Let's Encrypt certs.
  if (Test-Path 'deploy\apache') {
    Copy-Item 'deploy\apache' "$backendStage\apache" -Recurse
  }

  # Persisted across deploys: tenant media uploads.
  New-Item -ItemType Directory -Path "$backendStage\storage\uploads" -Force | Out-Null

  # Rewrite the API's package.json so `@madcreate/shared` points at the local
  # bundled copy, and `prisma` is a regular dep (so `--omit=dev` still installs
  # it - we need the CLI on the server for db push). Also strip workspace scripts.
  $pkg = Get-Content 'apps\api\package.json' -Raw | ConvertFrom-Json
  if ($pkg.dependencies.'@madcreate/shared') {
    $pkg.dependencies.'@madcreate/shared' = 'file:./shared-pkg'
  }
  # Move prisma from root devDeps into this package's regular deps so it's
  # available on the server (DreamHost user has node but may not have global prisma).
  if (-not $pkg.dependencies.prisma) {
    $pkg.dependencies | Add-Member -NotePropertyName 'prisma' -NotePropertyValue '^5.22.0' -Force
  }
  # Trim scripts to just what runtime needs (no `prebuild` hook pointing at the workspace).
  $pkg.scripts = @{
    'start'        = 'node app.js'
    'prisma:push'  = 'prisma db push --schema=database/prisma/schema.prisma --accept-data-loss'
    'prisma:seed'  = 'npx tsx database/prisma/seed.ts'
    'prisma:generate' = 'prisma generate --schema=database/prisma/schema.prisma'
  }
  # Write WITHOUT a BOM. Set-Content -Encoding UTF8 in Windows PowerShell 5.1
  # writes a BOM, which Node's ESM resolver (used by tsx for the seed) refuses
  # to parse: "Error parsing: package.json".
  $pkgJson = ($pkg | ConvertTo-Json -Depth 100)
  [System.IO.File]::WriteAllText("$backendStage\package.json", $pkgJson, (New-Object System.Text.UTF8Encoding $false))

  # Re-use the JWT secrets across deploys so existing sessions stay valid.
  $jwtCachePath = Join-Path $scriptRoot '.deploy\jwt.secret'
  $refreshCachePath = Join-Path $scriptRoot '.deploy\jwt-refresh.secret'
  if (Test-Path $jwtCachePath) { $jwtSecret = Get-Content $jwtCachePath -Raw }
  else {
    $bytes = New-Object byte[] 48
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    $jwtSecret = [System.Convert]::ToBase64String($bytes)
    Set-Content -Path $jwtCachePath -Value $jwtSecret -NoNewline
  }
  if (Test-Path $refreshCachePath) { $jwtRefresh = Get-Content $refreshCachePath -Raw }
  else {
    $bytes = New-Object byte[] 48
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    $jwtRefresh = [System.Convert]::ToBase64String($bytes)
    Set-Content -Path $refreshCachePath -Value $jwtRefresh -NoNewline
  }

  # Production .env baked into the tarball. Loaded by app.js via dotenv.
  $corsOrigins = if ($cfg.CORS_ORIGINS) { $cfg.CORS_ORIGINS } else { $cfg.FRONTEND_PUBLIC_URL }
  $appDomain   = [System.Uri]::new($cfg.FRONTEND_PUBLIC_URL).Host
  $apiDomain   = [System.Uri]::new($cfg.API_PUBLIC_URL).Host
  $prodDotEnv = @"
NODE_ENV=production
APP_NAME=MADCreate
APP_VERSION=0.1.0

APP_URL=$($cfg.FRONTEND_PUBLIC_URL)
API_URL=$($cfg.API_PUBLIC_URL)
APP_PUBLIC_DOMAIN=$appDomain
API_PUBLIC_DOMAIN=$apiDomain

API_HOST=127.0.0.1
API_PORT=$($cfg.API_PORT)
API_GLOBAL_PREFIX=v1
API_CORS_ORIGINS=$corsOrigins

DATABASE_URL=$($cfg.DATABASE_URL)
MYSQL_HOST=$($cfg.DB_HOST)
MYSQL_PORT=$($cfg.DB_PORT)
MYSQL_USER=$($cfg.DB_USERNAME)
MYSQL_PASSWORD=$($cfg.DB_PASSWORD)
MYSQL_DATABASE=$($cfg.DB_DATABASE)

REDIS_URL=$(if ($cfg.REDIS_URL) { $cfg.REDIS_URL } else { 'redis://127.0.0.1:6379' })
REDIS_HOST=$(if ($cfg.REDIS_HOST) { $cfg.REDIS_HOST } else { '127.0.0.1' })
REDIS_PORT=$(if ($cfg.REDIS_PORT) { $cfg.REDIS_PORT } else { '6379' })

JWT_SECRET=$jwtSecret
JWT_ACCESS_TTL=15m
JWT_REFRESH_SECRET=$jwtRefresh
JWT_REFRESH_TTL=30d

LOG_LEVEL=info
LOG_PRETTY=false

STORAGE_DRIVER=local
STORAGE_LOCAL_PATH=./storage/uploads
STORAGE_PUBLIC_URL=$($cfg.API_PUBLIC_URL)/media
# Set STORAGE_LOCAL_FORCED=1 to silence the production warning that local
# disk doesn't share files across replicas. Or set STORAGE_DRIVER=s3 and
# fill in the S3_* vars below (works with R2, B2, AWS S3, MinIO).
# STORAGE_LOCAL_FORCED=1
# S3_REGION=auto
# S3_BUCKET=
# S3_ACCESS_KEY_ID=
# S3_SECRET_ACCESS_KEY=
# S3_ENDPOINT=
# S3_PUBLIC_URL=
# S3_FORCE_SIGNED_URLS=1

FEATURE_AI_GENERATION=true
FEATURE_VISUAL_BUILDER=true
FEATURE_CUSTOM_DOMAINS=true
FEATURE_BILLING=false

# Bearer token the autonomous /claude worker uses against the API when the
# /claude controllers are auth-gated. Set in .deploy/.env.deploy; rotate by regenerating.
CLAUDE_WORKER_TOKEN=$($cfg.CLAUDE_WORKER_TOKEN)
"@
  # BOM-less UTF8: dotenv usually handles BOMs, but cleaner to skip them.
  [System.IO.File]::WriteAllText("$backendStage\.env", $prodDotEnv, (New-Object System.Text.UTF8Encoding $false))

  # PM2 entry point: boots the compiled NestJS app.
  $pm2Entry = @'
// DreamHost CloudCompute PM2 entry point: boots the compiled NestJS app.
// PM2 launches this with cwd = the app dir; .env is read from cwd.
require('dotenv').config();
require('./dist/main');
'@
  [System.IO.File]::WriteAllText("$backendStage\app.js", $pm2Entry, [System.Text.Encoding]::ASCII)

  # NOTE: deliberately NOT running `npm install` in staging on Windows.
  # The bundled node_modules would ship Windows-native binaries for
  # @prisma/engines, argon2, ssh2 etc., which don't run on the Ubuntu
  # target (exit 127 on prisma generate). We ship a small tarball (source
  # + config) and install on the server post-extract so npm pulls the
  # correct Linux binaries.
  Write-Info "Skipping local node_modules bundle (will install on the server)."

  # Bundle the whole staging folder into one tarball.
  # Pin to Windows' bundled bsdtar (System32\tar.exe). If MSYS/Cygwin GNU tar is
  # on PATH, it parses `C:\path` as a host:path SSH target - bsdtar handles
  # Windows drive letters natively.
  $backendTarball = Join-Path $scriptRoot '.deploy\backend-deploy.tar.gz'
  if (Test-Path $backendTarball) { Remove-Item $backendTarball -Force }
  $tarExe = Join-Path $env:SystemRoot 'System32\tar.exe'
  if (-not (Test-Path $tarExe)) {
    Write-Warn2 "System32\tar.exe not found; falling back to 'tar' on PATH (may fail with GNU tar on Windows)."
    $tarExe = 'tar'
  }
  Write-Info "Bundling backend (this may take 30-60s)..."
  $ErrorActionPreference = 'Continue'
  & $tarExe -czf $backendTarball -C $backendStage .
  $code = $LASTEXITCODE
  $ErrorActionPreference = $oldEAP
  if ($code -ne 0) { throw "tar bundling failed (exit $code) - tar.exe: $tarExe" }
  $sizeMb = [Math]::Round((Get-Item $backendTarball).Length / 1MB, 1)
  Write-Ok "Backend staged + bundled at $backendTarball ($sizeMb MB)"

  # ---------------------------------------------------------------------
  # Stage the Apache reverse-proxy .htaccess for the API subdomain.
  # The [P] flag hands the request to mod_proxy_http, which dials into PM2
  # on 127.0.0.1:<API_PORT>.
  # ---------------------------------------------------------------------
  $apiWebrootStage = Join-Path $scriptRoot '.deploy\api-webroot'
  if (Test-Path $apiWebrootStage) { Remove-Item $apiWebrootStage -Recurse -Force }
  New-Item -ItemType Directory -Path $apiWebrootStage | Out-Null

  # NOTE on directives: ProxyPass / ProxyPassReverse / ProxyPreserveHost are
  # SERVER/VIRTUAL HOST-context only - Apache rejects them in .htaccess. Only
  # RewriteRule with [P] is allowed (assuming AllowOverride FileInfo or All).
  $apiHtaccess = @"
# madcreateapi.madprospects.com reverse-proxy fallback to PM2 on 127.0.0.1:$($cfg.API_PORT)
# Managed by deploy.ps1 - regenerated on every deploy.
# Only directives valid in .htaccess context are emitted here.
RewriteEngine On

# Forward the original Host + scheme so Nest's logger / redirects are correct.
RequestHeader set X-Forwarded-Proto "https"
RequestHeader set X-Forwarded-Host "%{HTTP_HOST}s"

# Proxy everything to PM2. The [P] flag requires mod_proxy + mod_proxy_http.
RewriteRule ^(.*)`$ http://127.0.0.1:$($cfg.API_PORT)/`$1 [P,L]
"@
  [System.IO.File]::WriteAllText((Join-Path $apiWebrootStage '.htaccess'), $apiHtaccess, [System.Text.Encoding]::ASCII)
  Write-Ok "API reverse-proxy .htaccess staged at $apiWebrootStage (port $($cfg.API_PORT))"
} elseif (-not $SkipBackend) {
  Write-Step 4 7 "Backend build skipped (-SkipBuild)"
  if (-not (Test-Path (Join-Path $backendStage 'app.js'))) {
    throw "No existing staged backend at $backendStage. Drop -SkipBuild on first run."
  }

  # Even with -SkipBuild we always regenerate .env (so .deploy/.env.deploy changes
  # land on the server) and re-tar. The JWT secret cache lives under .deploy/
  # and is shared with the build branch, so secrets persist across deploys.
  Write-Info "Regenerating prod .env from current .deploy/.env.deploy + retarring..."

  $jwtCachePath = Join-Path $scriptRoot '.deploy\jwt.secret'
  $refreshCachePath = Join-Path $scriptRoot '.deploy\jwt-refresh.secret'
  if (-not (Test-Path $jwtCachePath))     { throw "JWT secret cache missing at $jwtCachePath. Drop -SkipBuild to regenerate." }
  if (-not (Test-Path $refreshCachePath)) { throw "Refresh secret cache missing at $refreshCachePath. Drop -SkipBuild to regenerate." }
  $jwtSecret  = Get-Content $jwtCachePath -Raw
  $jwtRefresh = Get-Content $refreshCachePath -Raw

  $corsOrigins = if ($cfg.CORS_ORIGINS) { $cfg.CORS_ORIGINS } else { $cfg.FRONTEND_PUBLIC_URL }
  $appDomain   = [System.Uri]::new($cfg.FRONTEND_PUBLIC_URL).Host
  $apiDomain   = [System.Uri]::new($cfg.API_PUBLIC_URL).Host
  $prodDotEnv = @"
NODE_ENV=production
APP_NAME=MADCreate
APP_VERSION=0.1.0

APP_URL=$($cfg.FRONTEND_PUBLIC_URL)
API_URL=$($cfg.API_PUBLIC_URL)
APP_PUBLIC_DOMAIN=$appDomain
API_PUBLIC_DOMAIN=$apiDomain

API_HOST=127.0.0.1
API_PORT=$($cfg.API_PORT)
API_GLOBAL_PREFIX=v1
API_CORS_ORIGINS=$corsOrigins

DATABASE_URL=$($cfg.DATABASE_URL)
MYSQL_HOST=$($cfg.DB_HOST)
MYSQL_PORT=$($cfg.DB_PORT)
MYSQL_USER=$($cfg.DB_USERNAME)
MYSQL_PASSWORD=$($cfg.DB_PASSWORD)
MYSQL_DATABASE=$($cfg.DB_DATABASE)

REDIS_URL=$(if ($cfg.REDIS_URL) { $cfg.REDIS_URL } else { 'redis://127.0.0.1:6379' })
REDIS_HOST=$(if ($cfg.REDIS_HOST) { $cfg.REDIS_HOST } else { '127.0.0.1' })
REDIS_PORT=$(if ($cfg.REDIS_PORT) { $cfg.REDIS_PORT } else { '6379' })

JWT_SECRET=$jwtSecret
JWT_ACCESS_TTL=15m
JWT_REFRESH_SECRET=$jwtRefresh
JWT_REFRESH_TTL=30d

LOG_LEVEL=info
LOG_PRETTY=false

STORAGE_DRIVER=local
STORAGE_LOCAL_PATH=./storage/uploads
STORAGE_PUBLIC_URL=$($cfg.API_PUBLIC_URL)/media
# Set STORAGE_LOCAL_FORCED=1 to silence the production warning that local
# disk doesn't share files across replicas. Or set STORAGE_DRIVER=s3 and
# fill in the S3_* vars below (works with R2, B2, AWS S3, MinIO).
# STORAGE_LOCAL_FORCED=1
# S3_REGION=auto
# S3_BUCKET=
# S3_ACCESS_KEY_ID=
# S3_SECRET_ACCESS_KEY=
# S3_ENDPOINT=
# S3_PUBLIC_URL=
# S3_FORCE_SIGNED_URLS=1

FEATURE_AI_GENERATION=true
FEATURE_VISUAL_BUILDER=true
FEATURE_CUSTOM_DOMAINS=true
FEATURE_BILLING=false

# Bearer token the autonomous /claude worker uses against the API when the
# /claude controllers are auth-gated. Set in .deploy/.env.deploy; rotate by regenerating.
CLAUDE_WORKER_TOKEN=$($cfg.CLAUDE_WORKER_TOKEN)
"@
  [System.IO.File]::WriteAllText("$backendStage\.env", $prodDotEnv, (New-Object System.Text.UTF8Encoding $false))

  # Re-tar the staged backend with the fresh .env baked in.
  $backendTarball = Join-Path $scriptRoot '.deploy\backend-deploy.tar.gz'
  if (Test-Path $backendTarball) { Remove-Item $backendTarball -Force }
  $tarExe = Join-Path $env:SystemRoot 'System32\tar.exe'
  if (-not (Test-Path $tarExe)) { $tarExe = 'tar' }
  $oldEAP = $ErrorActionPreference; $ErrorActionPreference = 'Continue'
  & $tarExe -czf $backendTarball -C $backendStage .
  $code = $LASTEXITCODE
  $ErrorActionPreference = $oldEAP
  if ($code -ne 0) { throw "tar re-bundle failed (exit $code)" }

  # Re-stage the .htaccess too — its port comes from .deploy/.env.deploy.
  $apiWebrootStage = Join-Path $scriptRoot '.deploy\api-webroot'
  if (-not (Test-Path $apiWebrootStage)) { New-Item -ItemType Directory -Path $apiWebrootStage | Out-Null }
  $apiHtaccess = @"
# madcreateapi.madprospects.com reverse-proxy fallback to PM2 on 127.0.0.1:$($cfg.API_PORT)
# Managed by deploy.ps1 - regenerated on every deploy.
RewriteEngine On
RequestHeader set X-Forwarded-Proto "https"
RequestHeader set X-Forwarded-Host "%{HTTP_HOST}s"
RewriteRule ^(.*)`$ http://127.0.0.1:$($cfg.API_PORT)/`$1 [P,L]
"@
  [System.IO.File]::WriteAllText((Join-Path $apiWebrootStage '.htaccess'), $apiHtaccess, [System.Text.Encoding]::ASCII)
  Write-Ok "Regenerated .env (API_PORT=$($cfg.API_PORT)) and .htaccess; retarred"
}

# ---------------------------------------------------------------------------
# SFTP / SSH helpers
# ---------------------------------------------------------------------------
function New-SftpSessionFor {
  param([string]$Address, [int]$Port, [string]$User, [string]$Pass)
  $secure = ConvertTo-SecureString $Pass -AsPlainText -Force
  $cred   = New-Object System.Management.Automation.PSCredential($User, $secure)
  return New-SFTPSession -ComputerName $Address -Port $Port -Credential $cred -AcceptKey -ErrorAction Stop
}
function New-SshSessionFor {
  param([string]$Address, [int]$Port, [string]$User, [string]$Pass)
  $secure = ConvertTo-SecureString $Pass -AsPlainText -Force
  $cred   = New-Object System.Management.Automation.PSCredential($User, $secure)
  return New-SSHSession -ComputerName $Address -Port $Port -Credential $cred -AcceptKey -ErrorAction Stop
}
function Confirm-RemoteDir {
  param($SessionId, $Path)
  if (-not (Test-SFTPPath -SessionId $SessionId -Path $Path)) {
    New-SFTPItem -SessionId $SessionId -Path $Path -ItemType Directory | Out-Null
  }
}
function Send-Tree {
  param(
    [Parameter(Mandatory)] $SessionId,
    [Parameter(Mandatory)] [string] $LocalRoot,
    [Parameter(Mandatory)] [string] $RemoteRoot
  )
  $LocalRoot = (Resolve-Path $LocalRoot).Path
  Confirm-RemoteDir -SessionId $SessionId -Path $RemoteRoot

  $allDirs  = Get-ChildItem -Path $LocalRoot -Recurse -Directory
  $allFiles = Get-ChildItem -Path $LocalRoot -Recurse -File

  foreach ($dir in $allDirs) {
    $rel = $dir.FullName.Substring($LocalRoot.Length).TrimStart('\','/').Replace('\','/')
    Confirm-RemoteDir -SessionId $SessionId -Path "$RemoteRoot/$rel"
  }

  $total   = $allFiles.Count
  $i       = 0
  $skipped = 0
  foreach ($file in $allFiles) {
    $i++
    # Windows Defender sometimes quarantines hashed JS chunks mid-deploy, so a
    # file that existed at enumeration may not exist when we get to it. Don't
    # fail the whole deploy for one chunk -- log it and move on. Angular's
    # build always emits a fresh set of hashes, so a missing one just means
    # the browser won't load that lazy route until the next deploy.
    if (-not (Test-Path -LiteralPath $file.FullName)) {
      $skipped++
      Write-Warn2 "skipping (vanished): $($file.FullName.Substring($LocalRoot.Length))"
      continue
    }
    $rel       = $file.FullName.Substring($LocalRoot.Length).TrimStart('\','/').Replace('\','/')
    $remoteDir = if ($rel.Contains('/')) {
      "$RemoteRoot/$([System.IO.Path]::GetDirectoryName($rel).Replace('\','/'))"
    } else {
      $RemoteRoot
    }
    Confirm-RemoteDir -SessionId $SessionId -Path $remoteDir
    try {
      Set-SFTPItem -SessionId $SessionId -Path $file.FullName -Destination $remoteDir -Force -ErrorAction Stop | Out-Null
    } catch [System.IO.FileNotFoundException] {
      $skipped++
      Write-Warn2 "skipping (vanished mid-upload): $rel"
      continue
    }
    if ($i % 25 -eq 0 -or $i -eq $total) {
      Write-Info "uploaded $i/$total"
    }
  }
  if ($skipped -gt 0) {
    Write-Warn2 "$skipped file(s) skipped due to Defender / file-watcher races. Re-run deploy if anything looks off."
  }
}

# ---------------------------------------------------------------------------
# 5. Upload frontend
# ---------------------------------------------------------------------------
if (-not $SkipFrontend) {
  Write-Step 5 7 "Uploading frontend to $($cfg.FRONTEND_SFTP_HOST):$($cfg.FRONTEND_REMOTE_PATH)"
  if ($DryRun) {
    Write-Warn2 "DryRun set: skipping SFTP upload."
  } else {
    $sftp = New-SftpSessionFor `
      -Address $cfg.FRONTEND_SFTP_HOST `
      -Port    ([int]$cfg.FRONTEND_SFTP_PORT) `
      -User    $cfg.FRONTEND_SFTP_USER `
      -Pass    $cfg.FRONTEND_SFTP_PASS
    try {
      Send-Tree -SessionId $sftp.SessionId -LocalRoot $frontendBuild -RemoteRoot $cfg.FRONTEND_REMOTE_PATH
    } finally {
      Remove-SFTPSession -SessionId $sftp.SessionId | Out-Null
    }
    Write-Ok "Frontend uploaded"

    # -----------------------------------------------------------------------
    # Prune stale hashed bundles left over from earlier deploys.
    # Angular builds emit hashed filenames (main-XXXX.js, polyfills-XXXX.js,
    # styles-XXXX.css, chunk-XXXX.js); SFTP-uploading a new build doesn't
    # remove the old ones, so the webroot grows unbounded over time.
    # We open an SSH session, read the just-uploaded index.html to discover
    # which hashed files the current build references, and delete any
    # matching-pattern files in FRONTEND_REMOTE_PATH that are NOT referenced
    # AND are older than 1 day (mtime +1). Fails soft - a bad regex or a
    # transient SSH error must not break the deploy.
    # -----------------------------------------------------------------------
    try {
      Write-Info "Pruning stale hashed bundles on frontend host..."
      $pruneSsh = New-SshSessionFor `
        -Address $cfg.FRONTEND_SFTP_HOST `
        -Port    ([int]$cfg.FRONTEND_SFTP_PORT) `
        -User    $cfg.FRONTEND_SFTP_USER `
        -Pass    $cfg.FRONTEND_SFTP_PASS
      try {
        $webroot = $cfg.FRONTEND_REMOTE_PATH
        # Single-quote the sh -c body so PowerShell doesn't interpolate $().
        # Logic:
        #   1. grep index.html for hashed bundle filenames the live page needs.
        #   2. Build a sorted unique whitelist of those basenames.
        #   3. Walk the webroot (maxdepth 1) for files matching the hashed
        #      pattern, mtime > 1 day, and delete any whose basename is not
        #      in the whitelist. Count + log how many we removed.
        $pruneScript = @'
set -u
WEBROOT="__WEBROOT__"
INDEX="$WEBROOT/index.html"
if [ ! -f "$INDEX" ]; then
  echo "PRUNE_SKIP: index.html missing at $INDEX"
  exit 0
fi
# Hashed-bundle pattern: <name>-<hash>.<ext> where ext is js|css and name
# is one of main|polyfills|styles|chunk|runtime|scripts (Angular emits any
# of these). Hash is at least 8 chars of [a-zA-Z0-9].
PATTERN='(main|polyfills|styles|chunk|runtime|scripts)-[A-Za-z0-9]{8,}\.(js|css)'
WHITELIST=$(grep -oE "$PATTERN" "$INDEX" | sort -u)
if [ -z "$WHITELIST" ]; then
  echo "PRUNE_SKIP: no hashed bundle refs found in index.html"
  exit 0
fi
# Build a tmp whitelist file so we can grep -F against it.
WLFILE=$(mktemp)
printf '%s\n' "$WHITELIST" > "$WLFILE"
PRUNED=0
# -maxdepth 1: only top-level webroot files; Angular emits flat dist.
# -mtime +1: strictly older than 24h, so a build we just uploaded that
# happens to be unreferenced (shouldn't happen, but guard against clock skew)
# survives one deploy cycle.
while IFS= read -r f; do
  base=$(basename "$f")
  if ! grep -Fxq "$base" "$WLFILE"; then
    rm -f -- "$f" && PRUNED=$((PRUNED+1))
  fi
done < <(find "$WEBROOT" -maxdepth 1 -type f -mtime +1 -regextype posix-extended -regex ".*/${PATTERN}$" 2>/dev/null)
rm -f "$WLFILE"
echo "PRUNE_OK: removed $PRUNED stale bundle file(s) from $WEBROOT"
'@
        $pruneScript = $pruneScript.Replace('__WEBROOT__', $webroot)
        # Heredoc-style: pipe the script into `bash -s` so we don't have to
        # worry about quoting hell on the command line.
        $b64 = [System.Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($pruneScript))
        $pruneCmd = "echo $b64 | base64 -d | bash -s"
        $res = Invoke-SSHCommand -SessionId $pruneSsh.SessionId -Command $pruneCmd -TimeOut 60
        $out = ($res.Output -join "`n")
        if ($res.ExitStatus -ne 0) {
          Write-Warn2 "Stale-bundle prune exited $($res.ExitStatus); skipping. Output: $out"
        } else {
          $out -split "`n" | Where-Object { $_ -match '^PRUNE_' } | ForEach-Object { Write-Info $_ }
          if ($out -notmatch 'PRUNE_(OK|SKIP)') {
            Write-Warn2 "Stale-bundle prune produced no PRUNE_ marker; output: $out"
          }
        }
      } finally {
        Remove-SSHSession -SessionId $pruneSsh.SessionId | Out-Null
      }
    } catch {
      Write-Warn2 "Stale-bundle prune failed: $($_.Exception.Message). Continuing deploy."
    }
  }
} else {
  Write-Step 5 7 "Frontend upload skipped (-SkipFrontend)"
}

# ---------------------------------------------------------------------------
# 6. Upload backend tarball + API .htaccess, then SSH extract + prisma + pm2 reload
# ---------------------------------------------------------------------------
if (-not $SkipBackend) {
  Write-Step 6 7 "Uploading backend to $($cfg.API_SFTP_HOST):$($cfg.API_REMOTE_PATH)"
  $backendTarball  = Join-Path $scriptRoot '.deploy\backend-deploy.tar.gz'
  $apiWebrootStage = Join-Path $scriptRoot '.deploy\api-webroot'
  if (-not (Test-Path $backendTarball)) { throw "Backend tarball not found at $backendTarball. Re-run without -SkipBuild." }
  if (-not $SkipApiHtaccess -and -not (Test-Path (Join-Path $apiWebrootStage '.htaccess'))) {
    throw "Reverse-proxy .htaccess not staged at $apiWebrootStage. Re-run without -SkipBuild, or pass -SkipApiHtaccess."
  }

  if ($DryRun) {
    Write-Warn2 "DryRun set: skipping SFTP upload."
  } else {
    Write-Info "Uploading backend tarball ($([Math]::Round((Get-Item $backendTarball).Length / 1MB, 1)) MB)..."
    $sftp = New-SftpSessionFor `
      -Address $cfg.API_SFTP_HOST `
      -Port    ([int]$cfg.API_SFTP_PORT) `
      -User    $cfg.API_SFTP_USER `
      -Pass    $cfg.API_SFTP_PASS
    try {
      Confirm-RemoteDir -SessionId $sftp.SessionId -Path $cfg.API_REMOTE_PATH
      Set-SFTPItem -SessionId $sftp.SessionId `
        -Path $backendTarball `
        -Destination $cfg.API_REMOTE_PATH `
        -Force -ErrorAction Stop | Out-Null

      if ($SkipApiHtaccess) {
        Write-Info "Skipping API .htaccess upload (-SkipApiHtaccess) - vhost-level ProxyPass assumed."
      } else {
        Confirm-RemoteDir -SessionId $sftp.SessionId -Path $cfg.API_WEB_ROOT
        Set-SFTPItem -SessionId $sftp.SessionId `
          -Path (Join-Path $apiWebrootStage '.htaccess') `
          -Destination $cfg.API_WEB_ROOT `
          -Force -ErrorAction Stop | Out-Null
        Write-Info "Uploaded reverse-proxy .htaccess to $($cfg.API_WEB_ROOT)"
      }
    } finally {
      Remove-SFTPSession -SessionId $sftp.SessionId | Out-Null
    }
    Write-Ok "Backend tarball + API .htaccess uploaded"
  }

  if (-not $DryRun) {
    Write-Info "Opening SSH session to extract + (re)start PM2..."
    $ssh = New-SshSessionFor `
      -Address $cfg.API_SFTP_HOST `
      -Port    ([int]$cfg.API_SFTP_PORT) `
      -User    $cfg.API_SFTP_USER `
      -Pass    $cfg.API_SFTP_PASS
    try {
      $remote   = $cfg.API_REMOTE_PATH
      $procName = $cfg.PM2_PROCESS_NAME
      $tarName  = 'backend-deploy.tar.gz'

      Write-Info "Extracting tarball on the server..."
      # chown -R guards against root-owned files lingering from earlier manual
      # recovery extracts; tar as madproducts can't overwrite those (exit 2).
      # The chown runs via sudo if available, else falls through silently.
      $extractCmd = "cd '$remote' && tar -xzf '$tarName' && rm -f '$tarName' && (sudo chown -R `$(whoami):`$(id -gn) '$remote' 2>/dev/null || true) && echo EXTRACT_OK"
      $res = Invoke-SSHCommand -SessionId $ssh.SessionId -Command $extractCmd -TimeOut 180
      $res.Output | ForEach-Object { Write-Info $_ }
      if ($res.ExitStatus -ne 0 -or -not (($res.Output -join "`n") -match 'EXTRACT_OK')) {
        throw "Remote tar extract failed (exit $($res.ExitStatus))"
      }
      Write-Ok "Backend extracted"

      # Install prod deps ON THE SERVER so npm pulls Linux-native binaries
      # for @prisma/engines, argon2, ssh2 (cross-OS bundling fails at runtime).
      # We nuke node_modules + lockfile first so stale files from earlier
      # failed deploys (notably: Windows binaries without exec bit that npm
      # won't re-chmod) can't break us. First deploy takes 1-2 min.
      Write-Info "Cleaning + installing production dependencies on the server..."
      $installCmd = "bash -lc `"cd '$remote' && rm -rf node_modules package-lock.json && npm install --omit=dev --no-audit --no-fund 2>&1`""
      $res = Invoke-SSHCommand -SessionId $ssh.SessionId -Command $installCmd -TimeOut 600
      $res.Output | Select-Object -Last 30 | ForEach-Object { Write-Info $_ }
      if ($res.ExitStatus -ne 0) { throw "Server npm install failed (exit $($res.ExitStatus))" }
      Write-Ok "Server-side dependencies installed"

      # Generate the Prisma client against the Linux-native engine.
      Write-Info "Running prisma generate on the server..."
      $genCmd = "bash -lc `"cd '$remote' && npx prisma generate --schema=database/prisma/schema.prisma`""
      $res = Invoke-SSHCommand -SessionId $ssh.SessionId -Command $genCmd -TimeOut 180
      $res.Output | ForEach-Object { Write-Info $_ }
      if ($res.ExitStatus -ne 0) { throw "prisma generate failed (exit $($res.ExitStatus))" }
      Write-Ok "Prisma client generated for Linux engine"

      if (-not $SkipDbPush) {
        Write-Info "Syncing schema (prisma db push)..."
        $pushCmd = "bash -lc `"cd '$remote' && npx prisma db push --schema=database/prisma/schema.prisma --accept-data-loss`""
        $res = Invoke-SSHCommand -SessionId $ssh.SessionId -Command $pushCmd -TimeOut 300
        $res.Output | ForEach-Object { Write-Info $_ }
        if ($res.ExitStatus -ne 0) { throw "prisma db push failed (exit $($res.ExitStatus))" }
        Write-Ok "Schema in sync with remote MySQL"
      } else {
        Write-Info "Skipping prisma db push (-SkipDbPush)."
      }

      if ($Seed) {
        Write-Info "Seeding production database (plans, integrations, AI prompts, super admin)..."
        # The seed file ships as TypeScript; we run it via npx tsx so we don't
        # need to maintain a separate compiled seed.js.
        $seedCmd = "bash -lc `"cd '$remote' && npx tsx database/prisma/seed.ts 2>&1`""
        $res = Invoke-SSHCommand -SessionId $ssh.SessionId -Command $seedCmd -TimeOut 300
        $res.Output | ForEach-Object { Write-Info $_ }
        if ($res.ExitStatus -ne 0) { throw "Seed failed (exit $($res.ExitStatus))" }
        Write-Ok "Seed complete"
      }

      # Idempotent PM2 (re)start: reload if it exists, otherwise start fresh.
      Write-Info "Reloading PM2 process '$procName' (idempotent)..."
      $pm2Cmd = "bash -lc `"if pm2 describe '$procName' > /dev/null 2>&1; then pm2 reload '$procName' --update-env; else pm2 start '$remote/app.js' --name '$procName' --cwd '$remote' --time; fi && pm2 save`""
      $res = Invoke-SSHCommand -SessionId $ssh.SessionId -Command $pm2Cmd -TimeOut 120
      $res.Output | ForEach-Object { Write-Info $_ }
      if ($res.ExitStatus -ne 0) {
        throw "PM2 reload/start failed (exit $($res.ExitStatus)). Check 'pm2 logs $procName' on the server."
      }
      Write-Ok "PM2 process '$procName' is running"
    } finally {
      Remove-SSHSession -SessionId $ssh.SessionId | Out-Null
    }
  }
} else {
  Write-Step 6 7 "Backend upload skipped (-SkipBackend)"
}

# ---------------------------------------------------------------------------
# 7. Verify
# ---------------------------------------------------------------------------
Write-Step 7 7 "Verifying public endpoints"

if ($DryRun) {
  Write-Warn2 "DryRun: skipping HTTP verification."
} else {
  $checks = @()
  if (-not $SkipFrontend) { $checks += @{ name='Frontend'; url=$cfg.FRONTEND_PUBLIC_URL;             expected=@(200) } }
  if (-not $SkipBackend)  { $checks += @{ name='API';      url="$($cfg.API_PUBLIC_URL)/v1/health";   expected=@(200) } }

  if (-not $SkipBackend) {
    Write-Info "Waiting 4s for PM2 + Apache to settle..."
    Start-Sleep -Seconds 4
  }

  foreach ($c in $checks) {
    $code = 0
    try {
      $res = Invoke-WebRequest -Uri $c.url -Method Head -UseBasicParsing -TimeoutSec 20
      $code = $res.StatusCode
    } catch {
      if ($_.Exception.Response) { $code = [int]$_.Exception.Response.StatusCode }
    }
    if ($code -eq 0) {
      Write-Warn2 "$($c.name) at $($c.url) is unreachable"
    } elseif ($c.expected -contains $code) {
      Write-Ok "$($c.name) at $($c.url)  [HTTP $code]"
    } else {
      Write-Warn2 "$($c.name) at $($c.url)  [HTTP $code, expected $($c.expected -join ',')]"
    }
  }
}

Write-Host ""
Write-Host "Deploy finished." -ForegroundColor Green
Write-Host "  Frontend : $($cfg.FRONTEND_PUBLIC_URL)" -ForegroundColor Green
Write-Host "  API      : $($cfg.API_PUBLIC_URL)/v1"  -ForegroundColor Green
if ($Seed) {
  Write-Host ""
  Write-Host "  Default super-admin login:" -ForegroundColor Yellow
  Write-Host "    email    : $($cfg.DEFAULT_USER_EMAIL)"    -ForegroundColor Yellow
  Write-Host "    password : $($cfg.DEFAULT_USER_PASSWORD)" -ForegroundColor Yellow
  Write-Host "  Change this password from /app/settings immediately." -ForegroundColor Yellow
}
