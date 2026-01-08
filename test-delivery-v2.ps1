#!/usr/bin/env pwsh
# Script para testar criação de pedido de delivery COM customer vinculado
# Credenciais: hygordavidaraujo@gmail.com / admin123

$baseUrl = "http://localhost:3000/api/v1"

# 1. LOGIN
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "TESTE: CRIAR PEDIDO DE DELIVERY" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

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

# 2. CRIAR CLIENTE
Write-Host "`n2. Criando cliente de teste..." -ForegroundColor Yellow
$newCustomer = curl -s -X POST "$baseUrl/customers" `
  -H "Authorization: Bearer $TOKEN" `
  -H "Content-Type: application/json" `
  -d '{"name":"Cliente Teste Delivery","phone":"1133334444","whatsapp":"1133334444","email":"cliente@teste.com"}' | ConvertFrom-Json

if ($newCustomer.status -eq "error") {
    Write-Host "⚠️  Cliente pode já existir: $($newCustomer.message)" -ForegroundColor Yellow
    # Pegar customers existentes
    $customers = curl -s -X GET "$baseUrl/customers" `
      -H "Authorization: Bearer $TOKEN" | ConvertFrom-Json
    $customerId = $customers.data[0].id
} else {
    $customerId = $newCustomer.data.id
}
Write-Host "✅ Cliente: $customerId" -ForegroundColor Green

# 3. OBTER CASH SESSION
Write-Host "`n3. Obtendo cash session..." -ForegroundColor Yellow
$sessions = curl -s -X GET "$baseUrl/cash-sessions" `
  -H "Authorization: Bearer $TOKEN" | ConvertFrom-Json

if (!$sessions.data -or $sessions.data.Count -eq 0) {
    Write-Host "⚠️  Nenhuma cash session, criando..." -ForegroundColor Yellow
    $newSession = curl -s -X POST "$baseUrl/cash-sessions" `
      -H "Authorization: Bearer $TOKEN" `
      -H "Content-Type: application/json" `
      -d '{"terminalId":"TERM-001","initialCash":1000}' | ConvertFrom-Json
    $cashSessionId = $newSession.data.id
} else {
    $cashSessionId = $sessions.data[0].id
}
Write-Host "✅ Cash Session: $cashSessionId" -ForegroundColor Green

# 4. OBTER PRODUTO
Write-Host "`n4. Obtendo produto..." -ForegroundColor Yellow
$products = curl -s -X GET "$baseUrl/products" `
  -H "Authorization: Bearer $TOKEN" | ConvertFrom-Json

$productId = $products.data[0].id
Write-Host "✅ Produto: $($products.data[0].name) ($productId)" -ForegroundColor Green

# 5. CRIAR PEDIDO DE DELIVERY COM CUSTOMER VINCULADO
Write-Host "`n5. Criando pedido de delivery..." -ForegroundColor Yellow

$delivery = curl -s -X POST "$baseUrl/delivery/orders" `
  -H "Authorization: Bearer $TOKEN" `
  -H "Content-Type: application/json" `
  -d @"
{
  "customerId": "$customerId",
  "cashSessionId": "$cashSessionId",
  "items": [
    {
      "productId": "$productId",
      "quantity": 2
    }
  ],
  "deliveryFee": 5.00,
  "discount": 0,
  "estimatedTime": 30,
  "customerNotes": "Teste de entrega"
}
"@ | ConvertFrom-Json

if ($delivery.status -eq "error") {
    Write-Host "❌ Erro: $($delivery.message)" -ForegroundColor Red
    Write-Host $delivery | ConvertTo-Json
    exit 1
}

Write-Host "✅ Pedido criado com sucesso!" -ForegroundColor Green
Write-Host "`n📋 RESULTADO:" -ForegroundColor Cyan
$delivery | ConvertTo-Json -Depth 5 | Write-Host

# 6. VERIFICAR SE CUSTOMER FOI VINCULADO
Write-Host "`n" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Green
Write-Host "✅ TESTE FINALIZADO" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

if ($delivery.data.customerId -eq $customerId) {
    Write-Host "✅ ✅ ✅ CLIENTE VINCULADO COM SUCESSO!" -ForegroundColor Green
    Write-Host "   Esperado:  $customerId" -ForegroundColor Green
    Write-Host "   Recebido:  $($delivery.data.customerId)" -ForegroundColor Green
} else {
    Write-Host "❌ ERRO: Cliente NÃO foi vinculado!" -ForegroundColor Red
    Write-Host "   Esperado:  $customerId" -ForegroundColor Red
    Write-Host "   Recebido:  $($delivery.data.customerId)" -ForegroundColor Red
}
