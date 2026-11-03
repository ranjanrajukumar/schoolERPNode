<#
.SYNOPSIS
  Installs the School ERP API as a Windows service that starts with the machine and restarts itself if it stops.

.DESCRIPTION
  Uses NSSM (the Non-Sucking Service Manager) to run `node src\index.js` from the server folder as a service. NSSM is NOT downloaded
  by this script: get nssm.exe yourself from https://nssm.cc, check it, and pass its path with -Nssm.

  The service runs as its own low-privilege "virtual account" (NT SERVICE\<name>), which can read the program and write only to the
  data folder (logs, generated reports, uploads, backups). Secrets stay in server\.env; this script reads that file only to check
  them, and never prints a value.

  Run with -DryRun first: it checks everything and prints what it would do, and changes nothing.

.EXAMPLE
  .\install-service.ps1 -Root D:\SchoolErp -Nssm C:\Tools\nssm\win64\nssm.exe -DryRun
  .\install-service.ps1 -Root D:\SchoolErp -Nssm C:\Tools\nssm\win64\nssm.exe
#>
[CmdletBinding()]
param(
  # The folder that contains server\ (the repository, or an unpacked release)
  [Parameter(Mandatory)] [string] $Root,
  # Full path to nssm.exe
  [Parameter(Mandatory)] [string] $Nssm,
  # node.exe; by default the one on the PATH
  [string] $Node,
  # Logs, generated reports, uploads and backups live here, outside the program folder
  [string] $DataDir = 'D:\SchoolErpData',
  [ValidateRange(1, 65535)] [int] $Port = 4000,
  [string] $ServiceName = 'SchoolErpApi',
  # Report and checks only: change nothing
  [switch] $DryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Step([string] $What, [scriptblock] $Do) {
  if ($DryRun) { Write-Host "  [dry run] $What" -ForegroundColor DarkGray } else { Write-Host "  $What"; & $Do }
}
function Fail([string] $Message) { throw "STOP: $Message" }

Write-Host "School ERP service installer$(if ($DryRun) { ' (DRY RUN: nothing will be changed)' })" -ForegroundColor Cyan

# ---- 1. what is needed is there -------------------------------------------------------------------------------------------------
if (-not $DryRun) {
  $admin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
  if (-not $admin) { Fail 'Run this in a PowerShell opened with "Run as administrator".' }
}

$server = Join-Path $Root 'server'
if (-not (Test-Path (Join-Path $server 'src\index.js'))) { Fail "No server\src\index.js under '$Root'. -Root must be the folder that contains server\." }
if (-not (Test-Path (Join-Path $server 'node_modules'))) { Fail "server\node_modules is missing. In '$server' run:  npm ci --omit=dev" }
if (-not (Test-Path $Nssm)) { Fail "nssm.exe was not found at '$Nssm'." }

if (-not $Node) { $Node = (Get-Command node -ErrorAction SilentlyContinue).Source }
if (-not $Node -or -not (Test-Path $Node)) { Fail 'node.exe was not found. Install Node.js 22 or later, or pass -Node.' }
$version = (& $Node --version) -join ''
if ($version -notmatch '^v(\d+)\.') { Fail "Could not read the Node.js version from '$Node' (it said: $version)." }
$major = [int]$Matches[1]
if ($major -lt 22) { Fail "Node.js $major found; this application needs 22 or later." }
Write-Host "  Node.js $major at $Node"

# ---- 2. the settings the application insists on in production --------------------------------------------------------------------
$envFile = Join-Path $server '.env'
if (-not (Test-Path $envFile)) { Fail "server\.env is missing. Copy server\.env.example to server\.env and fill it in." }
$settings = @{}
foreach ($line in Get-Content $envFile) {
  if ($line -match '^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$') { $settings[$Matches[1]] = $Matches[2].Trim('"', "'") }
}
foreach ($key in 'DB_HOST', 'DB_USER', 'DB_NAME', 'JWT_SECRET', 'ADMIN_EMAIL', 'ADMIN_PASSWORD', 'CLIENT_ORIGIN') {
  if (-not $settings.ContainsKey($key) -or -not $settings[$key]) { Fail "server\.env has no value for $key." }
}
if ($settings['JWT_SECRET'].Length -lt 32 -or $settings['JWT_SECRET'] -eq 'change_me') { Fail 'JWT_SECRET must be a private random value of at least 32 characters.' }
if ($settings['ADMIN_PASSWORD'].Length -lt 12 -or $settings['ADMIN_PASSWORD'] -eq 'admin123') { Fail 'ADMIN_PASSWORD must be unique and at least 12 characters.' }
if ($settings['CLIENT_ORIGIN'] -notmatch '^https://') { Write-Warning 'CLIENT_ORIGIN is not an https:// address. Use the address people type in the browser, over HTTPS.' }
Write-Host '  server\.env has the required settings (values not shown)'

# ---- 3. folders and permissions -------------------------------------------------------------------------------------------------
$account = "NT SERVICE\$ServiceName"
foreach ($sub in 'logs', 'reports', 'lms', 'backups') {
  $dir = Join-Path $DataDir $sub
  Step "create $dir" { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
}

# ---- 4. the service -------------------------------------------------------------------------------------------------------------
$existing = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if ($existing) { Fail "A service named '$ServiceName' already exists. Run uninstall-service.ps1 first, or pick another -ServiceName." }

Step "install service '$ServiceName' -> $Node src\index.js (in $server)" {
  & $Nssm install $ServiceName $Node 'src\index.js' | Out-Null
  if ($LASTEXITCODE -ne 0) { Fail 'NSSM could not install the service.' }
}
$logs = Join-Path $DataDir 'logs'
$extra = @(
  'NODE_ENV=production',
  "PORT=$Port",
  'TRUST_PROXY=1', # the app sits behind IIS, so the client address is read from the proxy's header
  "REPORT_TMP_DIR=$(Join-Path $DataDir 'reports')",
  "LMS_STORAGE_DIR=$(Join-Path $DataDir 'lms')",
  "BACKUP_DIR=$(Join-Path $DataDir 'backups')"
)
$set = [ordered]@{
  AppDirectory         = $server
  DisplayName          = 'School ERP API'
  Description          = 'School ERP backend (Node.js). Runs behind IIS, which serves the web app and forwards /api to this service.'
  Start                = 'SERVICE_AUTO_START'
  AppStdout            = Join-Path $logs 'api.out.log'
  AppStderr            = Join-Path $logs 'api.err.log'
  AppRotateFiles       = 1
  AppRotateOnline      = 1
  AppRotateBytes       = 10485760
  AppExit              = 'Default Restart'
  AppRestartDelay      = 5000   # wait 5 s before starting again
  AppThrottle          = 15000  # a start that dies inside 15 s counts as failed, so a broken setting does not spin
  AppStopMethodConsole = 20000  # on stop, ask the app to finish (it closes the database), and wait up to 20 s
}
foreach ($name in $set.Keys) {
  $value = $set[$name]
  Step "nssm set $name" { & $Nssm set $ServiceName $name $value | Out-Null }
}
Step 'nssm set AppEnvironmentExtra (NODE_ENV, PORT, TRUST_PROXY, report, upload and backup folders)' {
  & $Nssm set $ServiceName AppEnvironmentExtra $extra | Out-Null
}
Step 'start automatically after the machine is up (delayed), and restart on failure' {
  & sc.exe config $ServiceName start= delayed-auto | Out-Null
  & sc.exe failure $ServiceName reset= 86400 actions= restart/5000/restart/30000/restart/60000 | Out-Null
}

# ---- 5. a low-privilege account that can read the program and write only the data folder -----------------------------------------
Step "run as the virtual account '$account'" { & sc.exe config $ServiceName obj= $account | Out-Null }
Step "let $account read $Root" { & icacls $Root /grant "${account}:(OI)(CI)RX" /T /C | Out-Null }
Step "let $account change $DataDir" { & icacls $DataDir /grant "${account}:(OI)(CI)M" /T /C | Out-Null }

# ---- 6. start it and wait until it answers --------------------------------------------------------------------------------------
Step "start the service" { Start-Service -Name $ServiceName }
if (-not $DryRun) {
  Write-Host "  waiting for http://127.0.0.1:$Port/api/health (the first start also updates the database, which can take a few minutes)"
  $up = $false
  for ($i = 0; $i -lt 100 -and -not $up; $i++) {
    Start-Sleep -Seconds 3
    try { $up = (Invoke-RestMethod -Uri "http://127.0.0.1:$Port/api/health" -TimeoutSec 5).ok -eq $true } catch { }
  }
  if (-not $up) { Fail "The service did not answer. Read $logs\api.err.log, fix the cause, then restart it:  Restart-Service $ServiceName" }
  Write-Host "  The API is up on port $Port." -ForegroundColor Green
}
Write-Host ''
Write-Host 'Next: put IIS in front of it (docs\WINDOWS_IIS_DEPLOYMENT.md, step 4). Do not open port' $Port 'in the firewall: only IIS on this machine should reach it.'
