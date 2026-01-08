#!/usr/bin/env pwsh
# Teste completo: Persistência de Configurações de Loyalty e Cashback
# Valida que os dados salvos são recuperados corretamente

$baseUrl = "http://localhost:3000/api/v1"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "TESTE: PERSISTÊNCIA DE CONFIGURAÇÕES" -ForegroundColor Cyan
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

# 2. LOYALTY CONFIG - SALVAR NOVOS VALORES
Write-Host "`n2. Salvando nova configuração LOYALTY..." -ForegroundColor Yellow
$loyaltyData = @{
    pointsPerReal = 5
    minPurchaseForPoints = 20
    pointsExpirationDays = 120
    minPointsToRedeem = 150
} | ConvertTo-Json

$loyaltyResponse = curl -s -X PATCH "$baseUrl/loyalty/config" `
  -H "Authorization: Bearer $TOKEN" `
  -H "Content-Type: application/json" `
  -d $loyaltyData | ConvertFrom-Json

if ($loyaltyResponse.data) {
    Write-Host "✅ Loyalty salvo:" -ForegroundColor Green
    Write-Host "   Pontos/Real: $($loyaltyResponse.data.pointsPerReal)" -ForegroundColor Green
    Write-Host "   Min para resgatar: $($loyaltyResponse.data.minPointsToRedeem)" -ForegroundColor Green
}

# 3. CASHBACK CONFIG - SALVAR NOVOS VALORES  
Write-Host "`n3. Salvando nova configuração CASHBACK..." -ForegroundColor Yellow
$cashbackData = @{
    cashbackPercentage = 3.5
    minPurchaseForCashback = 25
    minCashbackToUse = 10
} | ConvertTo-Json

$cashbackResponse = curl -s -X PATCH "$baseUrl/cashback/config" `
  -H "Authorization: Bearer $TOKEN" `
  -H "Content-Type: application/json" `
  -d $cashbackData | ConvertFrom-Json

if ($cashbackResponse.data) {
    Write-Host "✅ Cashback salvo:" -ForegroundColor Green
    Write-Host "   Percentual: $($cashbackResponse.data.cashbackPercentage)%" -ForegroundColor Green
    Write-Host "   Min para usar: R$ $($cashbackResponse.data.minCashbackToUse)" -ForegroundColor Green
}

# 4. AGUARDAR E RECARREGAR DADOS - VERIFICAR PERSISTÊNCIA
Write-Host "`n4. Aguardando 2 segundos e recarregando dados..." -ForegroundColor Yellow
Start-Sleep -Seconds 2

$loyaltyVerify = curl -s -X GET "$baseUrl/loyalty/config" `
  -H "Authorization: Bearer $TOKEN" | ConvertFrom-Json

$cashbackVerify = curl -s -X GET "$baseUrl/cashback/config" `
  -H "Authorization: Bearer $TOKEN" | ConvertFrom-Json

# 5. VALIDAR PERSISTÊNCIA
Write-Host "`n" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Green
Write-Host "VALIDAÇÃO DE PERSISTÊNCIA" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

$loyaltyOk = ($loyaltyVerify.pointsPerReal -eq "5" -and $loyaltyVerify.minPointsToRedeem -eq 150)
$cashbackOk = ($cashbackVerify.cashbackPercentage -eq "3.5" -and $cashbackVerify.minCashbackToUse -eq 10)

Write-Host "`n📊 LOYALTY CONFIG:" -ForegroundColor Cyan
Write-Host "Pontos/Real: $($loyaltyVerify.pointsPerReal) $(if($loyaltyVerify.pointsPerReal -eq '5') {'✅'} else {'❌'})" -ForegroundColor White
Write-Host "Min para resgatar: $($loyaltyVerify.minPointsToRedeem) $(if($loyaltyVerify.minPointsToRedeem -eq 150) {'✅'} else {'❌'})" -ForegroundColor White
Write-Host "Compra mínima: $($loyaltyVerify.minPurchaseForPoints) $(if($loyaltyVerify.minPurchaseForPoints -eq 20) {'✅'} else {'❌'})" -ForegroundColor White
Write-Host "Validade: $($loyaltyVerify.pointsExpirationDays) dias $(if($loyaltyVerify.pointsExpirationDays -eq 120) {'✅'} else {'❌'})" -ForegroundColor White

Write-Host "`n💰 CASHBACK CONFIG:" -ForegroundColor Cyan
Write-Host "Percentual: $($cashbackVerify.cashbackPercentage)% $(if($cashbackVerify.cashbackPercentage -eq '3.5') {'✅'} else {'❌'})" -ForegroundColor White
Write-Host "Min compra: R$ $($cashbackVerify.minPurchaseForCashback) $(if($cashbackVerify.minPurchaseForCashback -eq 25) {'✅'} else {'❌'})" -ForegroundColor White
Write-Host "Min para usar: R$ $($cashbackVerify.minCashbackToUse) $(if($cashbackVerify.minCashbackToUse -eq 10) {'✅'} else {'❌'})" -ForegroundColor White

Write-Host "`n" -ForegroundColor Cyan
if ($loyaltyOk -and $cashbackOk) {
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "✅ ✅ ✅ PERSISTÊNCIA FUNCIONANDO!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "Dados salvos e recuperados corretamente" -ForegroundColor Green
} else {
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "❌ ERRO NA PERSISTÊNCIA!" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
}
