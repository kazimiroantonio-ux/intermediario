# start-dev.ps1 — arranca Postgres local + dev server (O Intermediário)
# Uso:  powershell -ExecutionPolicy Bypass -File start-dev.ps1
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$pg = Join-Path $env:USERPROFILE "tools\pg\pgsql\bin"

Write-Host "== O Intermediario / dev =="

# 1) limpar portos 3000 e 5432 (deixar arranques limpos)
foreach ($port in 3000, 5432) {
  $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
  foreach ($c in $conns) {
    try { Stop-Process -Id $c.OwningProcess -Force -ErrorAction Stop
          Write-Host "porta $port limpa (PID $($c.OwningProcess))" }
    catch { Write-Host "ATENCAO: nao consegui libertar a porta $port (PID $($c.OwningProcess))" }
  }
}
Start-Sleep 2

# 2) Postgres local (dados em ~\tools\pg\data)
& "$pg\pg_ctl.exe" -D "$env:USERPROFILE\tools\pg\data" -l "$env:USERPROFILE\tools\pg\server.log" -w start
Write-Host "Postgres local OK (porta 5432)"

# 3) dev server destacado com logs
$outLog = Join-Path $root ".dev-server.out.log"
$errLog = Join-Path $root ".dev-server.err.log"
Start-Process -FilePath "$env:USERPROFILE\tools\node\node.exe" -ArgumentList "node_modules\next\dist\bin\next","dev" `
  -WorkingDirectory $root -WindowStyle Hidden `
  -RedirectStandardOutput $outLog -RedirectStandardError $errLog
Write-Host "Dev server a arrancar (log: $errLog)"

# 4) verificar
Start-Sleep 12
try {
  $r = Invoke-WebRequest -Uri "http://localhost:3000/" -UseBasicParsing -TimeoutSec 20 -ErrorAction Stop
  Write-Host "SITE: HTTP $($r.StatusCode) - http://localhost:3000"
} catch {
  $s = $_.Exception.Response
  if ($s) { Write-Host "SITE: HTTP $([int]$s.StatusCode) (responde; ver mensagem da pagina)" }
  else { Write-Host "SITE: sem resposta - abrir $errLog para ver o erro" }
}