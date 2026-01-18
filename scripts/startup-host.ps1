param(
    [ValidateSet('dev', 'prod')]
    [string]$Mode = 'prod',
    [string]$Root
)

$ErrorActionPreference = 'Stop'

$scriptDir = $PSScriptRoot
if ([string]::IsNullOrWhiteSpace($scriptDir) -or -not (Test-Path -LiteralPath $scriptDir)) {
    $scriptPath = $PSCommandPath
    if ([string]::IsNullOrWhiteSpace($scriptPath)) {
        $scriptPath = $MyInvocation.MyCommand.Path
    }
    if ([string]::IsNullOrWhiteSpace($scriptPath)) {
        $scriptPath = $MyInvocation.MyCommand.Definition
    }
    if ([string]::IsNullOrWhiteSpace($scriptPath)) {
        $scriptPath = $MyInvocation.MyCommand.Source
    }
    if (-not [string]::IsNullOrWhiteSpace($scriptPath) -and (Test-Path -LiteralPath $scriptPath)) {
        $scriptDir = Split-Path -Parent $scriptPath
    } else {
        $scriptDir = (Get-Location).Path
    }
}

function Find-RepoRoot([string]$startDir) {
    if ([string]::IsNullOrWhiteSpace($startDir)) {
        $startDir = (Get-Location).Path
    }
    $current = Get-Item -LiteralPath $startDir -ErrorAction Stop
    while ($null -ne $current) {
        $candidate = $current.FullName
        if (Test-Path -LiteralPath (Join-Path $candidate 'docker-compose.yml')) { return $candidate }
        if (Test-Path -LiteralPath (Join-Path $candidate 'backend\package.json')) { return $candidate }
        if (Test-Path -LiteralPath (Join-Path $candidate 'frontend\package.json')) { return $candidate }
        $current = $current.Parent
    }
    return $null
}

$root = $Root
if ([string]::IsNullOrWhiteSpace($root)) {
    $root = Find-RepoRoot $scriptDir
}
if ([string]::IsNullOrWhiteSpace($root)) {
    $defaultRoot = Join-Path $env:USERPROFILE 'Documentos\Sorveteria\sistemaSorveteria'
    if (Test-Path -LiteralPath (Join-Path $defaultRoot 'docker-compose.yml')) {
        $root = $defaultRoot
    }
}
if ([string]::IsNullOrWhiteSpace($root)) {
    throw "Não foi possível localizar a raiz do projeto a partir de: $scriptDir"
}
Set-Location $root

Write-Host "[startup] Subindo infraestrutura (postgres/redis)..."
docker compose up -d postgres redis

if ($Mode -eq 'prod') {
    if (-not (Test-Path "$root\backend\dist\index.js")) {
        Write-Host "[startup] Build backend..."
        npm --prefix backend run build
    }

    if (-not (Test-Path "$root\frontend\dist\index.html")) {
        Write-Host "[startup] Build frontend..."
        npm --prefix frontend run build
    }

    $backendCmd = "npm --prefix `"$root\backend`" run start"
    $frontendCmd = "npm --prefix `"$root\frontend`" run preview -- --host 0.0.0.0 --port 4173"
} else {
    $backendCmd = "npm --prefix `"$root\backend`" run dev"
    $frontendCmd = "npm --prefix `"$root\frontend`" run dev -- --host 0.0.0.0 --port 5173"
}

Write-Host "[startup] Iniciando backend..."
Start-Process -FilePath "powershell.exe" -WorkingDirectory $root -ArgumentList @(
    "-NoProfile",
    "-ExecutionPolicy", "Bypass",
    "-Command", $backendCmd
)

Write-Host "[startup] Iniciando frontend..."
Start-Process -FilePath "powershell.exe" -WorkingDirectory $root -ArgumentList @(
    "-NoProfile",
    "-ExecutionPolicy", "Bypass",
    "-Command", $frontendCmd
)
