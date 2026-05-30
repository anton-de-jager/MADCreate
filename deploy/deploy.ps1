[CmdletBinding()]
param(
  [switch]$SkipFrontend,
  [switch]$SkipBackend,
  [switch]$SkipBuild,
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$env:DOTNET_CLI_WORKLOAD_UPDATE_NOTIFY_DISABLE = 'true'
$pnpmPackage = 'pnpm@11.2.2'
$scriptRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location $scriptRoot

function Write-Step { param($n, $total, $msg) Write-Host ""; Write-Host "[$n/$total] $msg" -ForegroundColor Cyan }
function Write-Ok { param($msg) Write-Host "  [OK] $msg" -ForegroundColor Green }
function Write-Info { param($msg) Write-Host "  ...  $msg" -ForegroundColor Gray }

function Read-DotEnv([string]$path) {
  $map = @{}
  Get-Content -LiteralPath $path | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith('#')) { return }
    $idx = $line.IndexOf('=')
    if ($idx -lt 1) { return }
    $map[$line.Substring(0, $idx).Trim()] = $line.Substring($idx + 1).Trim()
  }
  return $map
}

function Require-Key($map, [string]$key) {
  if (-not $map.ContainsKey($key) -or [string]::IsNullOrWhiteSpace($map[$key])) {
    throw "Missing required deploy key: $key"
  }
  return $map[$key]
}

function Optional-Key($map, [string]$key, [string]$fallback = '') {
  if ($map.ContainsKey($key) -and -not [string]::IsNullOrWhiteSpace($map[$key])) { return $map[$key] }
  return $fallback
}

function Get-WinScpExe {
  $winscp = Get-Command WinSCP.com,winscp.com.exe,WinSCP.com.exe -ErrorAction SilentlyContinue | Select-Object -First 1
  if (-not $winscp) { throw 'WinSCP.com is required for MADCreate deployment but was not found.' }
  return $winscp.Source
}

function Normalize-RemotePath([string]$path) {
  $trimmed = $path.Trim()
  if (-not $trimmed.StartsWith('/')) { $trimmed = "/$trimmed" }
  return $trimmed.TrimEnd('/')
}

function Publish-RemoteDirectory(
  [string]$source,
  [string]$remotePath,
  [string]$hostName,
  [string]$user,
  [string]$pass,
  [string]$port,
  [string]$protocol = 'sftp'
) {
  $remote = Normalize-RemotePath $remotePath
  $encodedUser = [System.Uri]::EscapeDataString($user)
  $encodedPass = [System.Uri]::EscapeDataString($pass)
  $sessionUrl = "${protocol}://$encodedUser`:$encodedPass@$hostName`:$port/"
  $hostKey = if ($protocol -eq 'sftp') { ' -hostkey=*' } else { '' }
  $scriptPath = Join-Path ([System.IO.Path]::GetTempPath()) ("madcreate-winscp-{0}.txt" -f ([Guid]::NewGuid().ToString('N')))
  $commands = @(
    'option batch abort',
    'option confirm off',
    "open `"$sessionUrl`"$hostKey",
    'option transfer binary',
    "synchronize remote -delete -criteria=either `"$source`" `"$remote`"",
    'exit'
  )
  Set-Content -LiteralPath $scriptPath -Value $commands -Encoding ASCII
  try {
    & (Get-WinScpExe) /ini=nul /script=$scriptPath | Out-Host
    if ($LASTEXITCODE -ne 0) { throw "WinSCP failed with exit code $LASTEXITCODE" }
  } finally {
    Remove-Item -LiteralPath $scriptPath -Force -ErrorAction SilentlyContinue
  }
}

function Invoke-Pnpm {
  param([string[]]$Arguments)
  $env:PNPM_HOME = 'C:\Code\.pnpm'
  $env:PNPM_STORE_DIR = 'C:\Code\.pnpm'
  $env:NPM_CONFIG_STORE_DIR = 'C:\Code\.pnpm'
  $env:COREPACK_ENABLE_DOWNLOAD_PROMPT = '0'
  $env:NODE_OPTIONS = '--max-old-space-size=4096'
  $env:CI = 'true'
  $corepack = Get-Command corepack.cmd,corepack -ErrorAction Stop | Select-Object -First 1
  & $corepack.Source $pnpmPackage @Arguments
  if ($LASTEXITCODE -ne 0) { throw "pnpm failed with exit code $LASTEXITCODE" }
}

Write-Step 1 6 'Loading deploy configuration'
$envPath = Join-Path $scriptRoot '.deploy\.env.deploy'
if (-not (Test-Path -LiteralPath $envPath)) { $envPath = Join-Path $scriptRoot '.env.deploy' }
if (-not (Test-Path -LiteralPath $envPath)) { throw 'No deploy environment file found.' }
$cfg = Read-DotEnv $envPath

