$ErrorActionPreference = "Stop"
$PSDefaultParameterValues["Out-File:Encoding"] = "utf8"

$projectDirectory = $PSScriptRoot
$runtimeDirectory = Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin"
$nodeExecutable = Join-Path $runtimeDirectory "node.exe"
$npmCli = Join-Path $env:ProgramFiles "nodejs\node_modules\npm\bin\npm-cli.js"
$logDirectory = Join-Path $env:LOCALAPPDATA "Ordhavn"
$logFile = Join-Path $logDirectory "localhost.log"
$userGeminiKey = [Environment]::GetEnvironmentVariable("GEMINI_API_KEY", "User")
if (-not [string]::IsNullOrWhiteSpace($userGeminiKey)) {
  $env:GEMINI_API_KEY = $userGeminiKey
}

New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null

try {
  $connection = [Net.Sockets.TcpClient]::new()
  $connection.Connect("127.0.0.1", 3000)
  $connection.Dispose()
  exit 0
} catch {
  if ($connection) { $connection.Dispose() }
}

if (-not (Test-Path -LiteralPath $nodeExecutable)) {
  $fallbackNode = Get-Command node -ErrorAction SilentlyContinue
  if (-not $fallbackNode) { throw "Node.js was not found." }
  $nodeExecutable = $fallbackNode.Source
  $runtimeDirectory = Split-Path -Parent $nodeExecutable
}

$nodeVersion = & $nodeExecutable -p "process.versions.node"
$version = [Version]$nodeVersion
if ($version -lt [Version]"22.13.0") {
  throw "Ordhavn requires Node.js 22.13 or newer; found $nodeVersion."
}
if (-not (Test-Path -LiteralPath $npmCli)) { throw "npm-cli.js was not found." }
if (-not (Test-Path -LiteralPath (Join-Path $projectDirectory "node_modules"))) {
  throw "Ordhavn dependencies are missing. Run start-ordhavn.bat once."
}

$env:PATH = "$runtimeDirectory;$env:PATH"
Set-Location -LiteralPath $projectDirectory

"[$(Get-Date -Format o)] Starting the interactive Ordhavn local server with Node.js $nodeVersion" | Set-Content -LiteralPath $logFile
& $nodeExecutable $npmCli run dev *>> $logFile
exit $LASTEXITCODE
