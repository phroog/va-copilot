@echo off
REM ============================================================
REM  Sari keep-awake — prevents the machine from sleeping so the
REM  job scanner can run 24/7. Run as Administrator once.
REM  The display may still turn off; the SYSTEM stays awake.
REM ============================================================
net session >nul 2>&1
if %errorlevel% neq 0 (
  echo Bitte als Administrator ausfuehren (Rechtsklick - Als Administrator ausfuehren).
  pause
  exit /b 1
)

echo Aktives Energieschema aktivieren...
powercfg /setactive SCHEME_CURRENT

echo System-Nie-Schlafen setzen (Netzbetrieb)...
powercfg /change standby-timeout-ac 0
powercfg /change hibernate-timeout-ac 0

echo Laptop: Zuklappen des Deckels = nichts tun...
powercfg /setacvalueindex SCHEME_CURRENT SUB_BUTTONS LIDACTION 0
powercfg /setactive SCHEME_CURRENT

echo Display darf nach 15 Minuten ausgehen (System bleibt wach)...
powercfg /change monitor-timeout-ac 15

echo.
echo ===== Aktuelle Werte =====
powercfg /query SCHEME_CURRENT SUB_SLEEP STANDBYIDLE
powercfg /query SCHEME_CURRENT SUB_BUTTONS LIDACTION

echo.
echo Fertig. Der Rechner bleibt jetzt wach (Netzbetrieb), das Display kann ausgehen.
echo Hinweis: Windows-Update-Neustarts und manuelles Herunterfahren stoppen den Scanner weiterhin.
pause
