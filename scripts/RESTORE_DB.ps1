# Restore do Postgres via Docker
# Uso: ./scripts/RESTORE_DB.ps1 -ContainerName "gelatini-postgres" -DbName "gelatini_db" -DbUser "gelatini" -InFile "C:\Backups\gelatini_db.sql"

param(
  [Parameter(Mandatory=$true)][string]$ContainerName,
  [Parameter(Mandatory=$true)][string]$DbName,
  [Parameter(Mandatory=$true)][string]$DbUser,
  [Parameter(Mandatory=$true)][string]$InFile
)

$ErrorActionPreference = "Stop"

if (!(Test-Path $InFile)) {
  throw "Arquivo de backup não encontrado: $InFile"
}

Write-Host "Restaurando banco a partir de $InFile..."
Get-Content $InFile | docker exec -i $ContainerName psql -U $DbUser -d $DbName
Write-Host "Restore concluído."