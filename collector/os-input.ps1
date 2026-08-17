param(
  [int]$X = -1,           # target screen X (physical pixels)
  [int]$Y = -1,           # target screen Y (physical pixels)
  [switch]$Glide,         # move physical cursor to X,Y with a human path
  [switch]$Click,         # primary click at current cursor pos
  [switch]$DoubleClick,   # double click at current cursor pos
  [string]$Type = "",     # type this text char-by-char with human rhythm
  [string]$Key = "",      # press a special key: Enter, Tab, Backspace, Esc
  [switch]$ScrollDown,    # scroll wheel down
  [int]$ScrollLines = 3
)

Add-Type -AssemblyName System.Windows.Forms
Add-Type @"
using System.Runtime.InteropServices;
public static class W {
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
  [DllImport("user32.dll")] public static extern void mouse_event(uint flags, uint dx, uint dy, uint data, UIntPtr extra);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
}
"@

function Rnd([double]$lo, [double]$hi) {
  return [double]($lo + (Get-Random -Minimum 0) / ([int]::MaxValue) * ($hi - $lo))
  # (Get-Random is seeded per call; good enough)
}

function Glide-Human([int]$tx, [int]$ty) {
  $sx = [System.Windows.Forms.Cursor]::Position.X
  $sy = [System.Windows.Forms.Cursor]::Position.Y
  $dx = $tx - $sx
  $dy = $ty - $sy
  $dist = [math]::Sqrt($dx * $dx + $dy * $dy)
  if ($dist -lt 4) {
    [W]::SetCursorPos($tx, $ty) | Out-Null
    return
  }
  # Slight arc: perpendicular control point offset.
  $arc = [math]::Min(0.20 * $dist, 80) * (if ((Get-Random -Minimum 0) % 2 -eq 0) { -1 } else { 1 })
  $ctlX = ($sx + $tx) / 2 + $arc * (-$dy / $dist)
  $ctlY = ($sy + $ty) / 2 + $arc * ($dx / $dist)
  $steps = [int]([math]::Max(18, [math]::Min(45, [int]($dist / 9))))
  for ($i = 1; $i -le $steps; $i++) {
    $t = $i / $steps
    $u = 1 - $t
    $e = if ($t -lt 0.5) { 2 * $t * $t } else { 1 - [math]::Pow(-2 * $t + 2, 2) / 2 }
    # bezier
    $bx = [math]::Round($u*$u*$sx + 2*$u*$t*$ctlX + $t*$t*$tx + (Get-Random -Minimum 0) / ([int]::MaxValue) * 3 - 1.5)
    $by = [math]::Round($u*$u*$sy + 2*$u*$t*$ctlY + $t*$t*$ty + (Get-Random -Minimum 0) / ([int]::MaxValue) * 3 - 1.5)
    [W]::SetCursorPos($bx, $by) | Out-Null
    $speed = 0.06 + 0.9 * [math]::Sin([math]::PI * $e)
    Start-Sleep -Milliseconds ([int](9 + 40 * $speed + (Get-Random -Minimum 0) / ([int]::MaxValue) * 40))
  }
  $jx = $tx + [int]((Get-Random -Minimum 0) / ([int]::MaxValue) * 4 - 2)
  $jy = $ty + [int]((Get-Random -Minimum 0) / ([int]::MaxValue) * 4 - 2)
  [W]::SetCursorPos($jx, $jy) | Out-Null
}

function Do-Click {
  Start-Sleep -Milliseconds ([int](60 + (Get-Random -Minimum 0) / ([int]::MaxValue) * 120))
  [W]::mouse_event(0x0002, 0, 0, 0, [UIntPtr]::Zero) # left down
  Start-Sleep -Milliseconds ([int](50 + (Get-Random -Minimum 0) / ([int]::MaxValue) * 90))
  [W]::mouse_event(0x0004, 0, 0, 0, [UIntPtr]::Zero) # left up
  Start-Sleep -Milliseconds ([int](120 + (Get-Random -Minimum 0) / ([int]::MaxValue) * 200))
}

function Type-Human([string]$text) {
  foreach ($ch in $text.ToCharArray()) {
    $esc = $ch.ToString()
    $esc = $esc -replace '\{', '{{}' -replace '\}', '{}}' -replace '\+', '{+}' -replace '\^', '{^}' -replace '%', '{%}' -replace '\(', '{(}' -replace '\)', '{)}' -replace '\[', '{[}' -replace '\]', '{]}' -replace '~', '{~}'
    if ($esc -eq ' ') { $esc = '{ }' }
    [System.Windows.Forms.SendKeys]::SendWait($esc)
    $d = 55 + (Get-Random -Minimum 0) % 90
    if ($ch -eq ' ') { $d += 120 + (Get-Random -Minimum 0) % 160 }
    Start-Sleep -Milliseconds $d
  }
  Start-Sleep -Milliseconds ([int](150 + (Get-Random -Minimum 0) / ([int]::MaxValue) * 250))
}

if ($Glide -and $X -ge 0 -and $Y -ge 0) { Glide-Human $X $Y }
if ($Click) { Do-Click }
if ($DoubleClick) {
  Start-Sleep -Milliseconds 60
  [W]::mouse_event(0x0002, 0, 0, 0, [UIntPtr]::Zero)
  Start-Sleep -Milliseconds 40
  [W]::mouse_event(0x0004, 0, 0, 0, [UIntPtr]::Zero)
  Start-Sleep -Milliseconds 60
  [W]::mouse_event(0x0002, 0, 0, 0, [UIntPtr]::Zero)
  Start-Sleep -Milliseconds 40
  [W]::mouse_event(0x0004, 0, 0, 0, [UIntPtr]::Zero)
}
if ($Type -ne "") { Type-Human $Type }
if ($Key -ne "") {
  $k = $Key.ToUpper()
  $map = @{ 'ENTER' = '{ENTER}'; 'TAB' = '{TAB}'; 'BACKSPACE' = '{BACKSPACE}'; 'ESC' = '{ESC}'; 'SPACE' = ' ' }
  [System.Windows.Forms.SendKeys]::SendWait($map[$k])
  Start-Sleep -Milliseconds ([int](80 + (Get-Random -Minimum 0) / ([int]::MaxValue) * 120))
}
if ($ScrollDown) {
  [W]::mouse_event(0x0800, 0, 0, [uint32](-120 * $ScrollLines), [UIntPtr]::Zero)
}