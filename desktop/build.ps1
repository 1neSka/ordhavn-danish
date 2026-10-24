# Builds and installs Ordhavn as a small WebView2 window (WebHost from the windows-desktop-app skill,
# ~1 MB) around the local production server. No Electron.
#
#   powershell -ExecutionPolicy Bypass -File desktop\build.ps1 [-Shortcut]
#
# The server runs from this project folder (desktop\start-server.mjs rebuilds it when the sources
# changed), so course changes need no rebuild of the app; rerun this script only after changing
# app.template.json or the icon.
param(
    [string]$InstallDir = "$env:USERPROFILE\Programs\OrdhavnLite",
    [string]$Skill = "$env:USERPROFILE\.claude\skills\windows-desktop-app",
    [switch]$Shortcut
)
$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent

# vinext needs Node 22.13+. The system Node may be older, so Codex's bundled Node is a fallback.
function Find-Node {
    $candidates = @((Get-Command node -All -ErrorAction SilentlyContinue).Source) +
        "$env:USERPROFILE\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
    foreach ($c in $candidates | Where-Object { $_ -and $_ -notlike "*WindowsApps*" -and (Test-Path $_) }) {
        $v = [version]((& $c -v).TrimStart("v"))
        if ($v -ge [version]"22.13.0") { return $c }
    }
    throw "Node.js 22.13 or newer was not found (install Node 22 LTS)."
}
function Esc($s) { $s.Replace("\", "\\") }   # JSON-escape backslashes

New-Item -ItemType Directory -Force $InstallDir | Out-Null
$exe = Join-Path $InstallDir "Ordhavn.exe"
if (Test-Path $exe) {
    & $exe --quit   # a running copy stops its server and exits
    Start-Sleep -Seconds 4
}

$json = Get-Content (Join-Path $PSScriptRoot "app.template.json") -Raw
$json = $json.Replace("{project}", (Esc $root)).Replace("{node}", (Esc (Find-Node)))
[IO.File]::WriteAllText((Join-Path $InstallDir "app.json"), $json, (New-Object System.Text.UTF8Encoding $false))

$build = @{ AppDir = $InstallDir; Name = "Ordhavn"; Icon = (Join-Path $PSScriptRoot "assets\icon.ico") }
if ($Shortcut) { $build.Shortcut = $true; $build.ShortcutName = "Ordhavn" }
& (Join-Path $Skill "scripts\build.ps1") @build
