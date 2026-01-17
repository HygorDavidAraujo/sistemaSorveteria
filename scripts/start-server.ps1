$ErrorActionPreference = "Stop"

# Paths
$root = "C:\Users\hygor\Documentos\Sorveteria\sistemaSorveteria"
$backendDir = Join-Path $root "backend"
$frontendDir = Join-Path $root "frontend"

# Start Docker services (Postgres + Redis)
Write-Host "[Start] Docker: postgres + redis" -ForegroundColor Cyan
& docker compose -f (Join-Path $root "docker-compose.yml") up -d postgres redis

# Start Backend (local)
Write-Host "[Start] Backend (local)" -ForegroundColor Cyan
Start-Process -FilePath "powershell.exe" -WorkingDirectory $backendDir -ArgumentList "-NoExit", "-Command", "if (!(Test-Path node_modules)) { npm install }; npm run dev" -WindowStyle Minimized

# Start Frontend (local)
Write-Host "[Start] Frontend (local)" -ForegroundColor Cyan
Start-Process -FilePath "powershell.exe" -WorkingDirectory $frontendDir -ArgumentList "-NoExit", "-Command", "if (!(Test-Path node_modules)) { npm install }; npm run dev" -WindowStyle Minimized

Write-Host "[OK] Servidores iniciados." -ForegroundColor Green
