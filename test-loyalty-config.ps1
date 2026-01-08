#!/usr/bin/env pwsh
# Teste: Salvar configurações de Pontos de Lealdade (PATCH /loyalty/config)
# Credenciais: hygordavidaraujo@gmail.com / admin123

$baseUrl = "http://localhost:3000/api/v1"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "TESTE: SALVAR CONFIGURAÇÃO DE PONTOS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# 1. LOGIN
Write-Host "`n1. Fazendo login..." -ForegroundColor Yellow
$auth = curl -s -X POST "$baseUrl/auth/login" `
  -H "Content-Type: application/json" `
  -d '{"email":"hygordavidaraujo@gmail.com","password":"admin123"}' | ConvertFrom-Json

$TOKEN = $auth.data.accessToken
if (!$TOKEN) {
    Write-Host "❌ Erro ao fazer login" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Login OK" -ForegroundColor Green

# 2. OBTER CONFIGURAÇÃO ATUAL
Write-Host "`n2. Obtendo configuração atual..." -ForegroundColor Yellow
$currentConfig = curl -s -X GET "$baseUrl/loyalty/config" `
  -H "Authorization: Bearer $TOKEN" | ConvertFrom-Json

Write-Host "✅ Configuração atual:" -ForegroundColor Green
$currentConfig | ConvertTo-Json

# 3. MODIFICAR CONFIGURAÇÃO
Write-Host "`n3. Modificando configuração..." -ForegroundColor Yellow
$newConfig = @{
    pointsPerReal = 10
    minPurchaseForPoints = 15
    pointsExpirationDays = 180
    minPointsToRedeem = 50
    pointsRedemptionValue = 0.05
    isActive = $true
    applyToAllProducts = $true
} | ConvertTo-Json

Write-Host "Novos valores:" -ForegroundColor Cyan
$newConfig | ConvertFrom-Json | ConvertTo-Json

# 4. SALVAR CONFIGURAÇÃO (PATCH - CORRIGIDO)
Write-Host "`n4. Salvando configuração (PATCH)..." -ForegroundColor Yellow
$savedConfig = curl -s -X PATCH "$baseUrl/loyalty/config" `
  -H "Authorization: Bearer $TOKEN" `
  -H "Content-Type: application/json" `
  -d $newConfig | ConvertFrom-Json

if ($savedConfig.status -eq "error" -or $savedConfig.error) {
    Write-Host "❌ Erro ao salvar:" -ForegroundColor Red
    $savedConfig | ConvertTo-Json
    exit 1
}

Write-Host "✅ Configuração salva com sucesso!" -ForegroundColor Green
$savedConfig | ConvertTo-Json -Depth 5

# 5. VERIFICAR SE FOI REALMENTE SALVA
Write-Host "`n5. Verificando se foi salva..." -ForegroundColor Yellow
$verifyConfig = curl -s -X GET "$baseUrl/loyalty/config" `
  -H "Authorization: Bearer $TOKEN" | ConvertFrom-Json

Write-Host "✅ Configuração verificada:" -ForegroundColor Green
$verifyConfig | ConvertTo-Json

# 6. VALIDAR VALORES
Write-Host "`n" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Green
Write-Host "✅ TESTE FINALIZADO COM SUCESSO!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

if ($verifyConfig.pointsPerReal -eq 10 -and $verifyConfig.minPointsToRedeem -eq 50) {
    Write-Host "✅ ✅ ✅ TODOS OS VALORES FOI SALVO CORRETAMENTE!" -ForegroundColor Green
    Write-Host "   Pontos por Real: $($verifyConfig.pointsPerReal)" -ForegroundColor Green
    Write-Host "   Min para resgatar: $($verifyConfig.minPointsToRedeem)" -ForegroundColor Green
} else {
    Write-Host "❌ VALORES NÃO FORAM SALVO CORRETAMENTE!" -ForegroundColor Red
}
