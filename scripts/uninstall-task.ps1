# Script para remover Tarefa Agendada do Sistema Sorveteria
# Execute como Administrador

param(
    [string]$TaskName = 'SistemaSorveteria'
)

$ErrorActionPreference = 'Stop'

# Verificar se está rodando como Admin
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "ERRO: Este script precisa ser executado como Administrador!" -ForegroundColor Red
    exit 1
}

Write-Host "=== Removendo Tarefa: $TaskName ===" -ForegroundColor Cyan

# Verificar se tarefa existe
$task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if (-not $task) {
    Write-Host "Tarefa '$TaskName' não encontrada." -ForegroundColor Yellow
    exit 0
}

# Parar se estiver rodando
if ($task.State -eq 'Running') {
    Write-Host "Parando tarefa..." -ForegroundColor Yellow
    Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
}

Write-Host "Removendo tarefa..." -ForegroundColor Yellow
Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false

Write-Host ""
Write-Host "[OK] Tarefa removida com sucesso!" -ForegroundColor Green
