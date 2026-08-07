@echo off
REM Start the collector using your REAL Chrome (via CDP) so Upwork's
REM Cloudflare challenge sees a normal browser and lets the collector through.
REM
REM   start-collector.cmd        -> one pass, then exits
REM   start-collector.cmd loop   -> keep polling every POLL_INTERVAL_MIN minutes

setlocal
cd /d "%~dp0"

REM Kill only the Chrome instance we started for CDP (dedicated profile dir),
REM NOT your normal browsing Chrome.
powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \"Name='chrome.exe'\" | Where-Object { $_.CommandLine -like '*%~dp0cdp-profile*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"

REM Launch real Chrome with the remote debugging port + dedicated profile.
start "Chrome CDP" "C:\Program Files\Google\Chrome\Application\chrome.exe" ^
  --remote-debugging-port=9222 ^
  --remote-debugging-address=127.0.0.1 ^
  --user-data-dir="%~dp0cdp-profile" ^
  --disable-blink-features=AutomationControlled ^
  about:blank

echo Waiting for Chrome debugging port...
:wait
timeout /t 1 /nobreak >nul
curl -s http://127.0.0.1:9222/json/version >nul 2>&1 || goto wait

set CHROME_CDP=http://127.0.0.1:9222
set PROFILE_DIR=

if /i "%~1"=="loop" (
  echo Starting collector in loop mode...
  npm.cmd start
) else (
  echo Starting collector (one pass)...
  npm.cmd run once
)

endlocal
