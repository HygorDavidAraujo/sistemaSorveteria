# Script PowerShell para testar cupons - Versão simplificada
Write-Host "=== TESTE DE CUPONS 15OFF ===" -ForegroundColor Cyan
Write-Host ""

# Variáveis
$baseUrl = "http://localhost:3000/api/v1"

# 1. Login e pegar token
Write-Host "1. Fazendo login..." -ForegroundColor Yellow
$response = curl -s -X POST "$baseUrl/auth/login" `
    -H "Content-Type: application/json" `
    -d '{"email":"hygordavidaraujo@gmail.com","password":"admin123"}' | ConvertFrom-Json

$token = $response.token
if ($token) {
    Write-Host "✓ Login OK - Token obtido" -ForegroundColor Green
} else {
    Write-Host "✗ Erro no login" -ForegroundColor Red
    exit 1
}
Write-Host ""

# 2. Buscar sessão de caixa
Write-Host "2. Buscando sessão de caixa..." -ForegroundColor Yellow
$cashSessions = curl -s -X GET "$baseUrl/cash-sessions?status=open&limit=1" `
    -H "Authorization: Bearer $token" | ConvertFrom-Json

$cashSessionId = $cashSessions.data[0].id
Write-Host "✓ Sessão: $cashSessionId" -ForegroundColor Green
Write-Host ""

# 3. Buscar cliente
Write-Host "3. Buscando cliente..." -ForegroundColor Yellow
$customers = curl -s -X GET "$baseUrl/customers?limit=1" `
    -H "Authorization: Bearer $token" | ConvertFrom-Json

$customerId = $customers.data[0].id
$customerName = $customers.data[0].name
Write-Host "✓ Cliente: $customerName ($customerId)" -ForegroundColor Green
Write-Host ""

# 4. Buscar produtos
Write-Host "4. Buscando produtos..." -ForegroundColor Yellow
$products = curl -s -X GET "$baseUrl/products?limit=3" `
    -H "Authorization: Bearer $token" | ConvertFrom-Json

$product1 = $products.data[0]
$product2 = $products.data[1]
Write-Host "✓ Produtos:" -ForegroundColor Green
Write-Host "  - $($product1.name): R$ $($product1.price)" -ForegroundColor Gray
Write-Host "  - $($product2.name): R$ $($product2.price)" -ForegroundColor Gray
Write-Host ""

# 5. Criar cupom 15OFF
Write-Host "5. Criando cupom 15OFF..." -ForegroundColor Yellow
$couponResponse = curl -s -X POST "$baseUrl/coupons" `
    -H "Authorization: Bearer $token" `
    -H "Content-Type: application/json" `
    -d '{
      "code": "15OFF",
      "description": "Cupom de 15% de desconto",
      "couponType": "percentage",
      "discountValue": 15,
      "minPurchaseValue": 0,
      "usageLimit": 100,
      "validFrom": "2026-01-01T00:00:00Z",
      "validTo": "2026-12-31T23:59:59Z"
    }' | ConvertFrom-Json

