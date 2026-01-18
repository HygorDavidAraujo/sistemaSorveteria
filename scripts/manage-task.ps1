# Script para gerenciar Tarefa Agendada do Sistema Sorveteria
# Execute como Administrador

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet('start', 'stop', 'status', 'enable', 'disable', 'logs')]
    [string]$Action,
    [string]$TaskName = 'SistemaSorveteria'
)

$ErrorActionPreference = 'Stop'

# Verificar se está rodando como Admin para ações que requerem
if ($Action -in @('start', 'stop', 'enable', 'disable')) {
    $isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
    if (-not $isAdmin) {
        Write-Host "ERRO: Esta ação requer privilégios de Administrador!" -ForegroundColor Red
        exit 1
    }
}

# Verificar se tarefa existe
$task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if (-not $task) {
    Write-Host "ERRO: Tarefa '$TaskName' não encontrada." -ForegroundColor Red
    Write-Host "Execute install-task.ps1 para criar a tarefa." -ForegroundColor Yellow
    exit 1
}

switch ($Action) {
    'start' {
        Write-Host "Iniciando tarefa '$TaskName'..." -ForegroundColor Cyan
        Start-ScheduledTask -TaskName $TaskName
        Start-Sleep -Seconds 2
        $taskInfo = Get-ScheduledTask -TaskName $TaskName
        Write-Host "Status: $($taskInfo.State)" -ForegroundColor Green
    }
    
    'stop' {
        Write-Host "Parando tarefa '$TaskName'..." -ForegroundColor Cyan
        Stop-ScheduledTask -TaskName $TaskName
        Write-Host "Tarefa parada." -ForegroundColor Green
    }
    
    'status' {
        $taskInfo = Get-ScheduledTask -TaskName $TaskName
        $lastRun = Get-ScheduledTaskInfo -TaskName $TaskName
        
        Write-Host ""
        Write-Host "=== Status da Tarefa: $TaskName ===" -ForegroundColor Cyan
        Write-Host "Estado: $($taskInfo.State)" -ForegroundColor $(if ($taskInfo.State -eq 'Running') { 'Green' } elseif ($taskInfo.State -eq 'Ready') { 'Yellow' } else { 'Red' })
        Write-Host "Habilitada: $(if ($taskInfo.State -ne 'Disabled') { 'Sim' } else { 'Não' })" -ForegroundColor Gray
        Write-Host "Última Execução: $($lastRun.LastRunTime)" -ForegroundColor Gray
        Write-Host "Resultado: $($lastRun.LastTaskResult) $(if ($lastRun.LastTaskResult -eq 0) { '(Sucesso)' } else { '(Erro)' })" -ForegroundColor Gray
        Write-Host "Próxima Execução: $($lastRun.NextRunTime)" -ForegroundColor Gray
        Write-Host "Gatilhos:" -ForegroundColor Gray
        foreach ($trigger in $taskInfo.Triggers) {
            Write-Host "  - $($trigger.CimClass.CimClassName)" -ForegroundColor Gray
        }
        Write-Host ""
    }
    
    'enable' {
        Write-Host "Habilitando tarefa '$TaskName'..." -ForegroundColor Cyan
        Enable-ScheduledTask -TaskName $TaskName | Out-Null
        Write-Host "Tarefa habilitada." -ForegroundColor Green
    }
    
    'disable' {
        Write-Host "Desabilitando tarefa '$TaskName'..." -ForegroundColor Cyan
        Disable-ScheduledTask -TaskName $TaskName | Out-Null
        Write-Host "Tarefa desabilitada." -ForegroundColor Green
        Write-Host "Use 'manage-task.ps1 -Action enable' para reabilitar." -ForegroundColor Yellow
    }
    
    'logs' {
        Write-Host "=== Eventos da Tarefa no Log do Windows ===" -ForegroundColor Cyan
        Write-Host ""
        
        # Buscar eventos do Task Scheduler para esta tarefa
        $events = Get-WinEvent -FilterHashtable @{
            LogName = 'Microsoft-Windows-TaskScheduler/Operational'
            TaskName = "\$TaskName"
        } -MaxEvents 10 -ErrorAction SilentlyContinue
        
        if ($events) {
            foreach ($event in $events) {
                $color = switch ($event.LevelDisplayName) {
                    'Error' { 'Red' }
                    'Warning' { 'Yellow' }
                    default { 'Gray' }
                }
                Write-Host "[$($event.TimeCreated)] $($event.LevelDisplayName): $($event.Message)" -ForegroundColor $color
            }
        } else {
            Write-Host "Nenhum evento encontrado." -ForegroundColor Yellow
        }
        
        Write-Host ""
        Write-Host "Para ver todos os logs: eventvwr.msc" -ForegroundColor Gray
        Write-Host "Navegue até: Logs de Aplicativos e Serviços > Microsoft > Windows > TaskScheduler > Operational" -ForegroundColor Gray
    }
}
