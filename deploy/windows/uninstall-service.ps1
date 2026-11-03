<#
.SYNOPSIS
  Stops and removes the School ERP service. The program, its settings (server\.env) and the data folder are left exactly as they are.

.EXAMPLE
  .\uninstall-service.ps1 -Nssm C:\Tools\nssm\win64\nssm.exe
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory)] [string] $Nssm,
  [string] $ServiceName = 'SchoolErpApi',
  [switch] $DryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if (-not $DryRun) {
  $admin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
  if (-not $admin) { throw 'STOP: Run this in a PowerShell opened with "Run as administrator".' }
}
if (-not (Test-Path $Nssm)) { throw "STOP: nssm.exe was not found at '$Nssm'." }

$service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if (-not $service) { Write-Host "There is no service named '$ServiceName'. Nothing to do."; return }

if ($DryRun) {
  Write-Host "[dry run] would stop '$ServiceName' (now $($service.Status)) and remove it. Files and data stay."
  return
}
if ($service.Status -ne 'Stopped') { Stop-Service -Name $ServiceName -Force }
& $Nssm remove $ServiceName confirm | Out-Null
Write-Host "Removed '$ServiceName'. The program, server\.env and the data folder were not touched."