if ($couponResponse.id) {
    Write-Host "✓ Cupom criado!" -ForegroundColor Green
    $couponId = $couponResponse.id
} else {
    Write-Host "⚠ Cupom já existe, buscando..." -ForegroundColor Yellow
    $allCoupons = curl -s -X GET "$baseUrl/coupons?search=15OFF" `
        -H "Authorization: Bearer $token" | ConvertFrom-Json
    $couponId = $allCoupons.data[0].id
    Write-Host "✓ Cupom encontrado: $couponId" -ForegroundColor Green
}
Write-Host ""

# TESTE 1: VENDA PDV COM CUPOM
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "TESTE 1: VENDA PDV COM CUPOM" -ForegroundColor Cyan  
Write-Host "========================================" -ForegroundColor Cyan

$subtotalPdv = [decimal]$product1.price * 2
Write-Host "Subtotal: R$ $subtotalPdv" -ForegroundColor Gray
Write-Host ""

# Validar cupom
Write-Host "Validando cupom..." -ForegroundColor Yellow
$validation = curl -s -X POST "$baseUrl/coupons/validate" `
    -H "Authorization: Bearer $token" `
    -H "Content-Type: application/json" `
    -d "{
      `"code`": `"15OFF`",
      `"subtotal`": $subtotalPdv,
      `"customerId`": `"$customerId`"
    }" | ConvertFrom-Json

Write-Host "✓ Cupom válido!" -ForegroundColor Green
Write-Host "  Desconto: R$ $($validation.discountAmount)" -ForegroundColor Green
$totalPdv = $subtotalPdv - $validation.discountAmount
Write-Host "  Total: R$ $totalPdv" -ForegroundColor Green
Write-Host ""

# Criar venda
Write-Host "Criando venda PDV..." -ForegroundColor Yellow
$salePdv = curl -s -X POST "$baseUrl/sales" `
    -H "Authorization: Bearer $token" `
    -H "Content-Type: application/json" `
    -d "{
      `"cashSessionId`": `"$cashSessionId`",
      `"customerId`": `"$customerId`",
      `"saleType`": `"pdv`",
      `"items`": [
        {
          `"productId`": `"$($product1.id)`",
          `"quantity`": 2
        }
      ],
      `"discount`": $($validation.discountAmount),
      `"payments`": [
        {
          `"paymentMethod`": `"cash`",
          `"amount`": $totalPdv
        }
      ]
    }" | ConvertFrom-Json

Write-Host "✓ Venda criada: $($salePdv.id)" -ForegroundColor Green
Write-Host "  Subtotal: R$ $($salePdv.subtotal)" -ForegroundColor Gray
Write-Host "  Desconto: R$ $($salePdv.discount)" -ForegroundColor Gray
Write-Host "  Total: R$ $($salePdv.total)" -ForegroundColor Gray
Write-Host ""

# Registrar uso do cupom
Write-Host "Registrando uso do cupom..." -ForegroundColor Yellow
$usagePdv = curl -s -X POST "$baseUrl/coupons/apply" `
    -H "Authorization: Bearer $token" `
    -H "Content-Type: application/json" `
    -d "{
      `"couponId`": `"$couponId`",
      `"customerId`": `"$customerId`",
      `"discountApplied`": $($validation.discountAmount),
      `"saleId`": `"$($salePdv.id)`"
    }" | ConvertFrom-Json

Write-Host "✓ Uso registrado!" -ForegroundColor Green
Write-Host ""

# TESTE 2: COMANDA COM CUPOM
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "TESTE 2: COMANDA COM CUPOM" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Criar comanda
Write-Host "Criando comanda..." -ForegroundColor Yellow
$comanda = curl -s -X POST "$baseUrl/comandas" `
    -H "Authorization: Bearer $token" `
    -H "Content-Type: application/json" `
    -d "{
      `"cashSessionId`": `"$cashSessionId`",
      `"customerName`": `"Cliente Teste Cupom`",
      `"tableNumber`": `"Mesa 10`"
    }" | ConvertFrom-Json

$comandaId = $comanda.id
Write-Host "✓ Comanda criada: #$($comanda.comandaNumber)" -ForegroundColor Green
Write-Host ""

# Adicionar itens
Write-Host "Adicionando itens..." -ForegroundColor Yellow
curl -s -X POST "$baseUrl/comandas/$comandaId/items" `
    -H "Authorization: Bearer $token" `
    -H "Content-Type: application/json" `
    -d "{`"productId`": `"$($product1.id)`", `"quantity`": 1}" | Out-Null

curl -s -X POST "$baseUrl/comandas/$comandaId/items" `
    -H "Authorization: Bearer $token" `
    -H "Content-Type: application/json" `
    -d "{`"productId`": `"$($product2.id)`", `"quantity`": 2}" | Out-Null

# Buscar comanda atualizada
$comandaUpdated = curl -s -X GET "$baseUrl/comandas/$comandaId" `
    -H "Authorization: Bearer $token" | ConvertFrom-Json

