@echo off
setlocal

set "ORDHAVN_HIDDEN_LAUNCHER=%~dp0start-ordhavn-hidden.vbs"

if not exist "%ORDHAVN_HIDDEN_LAUNCHER%" (
  echo Ordhavn background launcher was not found:
  echo %ORDHAVN_HIDDEN_LAUNCHER%
  pause
  exit /b 1
)

start "" wscript.exe "%ORDHAVN_HIDDEN_LAUNCHER%"
exit /b 0
