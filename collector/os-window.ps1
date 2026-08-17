param(
  [string]$TitleMatch = "",
  [string]$CdpPort = "9222"
)

Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;
public class W32Win {
  public delegate bool EnumProc(IntPtr hWnd, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc cb, IntPtr lParam);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint pid);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern int GetWindowTextLength(IntPtr hWnd);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern int GetWindowText(IntPtr hWnd, StringBuilder sb, int max);
  [DllImport("user32.dll")] public static extern bool ClientToScreen(IntPtr hWnd, ref POINT pt);
  [DllImport("user32.dll")] public static extern bool GetClientRect(IntPtr hWnd, out RECT r);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT r);
  [StructLayout(LayoutKind.Sequential)] public struct POINT { public int x; public int y; }
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left; public int Top; public int Right; public int Bottom; }
}
"@

# Find the PID of the Chrome MAIN process serving the CDP port.
# Worker/renderer processes inherit every flag in their command line, so only
# accept processes that do NOT carry a --type= marker.
$cdpPid = $null
Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" | ForEach-Object {
  $cl = $_.CommandLine
  if ($cl -like "*remote-debugging-port=$CdpPort*" -and $cl -notlike "*--type=*") {
    $cdpPid = $_.ProcessId
  }
}
if (-not $cdpPid) { Write-Output "{}"; exit 0 }

$found = $null
$cb = [W32Win+EnumProc]{ param($hWnd, $lParam)
  $pid2 = 0
  [W32Win]::GetWindowThreadProcessId($hWnd, [ref]$pid2) | Out-Null
  if ($pid2 -ne $cdpPid) { return $true }
  if (-not [W32Win]::IsWindowVisible($hWnd)) { return $true }
  $len = [W32Win]::GetWindowTextLength($hWnd)
  if ($len -lt 1) { return $true }
  $sb = New-Object System.Text.StringBuilder ($len + 1)
  [W32Win]::GetWindowText($hWnd, $sb, $sb.Capacity) | Out-Null
  $title = $sb.ToString()
  if ($TitleMatch -ne "" -and -not $title.Contains($TitleMatch)) { return $true }
  $script:found = @{ hWnd = $hWnd; title = $title; pid = $pid2 }
  return $false
}
[W32Win]::EnumWindows($cb, [IntPtr]::Zero) | Out-Null

if (-not $found) { Write-Output "{}"; exit 0 }

$h = $found.hWnd
$pt = New-Object W32Win+POINT
$pt.x = 0; $pt.y = 0
[W32Win]::ClientToScreen($h, [ref]$pt) | Out-Null
$cr = New-Object W32Win+RECT
[W32Win]::GetClientRect($h, [ref]$cr) | Out-Null
$wr = New-Object W32Win+RECT
[W32Win]::GetWindowRect($h, [ref]$wr) | Out-Null

$o = [ordered]@{
  title  = $found.title
  pid    = $found.pid
  client = @{ x = $pt.x; y = $pt.y; w = $cr.Right; h = $cr.Bottom }
  window = @{ left = $wr.Left; top = $wr.Top; w = $wr.Right - $wr.Left; h = $wr.Bottom - $wr.Top }
}
Write-Output ($o | ConvertTo-Json -Compress)
