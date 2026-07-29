@echo off
setlocal EnableExtensions EnableDelayedExpansion
title Ordhavn - local server

cd /d "%~dp0"

set "ORDHAVN_NODE_DIR=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin"
set "ORDHAVN_NODE=%ORDHAVN_NODE_DIR%\node.exe"
set "ORDHAVN_NPM_CLI=%ProgramFiles%\nodejs\node_modules\npm\bin\npm-cli.js"

for /f "usebackq delims=" %%K in (`powershell -NoProfile -Command "[Environment]::GetEnvironmentVariable('GEMINI_API_KEY','User')"`) do set "GEMINI_API_KEY=%%K"

if not exist "%ORDHAVN_NODE%" (
  for /f "delims=" %%N in ('where node 2^>nul') do if not defined ORDHAVN_FALLBACK_NODE set "ORDHAVN_FALLBACK_NODE=%%N"
  if defined ORDHAVN_FALLBACK_NODE (
    set "ORDHAVN_NODE=!ORDHAVN_FALLBACK_NODE!"
    for %%N in ("!ORDHAVN_NODE!") do set "ORDHAVN_NODE_DIR=%%~dpN"
  )
)

if not exist "%ORDHAVN_NODE%" (
  echo Node.js was not found.
  echo Ordhavn needs Node.js 22.13 or newer.
  echo.
  pause
  exit /b 1
)

set "PATH=%ORDHAVN_NODE_DIR%;%PATH%"

for /f "tokens=1,2 delims=." %%A in ('node -p "process.versions.node"') do (
  set "ORDHAVN_NODE_MAJOR=%%A"
  set "ORDHAVN_NODE_MINOR=%%B"
)

if !ORDHAVN_NODE_MAJOR! LSS 22 goto node_too_old
if !ORDHAVN_NODE_MAJOR! EQU 22 if !ORDHAVN_NODE_MINOR! LSS 13 goto node_too_old

if not exist "%ORDHAVN_NPM_CLI%" (
  echo npm was not found at:
  echo %ORDHAVN_NPM_CLI%
  echo Reinstall Node.js with npm included.
  echo.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Installing Ordhavn dependencies...
  "%ORDHAVN_NODE%" "%ORDHAVN_NPM_CLI%" install
  if errorlevel 1 (
    echo.
    echo Dependency installation failed.
    pause
    exit /b 1
  )
)

echo Starting Ordhavn at http://localhost:3000
echo Using Node.js:
"%ORDHAVN_NODE%" --version
echo Keep this window open while you use the app.
echo Press Ctrl+C here to stop the server.
echo.

if not defined ORDHAVN_NO_BROWSER start "" powershell -NoProfile -WindowStyle Hidden -Command "$limit=(Get-Date).AddSeconds(60); do { try { $client=[Net.Sockets.TcpClient]::new(); $client.Connect('127.0.0.1',3000); $client.Dispose(); Start-Process 'http://localhost:3000'; exit } catch { Start-Sleep -Milliseconds 500 } } while ((Get-Date) -lt $limit)"

"%ORDHAVN_NODE%" "%ORDHAVN_NPM_CLI%" run dev
set "ORDHAVN_EXIT_CODE=!ERRORLEVEL!"

echo.
if not "!ORDHAVN_EXIT_CODE!"=="0" echo Ordhavn could not start or exited with code !ORDHAVN_EXIT_CODE!.
if "!ORDHAVN_EXIT_CODE!"=="0" echo Ordhavn server was closed.
pause
exit /b !ORDHAVN_EXIT_CODE!

:node_too_old
echo Found Node.js !ORDHAVN_NODE_MAJOR!.!ORDHAVN_NODE_MINOR!, but Ordhavn needs 22.13 or newer.
echo Install a current Node.js LTS release and try again.
echo.
pause
exit /b 1
