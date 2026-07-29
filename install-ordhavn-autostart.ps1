$ErrorActionPreference = "Stop"

$taskName = "Ordhavn Localhost"
$launcher = Join-Path $PSScriptRoot "start-ordhavn-background.ps1"
$currentUser = "$env:USERDOMAIN\$env:USERNAME"

if (-not (Test-Path -LiteralPath $launcher)) {
  throw "The background launcher was not found at $launcher."
}

$arguments = "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$launcher`""
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument $arguments
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $currentUser
$principal = New-ScheduledTaskPrincipal -UserId $currentUser -LogonType Interactive -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -RestartCount 3 `
  -RestartInterval (New-TimeSpan -Minutes 1) `
  -ExecutionTimeLimit ([TimeSpan]::Zero)

Register-ScheduledTask `
  -TaskName $taskName `
  -Description "Starts the local Ordhavn learning app on port 3000 after Windows sign-in without opening a browser." `
  -Action $action `
  -Trigger $trigger `
  -Principal $principal `
  -Settings $settings `
  -Force | Out-Null

Start-ScheduledTask -TaskName $taskName
Write-Host "Ordhavn autostart is enabled. The hidden server starts after Windows sign-in."
