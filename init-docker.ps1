# Sistema Sorveteria - Docker Initialization (Windows)

Write-Host "=================================================="
Write-Host "Sistema Sorveteria - Docker Initialization" -ForegroundColor Cyan
Write-Host "=================================================="
Write-Host ""

# Step 1: Check Docker
Write-Host "1. Checking Docker installation..." -ForegroundColor Cyan
try {
    docker --version
    docker-compose --version
    Write-Host "✓ Docker is installed" -ForegroundColor Green
}
catch {
    Write-Host "✗ Docker is not installed or not in PATH" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 2: Cleanup
Write-Host "2. Cleaning up old containers and volumes..." -ForegroundColor Cyan
docker-compose down -v 2>$null | Out-Null
Write-Host "✓ Cleanup done" -ForegroundColor Green
Write-Host ""

# Step 3: Build
Write-Host "3. Building images..." -ForegroundColor Cyan
docker-compose build --no-cache
Write-Host "✓ Images built successfully" -ForegroundColor Green
Write-Host ""

# Step 4: Start services
Write-Host "4. Starting services..." -ForegroundColor Cyan
docker-compose up -d
Write-Host "✓ Services started" -ForegroundColor Green
Write-Host ""

# Step 5: Wait for services
Write-Host "5. Waiting for services to be healthy..." -ForegroundColor Cyan
Start-Sleep -Seconds 10

# Check backend
Write-Host "Checking backend health..."
$healthyBackend = $false
for ($i = 1; $i -le 30; $i++) {
    try {
        $response = docker exec gelatini-backend curl -s http://localhost:3000/api/v1/health
        if ($response) {
            Write-Host "✓ Backend is healthy" -ForegroundColor Green
            $healthyBackend = $true
            break
        }
    }
    catch {
        Write-Host "Waiting for backend... ($i/30)"
        Start-Sleep -Seconds 1
    }
}

if (-not $healthyBackend) {
    Write-Host "⚠ Backend health check failed, but services may still be starting..." -ForegroundColor Yellow
}

Write-Host ""

# Step 6: Status
Write-Host "6. Displaying service status..." -ForegroundColor Cyan
docker-compose ps
Write-Host ""

Write-Host "=================================================="
Write-Host "System is ready!" -ForegroundColor Green
Write-Host "=================================================="
Write-Host ""
Write-Host "URLs:"
Write-Host "  Frontend: http://localhost:5173"
Write-Host "  Backend:  http://localhost:3000/api/v1"
Write-Host "  Database: localhost:5432"
Write-Host "  Redis:    localhost:6379"
Write-Host ""
Write-Host "Useful commands:"
Write-Host "  docker-compose logs -f              # Follow all logs"
Write-Host "  docker-compose logs -f frontend     # Frontend logs"
Write-Host "  docker-compose logs -f backend      # Backend logs"
Write-Host "  docker-compose ps                   # Service status"
Write-Host "  docker-compose down                 # Stop all services"
Write-Host ""
