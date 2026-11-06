@echo off
setlocal
cd /d "%~dp0"

REM This mode serves only the frozen ZLG comparison page and its Markdown export.
set SHARE_PORT=3107

where cloudflared >nul 2>&1
if errorlevel 1 (
  echo cloudflared is not on PATH.
  pause
  exit /b 1
)

if not exist "node_modules\.bin\next.cmd" (
  echo Missing node_modules. Run pnpm install in this folder first.
  pause
  exit /b 1
)

echo Building the production viewer...
call pnpm build
if errorlevel 1 exit /b 1

echo Starting the read-only viewer on 127.0.0.1:%SHARE_PORT%
start "Stego results viewer share :%SHARE_PORT%" /D "%~dp0" cmd /k "set STEGO_PUBLIC_SHARE=1 && pnpm exec next start --hostname 127.0.0.1 --port %SHARE_PORT%"

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0_run-cloudflared-share.ps1" -Port %SHARE_PORT%
endlocal
