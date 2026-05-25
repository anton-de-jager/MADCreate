<#
.SYNOPSIS
  MADCreate local-development setup. Idempotent - re-run any time.

.DESCRIPTION
  Stands up the four layers from scratch on a fresh box:
    1. Env    - copies .env.example -> .env on first run, fills missing JWT
                secrets with 64-char random strings.
    2. Infra  - `docker compose -f deploy/docker-compose.yml up -d mysql redis`
                (default). With -NoDocker,
                trusts an existing local MySQL + Redis pointed at by .env.
    3. Code   - `pnpm install` at the monorepo root (workspaces pull in
                apps/api, apps/web, packages/shared).
    4. Schema - prisma generate -> prisma db push -> prisma seed.

  Safe to re-run. Existing .env values are preserved.

.PARAMETER Reset
  Destroy docker volumes (or drop the local DB with -NoDocker) before setup.
.PARAMETER NoDocker
  Skip docker compose; trust local MySQL + Redis from .env.
.PARAMETER SkipInfra / SkipInstall / SkipPrisma / SkipSeed
  Opt-out of individual phases.
.PARAMETER StartServers
  Launch `pnpm run dev` in a new PowerShell window after setup.
.PARAMETER Yes
  Non-interactive - assume yes on destructive confirmations.
.PARAMETER JwtSecret / JwtRefreshSecret
  Override secrets in .env. Omit to auto-generate on first run.

.EXAMPLE
  .\scripts\setup.ps1
.EXAMPLE
  .\scripts\setup.ps1 -Reset -StartServers -Yes
.EXAMPLE
  .\scripts\setup.ps1 -NoDocker -SkipInfra
#>
param(
  [switch]$Reset,
  [switch]$NoDocker,
  [switch]$SkipInfra,
  [switch]$SkipInstall,
  [switch]$SkipPrisma,
  [switch]$SkipSeed,
  [switch]$StartServers,
  [switch]$Yes,
  [string]$JwtSecret = "",
  [string]$JwtRefreshSecret = ""
)

$ErrorActionPreference = "Stop"
$scriptDir = $PSScriptRoot
if (-not $scriptDir) { $scriptDir = (Get-Location).Path }
$root = (Resolve-Path (Join-Path $scriptDir '..')).Path

function Step([string]$label) {
  Write-Host ""
  Write-Host "==> $label" -ForegroundColor Cyan
}
function Info([string]$msg) { Write-Host "    $msg" -ForegroundColor Gray }
function Ok([string]$msg)   { Write-Host "    $msg" -ForegroundColor Green }
function Warn([string]$msg) { Write-Host "    $msg" -ForegroundColor Yellow }
function Die([string]$msg)  { Write-Host "    $msg" -ForegroundColor Red; exit 1 }

function New-RandomString([int]$len) {
  $bytes = New-Object byte[] $len
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  $b64 = [Convert]::ToBase64String($bytes)
  $clean = $b64 -replace '[+/=]', ''
  return $clean.Substring(0, [Math]::Min($len, $clean.Length))
}

function Confirm-Or-Exit([string]$question) {
  if ($Yes) { return }
  $ans = Read-Host "$question [y/N]"
  if ($ans -notmatch '^(y|yes)$') { Die "Aborted by user." }
}

function Get-EnvValue([string[]]$lines, [string]$key) {
  foreach ($l in $lines) {
    if ($l -match "^\s*$key\s*=\s*(.*)$") { return $Matches[1] }
  }
  return $null
}
function Update-EnvLine([string[]]$lines, [string]$key, [string]$value) {
  $found = $false
  $new = $lines | ForEach-Object {
    if ($_ -match "^\s*$key\s*=") { $found = $true; "$key=$value" } else { $_ }
  }
  if (-not $found) { $new += "$key=$value" }
  return ,$new
}

Write-Host "MADCreate setup" -ForegroundColor White -BackgroundColor DarkBlue
Write-Host "Project root: $root" -ForegroundColor DarkGray

# ---------------------------------------------------------------------------
# 0. Prerequisites
# ---------------------------------------------------------------------------
Step "Checking prerequisites"
foreach ($cmd in @("node", "pnpm")) {
  $found = Get-Command $cmd -ErrorAction SilentlyContinue
  if (-not $found) { Die "$cmd not found on PATH. Install Node.js 20.11+ and re-run." }
  Info ("$cmd -> " + $found.Source)
}
$nodeMajor = (& node -e "process.stdout.write(process.versions.node.split('.')[0])")
if ([int]$nodeMajor -lt 20) { Die "Node $nodeMajor detected; package.json requires >= 20.11. Upgrade Node and re-run." }

