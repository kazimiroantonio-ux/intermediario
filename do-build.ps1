$proj = "C:\Users\Kazim\OneDrive\Documentos\Default Project\intermediario"
$node = "C:\Users\Kazim\tools\node\node.exe"
$log = Join-Path $proj "build-full.log"
Remove-Item $log -ErrorAction SilentlyContinue

$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = "cmd.exe"
$psi.Arguments = '/c set NODE_OPTIONS=--max-old-space-size=1100 && set NODE_ENV=production && "' + $node + '" "' + (Join-Path $proj 'node_modules\next\dist\bin\next') + '" build --webpack > "' + $log + '" 2>&1'
$psi.WorkingDirectory = $proj
$psi.UseShellExecute = $true
$psi.WindowStyle = [System.Diagnostics.ProcessWindowStyle]::Hidden
$proc = [System.Diagnostics.Process]::Start($psi)
$buildPid = $proc.Id
Write-Host "build pid=$buildPid"

$deadline = (Get-Date).AddMinutes(11)
while ((Get-Date) -lt $deadline) {
  if (Test-Path (Join-Path $proj ".next\prerender-manifest.json")) { Write-Host "MANIFEST OK"; break }
  $alive = Get-Process -Id $buildPid -ErrorAction SilentlyContinue
  if (-not $alive) { Write-Host "build ended pid=$buildPid"; break }
  Start-Sleep 15
}
