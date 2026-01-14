$ErrorActionPreference = 'Stop'

param(
  [string]$SessionId = '',
  [switch]$DryRun
)

Write-Host "Backfill: Fechamento de Caixa -> Financeiro > Transações" -ForegroundColor Cyan

$args = @()
if ($DryRun) { $args += '--dry-run' }
if ($SessionId) { $args += "--session-id=$SessionId" }

$argsText = ($args -join ' ')

docker exec gelatini-backend sh -lc "cd /app && npx --yes tsx src/scripts/backfill-cash-session-close-transactions.ts $argsText"
