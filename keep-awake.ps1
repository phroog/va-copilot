# keep-awake.ps1 — blocks SYSTEM sleep for as long as this window runs.
# The display may still turn off; the system stays awake.
# Run the FILE, don't paste into the console:
#   & "C:\Users\Surface\Desktop\Sari\keep-awake.ps1"
Add-Type -TypeDefinition @"
using System.Runtime.InteropServices;
public static class KeepAwake {
    [DllImport("kernel32.dll")]
    public static extern uint SetThreadExecutionState(uint esFlags);
}
"@

# ES_CONTINUOUS = 0x80000000, ES_SYSTEM_REQUIRED = 0x00000001
$ES_CONTINUOUS = [uint32]2147483648
$ES_SYSTEM_REQUIRED = [uint32]1
$flags = $ES_CONTINUOUS -bor $ES_SYSTEM_REQUIRED

[KeepAwake]::SetThreadExecutionState($flags) | Out-Null
Write-Host "Keep-awake aktiv – das System kann jetzt NICHT schlafen." -ForegroundColor Green
Write-Host "Display darf ausgehen. Fenster offen lassen. Beenden mit Strg+C."

try {
    while ($true) {
        Start-Sleep -Seconds 30
        [KeepAwake]::SetThreadExecutionState($flags) | Out-Null
    }
}
finally {
    # clear the flag (ES_CONTINUOUS)
    [KeepAwake]::SetThreadExecutionState($ES_CONTINUOUS) | Out-Null
    Write-Host "Keep-awake beendet."
}