if (-not $NoDocker -and -not $SkipInfra) {
  $docker = Get-Command docker -ErrorAction SilentlyContinue
  if (-not $docker) {
    Warn "docker not on PATH. Re-run with -NoDocker if you intend to use a local MySQL + Redis, or install Docker Desktop."
    Die "Refusing to continue without docker (or -NoDocker)."
  }
  Info ("docker -> " + $docker.Source)
}

# ---------------------------------------------------------------------------
# 1. .env - copy from example on first run, fill secrets if placeholder.
# ---------------------------------------------------------------------------
Step "Environment file"
$envPath    = Join-Path $root ".env"
$envExample = Join-Path $root ".env.example"

if (-not (Test-Path $envPath)) {
  if (-not (Test-Path $envExample)) { Die "No .env and no .env.example to copy from." }
  Copy-Item $envExample $envPath
  Info "Created .env from .env.example."
}

$envLines = Get-Content $envPath

$currentJwt = Get-EnvValue $envLines "JWT_SECRET"
$needJwt = (-not $currentJwt) -or ($currentJwt -match "^replace_me") -or ($currentJwt -match "^dev_")
if ($JwtSecret) {
  $envLines = Update-EnvLine $envLines "JWT_SECRET" $JwtSecret
  Info "JWT_SECRET set from -JwtSecret."
} elseif ($needJwt) {
  $envLines = Update-EnvLine $envLines "JWT_SECRET" (New-RandomString 64)
  Ok "JWT_SECRET generated (64 chars)."
}

$currentRefresh = Get-EnvValue $envLines "JWT_REFRESH_SECRET"
$needRefresh = (-not $currentRefresh) -or ($currentRefresh -match "^replace_me") -or ($currentRefresh -match "^dev_")
if ($JwtRefreshSecret) {
  $envLines = Update-EnvLine $envLines "JWT_REFRESH_SECRET" $JwtRefreshSecret
  Info "JWT_REFRESH_SECRET set from -JwtRefreshSecret."
} elseif ($needRefresh) {
  $envLines = Update-EnvLine $envLines "JWT_REFRESH_SECRET" (New-RandomString 64)
  Ok "JWT_REFRESH_SECRET generated (64 chars)."
}

Set-Content -Path $envPath -Value $envLines -Encoding UTF8
Info ".env is up to date."

$envLines = Get-Content $envPath
$databaseUrl  = Get-EnvValue $envLines "DATABASE_URL"
$mysqlRootPwd = Get-EnvValue $envLines "MYSQL_ROOT_PASSWORD"
$mysqlDb      = (Get-EnvValue $envLines "MYSQL_DATABASE") ; if (-not $mysqlDb) { $mysqlDb = "madcreate" }
$mysqlUser    = (Get-EnvValue $envLines "MYSQL_USER")     ; if (-not $mysqlUser) { $mysqlUser = "madcreate" }