$frontendUrl = Require-Key $cfg 'FRONTEND_PUBLIC_URL'
$apiUrl = Require-Key $cfg 'API_PUBLIC_URL'
$frontendHost = Require-Key $cfg 'FRONTEND_SFTP_HOST'
$frontendUser = Require-Key $cfg 'FRONTEND_SFTP_USER'
$frontendPass = Require-Key $cfg 'FRONTEND_SFTP_PASS'
$frontendRemote = Require-Key $cfg 'FRONTEND_REMOTE_PATH'
$apiHost = Require-Key $cfg 'API_SFTP_HOST'
$apiUser = Require-Key $cfg 'API_SFTP_USER'
$apiPass = Require-Key $cfg 'API_SFTP_PASS'
$apiRemote = Optional-Key $cfg 'API_WEB_ROOT' (Require-Key $cfg 'API_REMOTE_PATH')
$frontendPort = Optional-Key $cfg 'FRONTEND_SFTP_PORT' '22'
$apiPort = Optional-Key $cfg 'API_SFTP_PORT' '22'
$transferProtocol = Optional-Key $cfg 'TRANSFER_PROTOCOL' 'sftp'
$corsOrigins = Optional-Key $cfg 'CORS_ORIGINS' (Optional-Key $cfg 'PROD_CORS_ORIGINS' (Optional-Key $cfg 'CORS_ORIGIN' $frontendUrl))
Write-Ok "Config loaded. frontend=$frontendUrl api=$apiUrl"

$frontendBuild = Join-Path $scriptRoot 'apps\web\dist\madcreate-web\browser'
$apiPublish = Join-Path $scriptRoot '.deploy\api'

if (-not $SkipFrontend -and -not $SkipBuild) {
  Write-Step 2 6 'Building frontend'
  Invoke-Pnpm @('install', '--frozen-lockfile', '--prefer-offline', '--store-dir', 'C:\Code\.pnpm', '--network-concurrency', '1', '--fetch-retries', '2', '--fetch-timeout', '120000', '--config.confirm-modules-purge=false', '--reporter', 'silent')
  Invoke-Pnpm @('--filter', '@madcreate/shared', 'run', 'build')

  $envTsPath = Join-Path $scriptRoot 'apps\web\src\environments\environment.production.ts'
  $envBackup = Get-Content -LiteralPath $envTsPath -Raw
  try {
    $prodEnv = @"
export const environment = {
  production: true,
  apiBaseUrl: '$apiUrl/v1',
  appName: 'MADCreate',
  publicDomain: '$([System.Uri]::new($frontendUrl).Host)',
  errorReporterToken: '$($cfg.CLAUDE_WORKER_TOKEN)',
};
"@
    [System.IO.File]::WriteAllText($envTsPath, $prodEnv, (New-Object System.Text.UTF8Encoding $false))
    Push-Location (Join-Path $scriptRoot 'apps\web')
    try { Invoke-Pnpm @('run', 'build', '--configuration', 'production', '--progress=false') }
    finally { Pop-Location }
  } finally {
    [System.IO.File]::WriteAllText($envTsPath, $envBackup, (New-Object System.Text.UTF8Encoding $false))
  }

  if (-not (Test-Path -LiteralPath (Join-Path $frontendBuild 'index.html'))) {
    throw "Frontend build output not found at $frontendBuild"
  }

  $htaccess = @'
RewriteEngine On
RewriteBase /
RewriteCond %{REQUEST_FILENAME} -f [OR]
RewriteCond %{REQUEST_FILENAME} -d
RewriteRule ^ - [L]
RewriteRule ^ /index.html [L]
'@
  [System.IO.File]::WriteAllText((Join-Path $frontendBuild '.htaccess'), $htaccess, [System.Text.Encoding]::ASCII)

  # IIS SPA fallback (Plesk hosting): all non-file requests rewrite to index.html.
  $feWebConfig = @'
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="SPA Routes" stopProcessing="true">
          <match url=".*" />
          <conditions logicalGrouping="MatchAll">
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
            <add input="{REQUEST_URI}" pattern="^/api" negate="true" />
          </conditions>
          <action type="Rewrite" url="/index.html" />
        </rule>
      </rules>
    </rewrite>
    <staticContent>
      <remove fileExtension=".webmanifest" />
      <mimeMap fileExtension=".webmanifest" mimeType="application/manifest+json" />
    </staticContent>
  </system.webServer>
</configuration>
'@
  [System.IO.File]::WriteAllText((Join-Path $frontendBuild 'web.config'), $feWebConfig, (New-Object System.Text.UTF8Encoding $false))
  Write-Ok "Frontend built at $frontendBuild"
} elseif (-not $SkipFrontend) {
  Write-Step 2 6 'Frontend build skipped'
}

