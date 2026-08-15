# keep-awake.ps1 — blocks SYSTEM sleep for as long as this window runs.
# The display may still turn off; the system stays awake. Start it before
# leaving the machine (the window must stay open).
Add-Type -TypeDefinition @"
using System.Runtime.InteropServices;
public static class KeepAwake {
    [DllImport("kernel32.dll", CharSet = CharSet.Unicode)]
    public static extern uint SetThreadExecutionState(uint esFlags);
}
"@

# ES_CONTINUOUS (0x80000000) | ES_SYSTEM_REQUIRED (0x00000001)
[KeepAwake]::SetThreadExecutionState(0x80000001) | Out-Null
Write-Host "Keep-awake aktiv – das System kann jetzt NICHT schlafen." -ForegroundColor Green
Write-Host "Display darf ausgehen. Fenster offen lassen. Beenden mit Strg+C."

try {
    while ($true) {
        Start-Sleep -Seconds 30
        [KeepAwake]::SetThreadExecutionState(0x80000001) | Out-Null
    }
}
finally {
    # clear the flag (ES_CONTINUOUS)
    [KeepAwake]::SetThreadExecutionState(0x80000000) | Out-Null
    Write-Host "Keep-awake beendet."
}
