$proj = "C:\Users\Kazim\OneDrive\Documentos\Default Project\intermediario"

# matar node anterior
Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*tools\node*" } | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep 3

# iniciar servidor
$env:NODE_ENV = "production"
$p = Start-Process -FilePath "C:\Users\Kazim\tools\node\node.exe" -ArgumentList "`"$proj\node_modules\next\dist\bin\next`" start -p 3000" -WorkingDirectory $proj -WindowStyle Hidden -PassThru
Set-Content "$proj\srv.pid" $p.Id
Write-Host "srv pid=$($p.Id)"

# aguardar TCP
for ($i=0; $i -lt 15; $i++) {
  if (netstat -ano | findstr ":3000" | findstr "LISTENING") { Write-Host "tcp-listen=True wait-s=$i"; break }
  Start-Sleep 2
}

# warm-up
Start-Sleep 3
& "C:\Users\Kazim\tools\node\node.exe" -e "fetch('http://localhost:3000/').then(r=>console.log('warm status='+r.status)).catch(e=>console.log('warm ERR:'+e.message))"

# e2e
Start-Sleep 1
& "C:\Users\Kazim\tools\node\node.exe" "$proj\e2e-multicaixa.js"