if (-not $SkipBackend -and -not $SkipBuild) {
  Write-Step 3 6 'Publishing .NET Core API'
  if (Test-Path -LiteralPath $apiPublish) { Remove-Item -LiteralPath $apiPublish -Recurse -Force }
  dotnet publish (Join-Path $scriptRoot 'apps\api\MADCreate.Api.csproj') -c Release -o $apiPublish --nologo
  if ($LASTEXITCODE -ne 0) { throw "dotnet publish failed with exit code $LASTEXITCODE" }

  $defaultUserEmail = Optional-Key $cfg 'DEFAULT_USER_EMAIL' 'admin@madprospects.com'
  $defaultUserPassword = Optional-Key $cfg 'DEFAULT_USER_PASSWORD' 'P@szw0rdMP'

  $preformedConnection = Optional-Key $cfg 'ConnectionStrings__Default' ''
  if (-not [string]::IsNullOrWhiteSpace($preformedConnection)) {
    $connectionString = $preformedConnection
  } else {
    $dbHost = Require-Key $cfg 'DB_HOST'
    $dbPort = Optional-Key $cfg 'DB_PORT' '1433'
    $dbDatabase = Require-Key $cfg 'DB_DATABASE'
    $dbUser = Optional-Key $cfg 'DB_USERNAME' (Optional-Key $cfg 'DB_USER' '')
    if ([string]::IsNullOrWhiteSpace($dbUser)) { throw 'Missing required deploy key: DB_USERNAME (or DB_USER)' }
    $dbPassword = Optional-Key $cfg 'DB_PASSWORD' (Optional-Key $cfg 'DB_PASS' '')
    if ([string]::IsNullOrWhiteSpace($dbPassword)) { throw 'Missing required deploy key: DB_PASSWORD (or DB_PASS)' }
    if ($dbHost -match ',') { $serverAddress = $dbHost } else { $serverAddress = "$dbHost,$dbPort" }
    $connectionString = "Server=$serverAddress;Database=$dbDatabase;User Id=$dbUser;Password=$dbPassword;TrustServerCertificate=True;MultipleActiveResultSets=True"
  }

  $webConfig = @"
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <location path="." inheritInChildApplications="false">
    <system.webServer>
      <handlers>
        <add name="aspNetCore" path="*" verb="*" modules="AspNetCoreModuleV2" resourceType="Unspecified" />
      </handlers>
      <aspNetCore processPath="dotnet" arguments=".\MADCreate.Api.dll" stdoutLogEnabled="false" hostingModel="inprocess">
        <environmentVariables>
          <environmentVariable name="ASPNETCORE_ENVIRONMENT" value="Production" />
          <environmentVariable name="Cors__Origins" value="$corsOrigins" />
          <environmentVariable name="DefaultUser__Email" value="$defaultUserEmail" />
          <environmentVariable name="DefaultUser__Password" value="$defaultUserPassword" />
          <environmentVariable name="ConnectionStrings__Default" value="$connectionString" />
        </environmentVariables>
      </aspNetCore>
    </system.webServer>
  </location>
</configuration>
"@
  [System.IO.File]::WriteAllText((Join-Path $apiPublish 'web.config'), $webConfig, (New-Object System.Text.UTF8Encoding $false))
  Write-Ok "API published at $apiPublish"
} elseif (-not $SkipBackend) {
  Write-Step 3 6 'API publish skipped'
}

if (-not $SkipFrontend) {
  Write-Step 4 6 "Uploading frontend to $frontendRemote"
  if (-not $DryRun) { Publish-RemoteDirectory $frontendBuild $frontendRemote $frontendHost $frontendUser $frontendPass $frontendPort $transferProtocol }
  Write-Ok 'Frontend uploaded'
} else {
  Write-Step 4 6 'Frontend upload skipped'
}

if (-not $SkipBackend) {
  Write-Step 5 6 "Uploading .NET Core API to $apiRemote"
  if (-not $DryRun) { Publish-RemoteDirectory $apiPublish $apiRemote $apiHost $apiUser $apiPass $apiPort $transferProtocol }
  Write-Ok 'API uploaded'
} else {
  Write-Step 5 6 'API upload skipped'
}

Write-Step 6 6 'Verifying public endpoints'
if (-not $DryRun) {
  $checks = @()
  if (-not $SkipFrontend) { $checks += @{ name='Frontend'; url=$frontendUrl } }
  if (-not $SkipBackend) { $checks += @{ name='API'; url="$apiUrl/v1/health" } }
  foreach ($c in $checks) {
    $res = Invoke-WebRequest -Uri $c.url -UseBasicParsing -TimeoutSec 30
    if ($res.StatusCode -lt 200 -or $res.StatusCode -gt 299) {
      throw "$($c.name) verification failed: HTTP $($res.StatusCode)"
    }
    Write-Ok "$($c.name) verified at $($c.url) [HTTP $($res.StatusCode)]"
  }
}

Write-Host ''
Write-Host 'Deploy finished.' -ForegroundColor Green
Write-Host "  Frontend : $frontendUrl" -ForegroundColor Green
Write-Host "  API      : $apiUrl/v1" -ForegroundColor Green