# ---------------------------------------------------------------------------
# 2. Infrastructure (MySQL + Redis)
# ---------------------------------------------------------------------------
if (-not $SkipInfra) {
  if ($NoDocker) {
    Step "Infrastructure - using local MySQL + Redis (-NoDocker)"
    Info "Trusting DATABASE_URL + REDIS_URL from .env."
    if ($Reset) {
      Confirm-Or-Exit "Drop and recreate the '$mysqlDb' database via root? Destroys all local MADCreate data."
      $mysql = Get-Command mysql -ErrorAction SilentlyContinue
      if (-not $mysql) { Die "mysql client not on PATH - cannot reset without docker. Add MySQL bin to PATH or omit -Reset." }
      $bt = [char]96
      $sql = "DROP DATABASE IF EXISTS ${bt}${mysqlDb}${bt}; CREATE DATABASE ${bt}${mysqlDb}${bt} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
      $mysqlArgs = @("-h", "localhost", "-u", "root")
      if ($mysqlRootPwd) { $mysqlArgs += "-p$mysqlRootPwd" }
      $sql | & mysql @mysqlArgs
      if ($LASTEXITCODE -ne 0) { Die "mysql reset failed (exit $LASTEXITCODE). Check MYSQL_ROOT_PASSWORD." }
      Ok "Database '$mysqlDb' reset."
    }
  } else {
    Step "Infrastructure - docker compose (mysql + redis)"
    if ($Reset) {
      Confirm-Or-Exit "Tear down the madcreate docker stack AND DELETE its data volumes. Continue?"
      Info "docker compose -f deploy/docker-compose.yml down -v"
      Push-Location $root
      try {
        & docker compose -f deploy/docker-compose.yml down -v
        if ($LASTEXITCODE -ne 0) { Warn "docker compose down returned $LASTEXITCODE (safe to ignore if stack wasn't up)." }
      } finally { Pop-Location }
    }
    Push-Location $root
    try {
      Info "docker compose -f deploy/docker-compose.yml up -d mysql redis"
      & docker compose -f deploy/docker-compose.yml up -d mysql redis
      if ($LASTEXITCODE -ne 0) { Die "docker compose up failed." }
    } finally { Pop-Location }

    Info "Waiting for MySQL to report healthy (up to 60s)..."
    $deadline = (Get-Date).AddSeconds(60)
    $status = $null
    while ((Get-Date) -lt $deadline) {
      $status = & docker inspect --format '{{.State.Health.Status}}' madcreate-mysql 2>$null
      if ($status -eq "healthy") { Ok "MySQL is healthy."; break }
      Start-Sleep -Seconds 2
    }
    if ($status -ne "healthy") { Warn "MySQL did not report healthy within 60s - continuing anyway, prisma may retry." }
  }
}

# ---------------------------------------------------------------------------
# 3. Install monorepo dependencies (workspaces)
# ---------------------------------------------------------------------------
if (-not $SkipInstall) {
  Step "pnpm install (monorepo root - workspaces)"
  Push-Location $root
  try {
    & pnpm install --frozen-lockfile
    if ($LASTEXITCODE -ne 0) { Die "pnpm install failed." }
    Ok "All workspace deps installed."
  } finally { Pop-Location }
}

# ---------------------------------------------------------------------------
# 4. Prisma - generate client, push schema, seed.
# ---------------------------------------------------------------------------
if (-not $SkipPrisma) {
  Step "Prisma - generate + push schema"
  Push-Location $root
  try {
    Info "prisma generate"
    & pnpm run prisma:generate
    if ($LASTEXITCODE -ne 0) { Die "prisma generate failed." }

    Info "prisma db push (sync schema -> database)"
    & pnpm run prisma:push -- --accept-data-loss
    if ($LASTEXITCODE -ne 0) { Die "prisma db push failed. Check DATABASE_URL in .env." }
    Ok "Schema in sync."
  } finally { Pop-Location }

  if (-not $SkipSeed) {
    Step "Prisma - seed"
    Push-Location $root
    try {
      & pnpm run prisma:seed
      if ($LASTEXITCODE -ne 0) { Die "prisma seed failed." }
      Ok "Seed applied (super admin + plans + AI prompts + demo workspace)."
    } finally { Pop-Location }
  } else { Info "Skipping seed (-SkipSeed)." }
}

# ---------------------------------------------------------------------------
# 5. Done
# ---------------------------------------------------------------------------
Step "Setup complete"
Write-Host ""
Write-Host "  Super-admin login (from seed)" -ForegroundColor White
Write-Host "    email:    admin@madcreate.local" -ForegroundColor Gray
Write-Host "    password: ChangeMeNow!23   (change immediately after first login)" -ForegroundColor Gray
Write-Host ""
Write-Host "  Run the app:" -ForegroundColor White
Write-Host "    pnpm run dev           # api on :4213/v1, web on :3013" -ForegroundColor Gray
Write-Host ""
Write-Host "  Other handy commands:" -ForegroundColor White
Write-Host "    pnpm run prisma:studio # browse the database in the browser" -ForegroundColor Gray
Write-Host "    pnpm run docker:logs   # tail mysql + redis logs" -ForegroundColor Gray
Write-Host "    pnpm run docker:down   # stop the stack (keeps data)" -ForegroundColor Gray

if ($StartServers) {
  Step "Launching dev servers in a new window"
  $cmd = "Set-Location '$root'; pnpm run dev"
  Start-Process powershell -ArgumentList @("-NoExit", "-Command", $cmd)
  Ok "Dev servers starting - watch the new PowerShell window."
}
