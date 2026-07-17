@echo off
cd /d "%~dp0"
set "PORT=4185"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 20 or later is required.
  echo Install Node.js, then run this file again.
  pause
  exit /b 1
)
start "" powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 2; Start-Process 'http://127.0.0.1:4185'"
node server.mjs
pause
