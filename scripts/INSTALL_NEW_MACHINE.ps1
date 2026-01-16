# Instalação automatizada (Windows + Docker)
# Uso: ./scripts/INSTALL_NEW_MACHINE.ps1 -RepoUrl "<URL_REPO>" -ProjectDir "C:\Sistemas\sistemaSorveteria" -EnvSource "C:\Backups\backend.env" -FrontendEnvSource "C:\Backups\frontend.env" -RunMigrate

param(
  [Parameter(Mandatory=$true)][string]$RepoUrl,
  [Parameter(Mandatory=$true)][string]$ProjectDir,
  [Parameter(Mandatory=$true)][string]$EnvSource,
  [string]$FrontendEnvSource = "",
  [switch]$RunMigrate
)

$ErrorActionPreference = "Stop"

if (!(Get-Command git -ErrorAction SilentlyContinue)) {
  throw "Git não encontrado. Instale o Git antes de continuar."
}
if (!(Get-Command docker -ErrorAction SilentlyContinue)) {
  throw "Docker não encontrado. Instale o Docker Desktop antes de continuar."
}

Write-Host "[1/5] Clonando repositório..."
if (Test-Path $ProjectDir) {
  throw "A pasta $ProjectDir já existe. Escolha outra ou remova-a primeiro."
}

git clone $RepoUrl $ProjectDir

Write-Host "[2/5] Copiando arquivos de ambiente..."
if (!(Test-Path $EnvSource)) {
  throw "backend.env não encontrado em $EnvSource"
}
Copy-Item $EnvSource (Join-Path $ProjectDir "backend.env") -Force

if ($FrontendEnvSource -and (Test-Path $FrontendEnvSource)) {
  Copy-Item $FrontendEnvSource (Join-Path $ProjectDir "frontend\.env") -Force
}

Write-Host "[3/5] Subindo containers (backend/frontend/postgres/redis)..."
Push-Location $ProjectDir
& docker compose up -d --build backend frontend postgres redis

if ($RunMigrate) {
  Write-Host "[4/5] Aplicando migrações do Prisma..."
  Push-Location (Join-Path $ProjectDir "backend")
  & npx prisma migrate deploy
  Pop-Location
}

Write-Host "[5/5] Concluído."
Write-Host "Acesse o frontend e valide login e operações principais."
Pop-Location
