Set-Location $PSScriptRoot
$env:PORT = "4185"
$server = Start-Process node -ArgumentList ".\server.mjs" -PassThru -WindowStyle Minimized
Start-Sleep -Seconds 2
Start-Process "http://127.0.0.1:4185"
Write-Host "LL.M. Planner server started. Process ID: $($server.Id)"
