# Script para criar Tarefa Agendada do Sistema Sorveteria
# Execute como Administrador

param(
    [ValidateSet("dev", "prod")]
    [string]$Mode = "dev",
    [string]$TaskName = "SistemaSorveteria",
    [switch]$RunAtStartup = $true
)

$ErrorActionPreference = "Stop"

# Verificar se esta rodando como Admin
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "ERRO: Este script precisa ser executado como Administrador!" -ForegroundColor Red
    Write-Host "Clique com botao direito no PowerShell e selecione Executar como Administrador" -ForegroundColor Yellow
    exit 1
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = Split-Path -Parent $scriptDir
$startupScript = Join-Path $scriptDir "startup-host.ps1"

Write-Host "=== Criando Tarefa Agendada: $TaskName ===" -ForegroundColor Cyan
Write-Host "Script: $startupScript" -ForegroundColor Gray
Write-Host "Modo: $Mode" -ForegroundColor Gray
Write-Host ""

# Remover tarefa existente se houver
$existingTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($existingTask) {
    Write-Host "Removendo tarefa existente..." -ForegroundColor Yellow
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}

# Criar acao
$action = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument "-ExecutionPolicy Bypass -WindowStyle Hidden -File `"$startupScript`" -Mode $Mode" `
    -WorkingDirectory $root

# Criar gatilho (trigger)
if ($RunAtStartup) {
    # Executar na inicializacao do sistema com delay de 60 segundos
    $trigger = New-ScheduledTaskTrigger -AtStartup
    $trigger.Delay = "PT60S"
} else {
    # Executar no login do usuario
    $trigger = New-ScheduledTaskTrigger -AtLogOn
}

# Criar principal (executar com maior privilegio)
$principal = New-ScheduledTaskPrincipal `
    -UserId "$env:USERDOMAIN\$env:USERNAME" `
    -LogonType Interactive `
    -RunLevel Highest

# Configuracoes
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RestartCount 3 `
    -RestartInterval (New-TimeSpan -Minutes 1) `
    -ExecutionTimeLimit (New-TimeSpan -Hours 0)

# Registrar tarefa
Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $action `
    -Trigger $trigger `
    -Principal $principal `
    -Settings $settings `
    -Description "Sistema Sorveteria ERP/PDV - Inicia automaticamente backend, frontend e infraestrutura Docker" | Out-Null

Write-Host ""
Write-Host "Tarefa criada com sucesso!" -ForegroundColor Green
Write-Host ""
Write-Host "Detalhes da Tarefa:" -ForegroundColor Cyan
Write-Host "  Nome: $TaskName" -ForegroundColor Gray
Write-Host "  Usuario: $env:USERNAME" -ForegroundColor Gray
Write-Host "  Modo: $Mode" -ForegroundColor Gray
Write-Host ""
Write-Host "Comandos uteis:" -ForegroundColor Cyan
Write-Host "  Executar agora:  Start-ScheduledTask -TaskName $TaskName" -ForegroundColor Gray
Write-Host "  Parar:           Stop-ScheduledTask -TaskName $TaskName" -ForegroundColor Gray
Write-Host "  Status:          Get-ScheduledTask -TaskName $TaskName" -ForegroundColor Gray
Write-Host "  Remover:         Unregister-ScheduledTask -TaskName $TaskName -Confirm:`$false" -ForegroundColor Gray
Write-Host ""
Write-Host "Ou abra o Agendador de Tarefas: taskschd.msc" -ForegroundColor Gray
Write-Host ""

# Perguntar se deseja executar agora
$start = Read-Host "Deseja executar a tarefa agora? (S/N)"
if ($start -eq "S" -or $start -eq "s") {
    Write-Host "Executando tarefa..." -ForegroundColor Cyan
    Start-ScheduledTask -TaskName $TaskName
    Start-Sleep -Seconds 2
    
    $taskInfo = Get-ScheduledTask -TaskName $TaskName
    Write-Host "Status: $($taskInfo.State)" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "Aguarde alguns instantes para o sistema inicializar..." -ForegroundColor Gray
    Write-Host "Backend estara em: http://localhost:3333" -ForegroundColor Cyan
    $frontendPort = if ($Mode -eq "prod") { "4173" } else { "5173" }
    Write-Host "Frontend estara em: http://localhost:$frontendPort" -ForegroundColor Cyan
}
