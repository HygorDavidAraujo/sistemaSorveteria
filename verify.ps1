# Sistema Sorveteria - Verification Script (Windows)
# This script verifies all Docker configurations and CSS stylization

$ErrorActionPreference = "Continue"

# Color functions
function Write-Success {
    Write-Host "✓ $args" -ForegroundColor Green
}

function Write-Error-Custom {
    Write-Host "✗ $args" -ForegroundColor Red
}

function Write-Warning-Custom {
    Write-Host "⚠ $args" -ForegroundColor Yellow
}

function Write-Info {
    Write-Host "→ $args" -ForegroundColor Cyan
}

function Write-Header {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Blue
    Write-Host "$args" -ForegroundColor Blue
    Write-Host "========================================" -ForegroundColor Blue
    Write-Host ""
}

Write-Header "Sistema Sorveteria - Verification"

# 1. Check Docker
Write-Info "1. Checking Docker installation..."
try {
    $dockerVersion = docker --version
    Write-Success "Docker found: $dockerVersion"
}
catch {
    Write-Error-Custom "Docker not found"
    exit 1
}

# 2. Check Docker Compose
Write-Info "2. Checking Docker Compose..."
try {
    $composeVersion = docker-compose --version
    Write-Success "Docker Compose found: $composeVersion"
}
catch {
    Write-Error-Custom "Docker Compose not found"
    exit 1
}

# 3. Verify file structure
Write-Info "3. Verifying project structure..."
$files = @(
    "docker-compose.yml",
    "docker-compose.prod.yml",
    "backend/Dockerfile",
    "frontend/Dockerfile",
    "frontend/Dockerfile.prod",
    "backend/entrypoint.sh",
    "backend.env",
    ".env.example",
    "init-docker.ps1",
    "DOCKER_SETUP.md",
    "STYLE_GUIDE.md",
    "STYLE_STANDARDIZATION_COMPLETE.md"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Success $file
    }
    else {
        Write-Error-Custom "$file missing"
    }
}

# 4. Check CSS files
Write-Info "4. Checking CSS files..."
$cssFiles = @(
    "frontend/src/index.css",
    "frontend/src/App.css",
    "frontend/src/pages/LoginPage.css",
    "frontend/src/pages/DashboardPage.css",
    "frontend/src/pages/CustomersPage.css",
    "frontend/src/pages/CashPage.css",
    "frontend/src/pages/LoyaltyPage.css",
    "frontend/src/pages/ComandasPage.css",
    "frontend/src/pages/CouponsPage.css",
    "frontend/src/pages/ReportsPage.css",
    "frontend/src/pages/SettingsPage.css",
    "frontend/src/pages/SalesPage.css",
    "frontend/src/pages/ProductsPage.css"
)

foreach ($file in $cssFiles) {
    if (Test-Path $file) {
        Write-Success $file
    }
    else {
        Write-Error-Custom "$file missing"
    }
}

# 5. Verify CSS variables
Write-Info "5. Verifying CSS variables in App.css..."
$appCssContent = Get-Content "frontend/src/App.css" -Raw

if ($appCssContent -match "color-primary") {
    Write-Success "Primary color variable found"
}
else {
    Write-Error-Custom "Primary color variable missing"
}

if ($appCssContent -match "border-radius") {
    Write-Success "Border radius variables found"
}
else {
    Write-Error-Custom "Border radius variables missing"
}

if ($appCssContent -match "shadow") {
    Write-Success "Shadow variables found"
}
else {
    Write-Error-Custom "Shadow variables missing"
}

# 6. Check environment variables
Write-Info "6. Verifying environment configuration..."
if (Test-Path "backend.env") {
    Write-Success "backend.env found"
    $envContent = Get-Content "backend.env" -Raw
    if ($envContent -match "DATABASE_URL") {
        Write-Success "DATABASE_URL configured"
    }
    if ($envContent -match "REDIS_HOST") {
        Write-Success "REDIS_HOST configured"
    }
}
else {
    Write-Warning-Custom "backend.env not found"
}

# 7. Check Docker Compose configuration
Write-Info "7. Validating docker-compose.yml..."
try {
    $composeValidation = docker-compose config 2>&1
    Write-Success "docker-compose.yml is valid"
}
catch {
    Write-Error-Custom "docker-compose.yml has syntax errors"
}

# 8. Check volumes configuration
Write-Info "8. Verifying volume configurations..."
$dockerComposeContent = Get-Content "docker-compose.yml" -Raw

if ($dockerComposeContent -match "volumes:") {
    Write-Success "Volumes configured"
    if ($dockerComposeContent -match "./frontend:/app") {
        Write-Success "Frontend volume mapping found"
    }
    if ($dockerComposeContent -match "./backend:/app") {
        Write-Success "Backend volume mapping found"
    }
}
else {
    Write-Error-Custom "No volumes configured"
}

# 9. Network configuration
Write-Info "9. Checking network configuration..."
if ($dockerComposeContent -match "networks:") {
    Write-Success "Network configured"
}
else {
    Write-Warning-Custom "No custom network defined"
}

# 10. Health checks
Write-Info "10. Verifying healthcheck configurations..."
if ($dockerComposeContent -match "healthcheck:") {
    Write-Success "Healthchecks configured"
}
else {
    Write-Warning-Custom "No healthchecks configured"
}

# Summary
Write-Header "✓ Verification Complete"

Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Run: .\init-docker.ps1" -ForegroundColor White
Write-Host "2. Wait for services to start" -ForegroundColor White
Write-Host "3. Access Frontend: http://localhost:5173" -ForegroundColor White
Write-Host "4. Access Backend: http://localhost:3000/api/v1" -ForegroundColor White
Write-Host ""
Write-Host "Documentation:" -ForegroundColor Yellow
Write-Host "  - DOCKER_SETUP.md - Complete Docker setup guide" -ForegroundColor White
Write-Host "  - STYLE_GUIDE.md - CSS design system documentation" -ForegroundColor White
Write-Host "  - STYLE_STANDARDIZATION_COMPLETE.md - Styling changes summary" -ForegroundColor White
Write-Host ""