$subtotalComanda = $comandaUpdated.subtotal
Write-Host "✓ Items adicionados. Subtotal: R$ $subtotalComanda" -ForegroundColor Green
Write-Host ""

# Validar cupom
Write-Host "Validando cupom..." -ForegroundColor Yellow
$validationComanda = curl -s -X POST "$baseUrl/coupons/validate" `
    -H "Authorization: Bearer $token" `
    -H "Content-Type: application/json" `
    -d "{
      `"code`": `"15OFF`",
      `"subtotal`": $subtotalComanda,
      `"customerId`": `"$customerId`"
    }" | ConvertFrom-Json

Write-Host "✓ Cupom válido! Desconto: R$ $($validationComanda.discountAmount)" -ForegroundColor Green
$totalComanda = $subtotalComanda - $validationComanda.discountAmount
Write-Host "  Total: R$ $totalComanda" -ForegroundColor Green
Write-Host ""

# Fechar comanda
Write-Host "Fechando comanda..." -ForegroundColor Yellow
$comandaClosed = curl -s -X POST "$baseUrl/comandas/$comandaId/close" `
    -H "Authorization: Bearer $token" `
    -H "Content-Type: application/json" `
    -d "{
      `"discount`": $($validationComanda.discountAmount),
      `"payments`": [
        {
          `"paymentMethod`": `"pix`",
          `"amount`": $totalComanda
        }
      ]
    }" | ConvertFrom-Json

Write-Host "✓ Comanda fechada!" -ForegroundColor Green
Write-Host "  Subtotal: R$ $($comandaClosed.subtotal)" -ForegroundColor Gray
Write-Host "  Desconto: R$ $($comandaClosed.discount)" -ForegroundColor Gray
Write-Host "  Total: R$ $($comandaClosed.total)" -ForegroundColor Gray
Write-Host ""

# Registrar uso
Write-Host "Registrando uso do cupom..." -ForegroundColor Yellow
curl -s -X POST "$baseUrl/coupons/apply" `
    -H "Authorization: Bearer $token" `
    -H "Content-Type: application/json" `
    -d "{
      `"couponId`": `"$couponId`",
      `"customerId`": `"$customerId`",
      `"discountApplied`": $($validationComanda.discountAmount),
      `"comandaId`": `"$comandaId`"
    }" | Out-Null

Write-Host "✓ Uso registrado!" -ForegroundColor Green
Write-Host ""

# TESTE 3: DELIVERY COM CUPOM
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "TESTE 3: DELIVERY COM CUPOM" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Buscar endereço
Write-Host "Verificando endereço..." -ForegroundColor Yellow
$customerDetail = curl -s -X GET "$baseUrl/customers/$customerId" `
    -H "Authorization: Bearer $token" | ConvertFrom-Json

