@echo off
setlocal
title Ordhavn - local server

cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found. Install Node.js 22.13 or newer first.
  echo.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Installing Ordhavn dependencies...
  call npm install
  if errorlevel 1 (
    echo.
    echo Dependency installation failed.
    pause
    exit /b 1
  )
)

echo Starting Ordhavn at http://localhost:3000
echo Keep this window open while you use the app.
echo Press Ctrl+C here to stop the server.
echo.

start "" powershell -NoProfile -WindowStyle Hidden -Command "$limit=(Get-Date).AddSeconds(60); do { try { $client=[Net.Sockets.TcpClient]::new(); $client.Connect('127.0.0.1',3000); $client.Dispose(); Start-Process 'http://localhost:3000'; exit } catch { Start-Sleep -Milliseconds 500 } } while ((Get-Date) -lt $limit)"

call npm run dev

echo.
echo Ordhavn has stopped.
pause
