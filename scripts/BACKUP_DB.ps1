# Backup do Postgres via Docker
# Uso: ./scripts/BACKUP_DB.ps1 -ContainerName "gelatini-postgres" -DbName "gelatini_db" -DbUser "gelatini" -OutFile "C:\Backups\gelatini_db.sql"

param(
  [Parameter(Mandatory=$true)][string]$ContainerName,
  [Parameter(Mandatory=$true)][string]$DbName,
  [Parameter(Mandatory=$true)][string]$DbUser,
  [Parameter(Mandatory=$true)][string]$OutFile
)

$ErrorActionPreference = "Stop"

if (!(Get-Command docker -ErrorAction SilentlyContinue)) {
  throw "Docker não encontrado."
}

$dir = Split-Path $OutFile
if (!(Test-Path $dir)) {
  New-Item -ItemType Directory -Path $dir | Out-Null
}

Write-Host "Gerando backup em $OutFile..."
& docker exec $ContainerName pg_dump -U $DbUser -F p $DbName | Out-File -Encoding utf8 $OutFile
Write-Host "Backup concluído."