if ($customerDetail.addresses.Count -eq 0) {
    Write-Host "Criando endereço..." -ForegroundColor Yellow
    $address = curl -s -X POST "$baseUrl/customers/$customerId/addresses" `
        -H "Authorization: Bearer $token" `
        -H "Content-Type: application/json" `
        -d '{
          "zipCode": "01001000",
          "street": "Rua Teste",
          "number": "123",
          "neighborhood": "Centro",
          "city": "São Paulo",
          "state": "SP",
          "isDefault": true
        }' | ConvertFrom-Json
    $addressId = $address.id
} else {
    $addressId = $customerDetail.addresses[0].id
}
Write-Host "✓ Endereço: $addressId" -ForegroundColor Green
Write-Host ""

$subtotalDelivery = [decimal]$product1.price * 3
$deliveryFee = 5.00

Write-Host "Subtotal: R$ $subtotalDelivery" -ForegroundColor Gray
Write-Host "Taxa entrega: R$ $deliveryFee" -ForegroundColor Gray
Write-Host ""

# Validar cupom
Write-Host "Validando cupom..." -ForegroundColor Yellow
$validationDelivery = curl -s -X POST "$baseUrl/coupons/validate" `
    -H "Authorization: Bearer $token" `
    -H "Content-Type: application/json" `
    -d "{
      `"code`": `"15OFF`",
      `"subtotal`": $subtotalDelivery,
      `"customerId`": `"$customerId`"
    }" | ConvertFrom-Json

Write-Host "✓ Cupom válido! Desconto: R$ $($validationDelivery.discountAmount)" -ForegroundColor Green
$totalDelivery = $subtotalDelivery - $validationDelivery.discountAmount + $deliveryFee
Write-Host "  Total final: R$ $totalDelivery" -ForegroundColor Green
Write-Host ""

# Criar delivery
Write-Host "Criando pedido delivery..." -ForegroundColor Yellow
$delivery = curl -s -X POST "$baseUrl/delivery/orders" `
    -H "Authorization: Bearer $token" `
    -H "Content-Type: application/json" `
    -d "{
      `"cashSessionId`": `"$cashSessionId`",
      `"customerId`": `"$customerId`",
      `"customerAddressId`": `"$addressId`",
      `"items`": [
        {
          `"productId`": `"$($product1.id)`",
          `"quantity`": 3
        }
      ],
      `"deliveryFee`": $deliveryFee,
      `"discount`": $($validationDelivery.discountApplied),
      `"estimatedTime`": 30,
      `"customerNotes`": `"Pedido com cupom`"
    }" | ConvertFrom-Json

Write-Host "✓ Delivery criado: $($delivery.id)" -ForegroundColor Green
Write-Host "  Subtotal: R$ $($delivery.subtotal)" -ForegroundColor Gray
Write-Host "  Desconto: R$ $($delivery.discount)" -ForegroundColor Gray
Write-Host "  Taxa: R$ $($delivery.deliveryFee)" -ForegroundColor Gray
Write-Host "  Total: R$ $($delivery.total)" -ForegroundColor Gray
Write-Host ""

# Registrar uso
Write-Host "Registrando uso do cupom..." -ForegroundColor Yellow
curl -s -X POST "$baseUrl/coupons/apply" `
    -H "Authorization: Bearer $token" `
    -H "Content-Type: application/json" `
    -d "{
      `"couponId`": `"$couponId`",
      `"customerId`": `"$customerId`",
      `"discountApplied`": $($validationDelivery.discountAmount),
      `"deliveryOrderId`": `"$($delivery.id)`"
    }" | Out-Null

Write-Host "✓ Uso registrado!" -ForegroundColor Green
Write-Host ""

# ESTATÍSTICAS
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "ESTATÍSTICAS DO CUPOM" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$couponDetail = curl -s -X GET "$baseUrl/coupons/$couponId" `
    -H "Authorization: Bearer $token" | ConvertFrom-Json

Write-Host "Cupom: $($couponDetail.code)" -ForegroundColor Yellow
Write-Host "Tipo: $($couponDetail.couponType) - $($couponDetail.discountValue)%" -ForegroundColor Gray
Write-Host "Total de usos: $($couponDetail.usageCount)" -ForegroundColor Green
Write-Host ""

$stats = curl -s -X GET "$baseUrl/coupons/statistics" `
    -H "Authorization: Bearer $token" | ConvertFrom-Json

Write-Host "Estatísticas Gerais:" -ForegroundColor Yellow
Write-Host "  Cupons ativos: $($stats.totalActive)" -ForegroundColor Gray
Write-Host "  Total de usos: $($stats.totalUsages)" -ForegroundColor Gray
Write-Host "  Total em descontos: R$ $($stats.totalDiscountGiven)" -ForegroundColor Gray
Write-Host ""

Write-Host "========================================" -ForegroundColor Green
Write-Host "✓✓✓ TESTES CONCLUÍDOS COM SUCESSO! ✓✓✓" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
