@echo off
rem ─────────────────────────────────────────────────────────────
rem Sari 24/7 Watchdog — ensures Chrome (with Sari + 2captcha)
rem keeps running on the always-on laptop.
rem
rem Setup:
rem   1. Save this file on the laptop, e.g. C:\sari\ensure-chrome.cmd
rem   2. Create a Task Scheduler task:
rem        - Trigger: "At log on" (any user) + repeat every 5 min
rem          for an indefinite duration
rem        - Action: start program  C:\sari\ensure-chrome.cmd
rem          (window: Hidden)
rem ─────────────────────────────────────────────────────────────
setlocal
set CHROME="C:\Program Files\Google\Chrome\Application\chrome.exe"
if not exist %CHROME% set CHROME="C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
if not exist %CHROME% exit /b 0

rem Chrome already running? Then nothing to do.
tasklist /FI "IMAGENAME eq chrome.exe" 2>NUL | find /I "chrome.exe" >NUL
if not errorlevel 1 exit /b 0

rem Start Chrome and restore the last session (platform tabs + logins).
start "" %CHROME% --restore-last-session
exit /b 0