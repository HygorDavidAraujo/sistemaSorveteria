# Script de Teste - API de Cupons
Write-Host "=== Teste de Cupons 15%OFF ===" -ForegroundColor Cyan
Write-Host ""

# 1. Login
Write-Host "1. Fazendo login..." -ForegroundColor Yellow
$loginBody = @{
    email = "hygordavidaraujo@gmail.com"
    password = "admin123"
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/auth/login" `
    -Method POST `
    -Body $loginBody `
    -ContentType "application/json"

$token = $loginResponse.token
Write-Host "✓ Login realizado com sucesso!" -ForegroundColor Green
Write-Host "Token: $($token.Substring(0,30))..." -ForegroundColor Gray
Write-Host ""

# Headers com token
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

# 2. Obter sessão de caixa ativa
Write-Host "2. Buscando sessão de caixa ativa..." -ForegroundColor Yellow
$cashSessions = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/cash-sessions?status=open&limit=1" `
    -Method GET `
    -Headers $headers

$cashSessionId = $cashSessions.data[0].id
Write-Host "✓ Sessão de caixa encontrada: $cashSessionId" -ForegroundColor Green
Write-Host ""

# 3. Buscar cliente
Write-Host "3. Buscando cliente..." -ForegroundColor Yellow
$customers = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/customers?limit=1" `
    -Method GET `
    -Headers $headers

$customerId = $customers.data[0].id
Write-Host "✓ Cliente encontrado: $($customers.data[0].name) - $customerId" -ForegroundColor Green
Write-Host ""

# 4. Buscar produtos
Write-Host "4. Buscando produtos..." -ForegroundColor Yellow
$products = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/products?limit=2" `
    -Method GET `
    -Headers $headers

$product1 = $products.data[0]
$product2 = $products.data[1]
Write-Host "✓ Produtos encontrados:" -ForegroundColor Green
Write-Host "  - $($product1.name): R$ $($product1.price)" -ForegroundColor Gray
Write-Host "  - $($product2.name): R$ $($product2.price)" -ForegroundColor Gray
Write-Host ""

# 5. Criar Cupom 15%OFF
Write-Host "5. Criando cupom 15%OFF..." -ForegroundColor Yellow
$couponBody = @{
    code = "15OFF"
    description = "Cupom de 15% de desconto"
    couponType = "percentage"
    discountValue = 15
    minPurchaseValue = 0
    usageLimit = 100
    validFrom = "2026-01-01T00:00:00Z"
    validTo = "2026-12-31T23:59:59Z"
} | ConvertTo-Json

try {
    $coupon = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/coupons" `
        -Method POST `
        -Body $couponBody `
        -Headers $headers
    Write-Host "✓ Cupom criado com sucesso!" -ForegroundColor Green
    Write-Host "  Código: $($coupon.code)" -ForegroundColor Gray
    Write-Host "  Desconto: $($coupon.discountValue)%" -ForegroundColor Gray
    $couponId = $coupon.id
} catch {
    Write-Host "⚠ Cupom já existe, buscando..." -ForegroundColor Yellow
    $coupons = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/coupons?search=15OFF" `
        -Method GET `
        -Headers $headers
    $coupon = $coupons.data[0]
    $couponId = $coupon.id
    Write-Host "✓ Cupom encontrado: $($coupon.code)" -ForegroundColor Green
}
Write-Host ""

# 6. Teste 1: Venda PDV com cupom
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "TESTE 1: VENDA PDV COM CUPOM" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

$subtotalPdv = [decimal]$product1.price * 2
Write-Host "Subtotal da venda: R$ $subtotalPdv" -ForegroundColor Gray

# Validar cupom
Write-Host "Validando cupom..." -ForegroundColor Yellow
$validateBody = @{
    code = "15OFF"
    subtotal = $subtotalPdv
    customerId = $customerId
} | ConvertTo-Json

$validation = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/coupons/validate" `
    -Method POST `
    -Body $validateBody `
    -Headers $headers

Write-Host "✓ Cupom válido!" -ForegroundColor Green
Write-Host "  Desconto aplicado: R$ $($validation.discountAmount)" -ForegroundColor Gray
Write-Host "  Total com desconto: R$ $($subtotalPdv - $validation.discountAmount)" -ForegroundColor Gray
Write-Host ""

# Criar venda PDV com desconto do cupom
Write-Host "Criando venda PDV com cupom..." -ForegroundColor Yellow
$salePdvBody = @{
    cashSessionId = $cashSessionId
    customerId = $customerId
    saleType = "pdv"
    items = @(
        @{
            productId = $product1.id
            quantity = 2
        }
    )
    discount = $validation.discountAmount
    payments = @(
        @{
            paymentMethod = "cash"
            amount = $subtotalPdv - $validation.discountAmount
        }
    )
} | ConvertTo-Json -Depth 10

$salePdv = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/sales" `
    -Method POST `
    -Body $salePdvBody `
    -Headers $headers

Write-Host "✓ Venda PDV criada!" -ForegroundColor Green
Write-Host "  ID: $($salePdv.id)" -ForegroundColor Gray
Write-Host "  Subtotal: R$ $($salePdv.subtotal)" -ForegroundColor Gray
Write-Host "  Desconto: R$ $($salePdv.discount)" -ForegroundColor Gray
Write-Host "  Total: R$ $($salePdv.total)" -ForegroundColor Gray
Write-Host ""

# Registrar uso do cupom
Write-Host "Registrando uso do cupom na venda..." -ForegroundColor Yellow
$applyPdvBody = @{
    couponId = $couponId
    customerId = $customerId
    discountApplied = $validation.discountAmount
    saleId = $salePdv.id
} | ConvertTo-Json

$usagePdv = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/coupons/apply" `
    -Method POST `
    -Body $applyPdvBody `
    -Headers $headers

Write-Host "✓ Uso do cupom registrado!" -ForegroundColor Green
Write-Host ""

# 7. Teste 2: Comanda com cupom
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "TESTE 2: COMANDA COM CUPOM" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

# Criar comanda
Write-Host "Criando comanda..." -ForegroundColor Yellow
$comandaBody = @{
    cashSessionId = $cashSessionId
    customerName = "Cliente Teste Cupom"
    tableNumber = "Mesa 10"
} | ConvertTo-Json

$comanda = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/comandas" `
    -Method POST `
    -Body $comandaBody `
    -Headers $headers

Write-Host "✓ Comanda criada: #$($comanda.comandaNumber)" -ForegroundColor Green
$comandaId = $comanda.id
Write-Host ""

# Adicionar itens
Write-Host "Adicionando itens na comanda..." -ForegroundColor Yellow
$item1Body = @{
    productId = $product1.id
    quantity = 1
} | ConvertTo-Json

$item2Body = @{
    productId = $product2.id
    quantity = 2
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/v1/comandas/$comandaId/items" `
    -Method POST `
    -Body $item1Body `
    -Headers $headers | Out-Null

Invoke-RestMethod -Uri "http://localhost:3000/api/v1/comandas/$comandaId/items" `
    -Method POST `
    -Body $item2Body `
    -Headers $headers | Out-Null

Write-Host "✓ Itens adicionados!" -ForegroundColor Green
Write-Host ""

# Buscar comanda atualizada
$comandaUpdated = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/comandas/$comandaId" `
    -Method GET `
    -Headers $headers

$subtotalComanda = $comandaUpdated.subtotal
Write-Host "Subtotal da comanda: R$ $subtotalComanda" -ForegroundColor Gray

# Validar cupom para comanda
Write-Host "Validando cupom para comanda..." -ForegroundColor Yellow
$validateComandaBody = @{
    code = "15OFF"
    subtotal = $subtotalComanda
    customerId = $customerId
} | ConvertTo-Json

$validationComanda = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/coupons/validate" `
    -Method POST `
    -Body $validateComandaBody `
    -Headers $headers

Write-Host "✓ Cupom válido!" -ForegroundColor Green
Write-Host "  Desconto: R$ $($validationComanda.discountAmount)" -ForegroundColor Gray
Write-Host ""

# Fechar comanda com cupom
Write-Host "Fechando comanda com cupom..." -ForegroundColor Yellow
$closeComandaBody = @{
    discount = $validationComanda.discountAmount
    payments = @(
        @{
            paymentMethod = "pix"
            amount = $subtotalComanda - $validationComanda.discountAmount
        }
    )
} | ConvertTo-Json -Depth 10

$comandaClosed = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/comandas/$comandaId/close" `
    -Method POST `
    -Body $closeComandaBody `
    -Headers $headers

Write-Host "✓ Comanda fechada!" -ForegroundColor Green
Write-Host "  Subtotal: R$ $($comandaClosed.subtotal)" -ForegroundColor Gray
Write-Host "  Desconto: R$ $($comandaClosed.discount)" -ForegroundColor Gray
Write-Host "  Total: R$ $($comandaClosed.total)" -ForegroundColor Gray
Write-Host ""

# Registrar uso do cupom na comanda
Write-Host "Registrando uso do cupom na comanda..." -ForegroundColor Yellow
$applyComandaBody = @{
    couponId = $couponId
    customerId = $customerId
    discountApplied = $validationComanda.discountAmount
    comandaId = $comandaId
} | ConvertTo-Json

$usageComanda = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/coupons/apply" `
    -Method POST `
    -Body $applyComandaBody `
    -Headers $headers

Write-Host "✓ Uso do cupom registrado!" -ForegroundColor Green
Write-Host ""

# 8. Teste 3: Delivery com cupom
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "TESTE 3: DELIVERY COM CUPOM" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

# Buscar endereço do cliente
Write-Host "Buscando endereço do cliente..." -ForegroundColor Yellow
$customerDetail = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/customers/$customerId" `
    -Method GET `
    -Headers $headers

if ($customerDetail.addresses.Count -eq 0) {
    Write-Host "Cliente não tem endereço, criando..." -ForegroundColor Yellow
    $addressBody = @{
        zipCode = "01001000"
        street = "Rua Teste"
        number = "123"
        neighborhood = "Centro"
        city = "São Paulo"
        state = "SP"
        isDefault = $true
    } | ConvertTo-Json

    $address = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/customers/$customerId/addresses" `
        -Method POST `
        -Body $addressBody `
        -Headers $headers
    $addressId = $address.id
} else {
    $addressId = $customerDetail.addresses[0].id
}
Write-Host "✓ Endereço: $addressId" -ForegroundColor Green
Write-Host ""

# Criar pedido delivery
$subtotalDelivery = [decimal]$product1.price * 3
$deliveryFee = 5.00

Write-Host "Criando pedido delivery..." -ForegroundColor Yellow
Write-Host "  Subtotal: R$ $subtotalDelivery" -ForegroundColor Gray
Write-Host "  Taxa de entrega: R$ $deliveryFee" -ForegroundColor Gray

# Validar cupom (apenas no subtotal, sem taxa de entrega)
$validateDeliveryBody = @{
    code = "15OFF"
    subtotal = $subtotalDelivery
    customerId = $customerId
} | ConvertTo-Json

$validationDelivery = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/coupons/validate" `
    -Method POST `
    -Body $validateDeliveryBody `
    -Headers $headers

Write-Host "✓ Cupom válido para delivery!" -ForegroundColor Green
Write-Host "  Desconto: R$ $($validationDelivery.discountAmount)" -ForegroundColor Gray
$totalDelivery = $subtotalDelivery - $validationDelivery.discountAmount + $deliveryFee
Write-Host "  Total final: R$ $totalDelivery" -ForegroundColor Gray
Write-Host ""

$deliveryBody = @{
    cashSessionId = $cashSessionId
    customerId = $customerId
    customerAddressId = $addressId
    items = @(
        @{
            productId = $product1.id
            quantity = 3
        }
    )
    deliveryFee = $deliveryFee
    discount = $validationDelivery.discountAmount
    estimatedTime = 30
    customerNotes = "Pedido com cupom de desconto"
} | ConvertTo-Json -Depth 10

$delivery = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/delivery/orders" `
    -Method POST `
    -Body $deliveryBody `
    -Headers $headers

Write-Host "✓ Pedido delivery criado!" -ForegroundColor Green
Write-Host "  ID: $($delivery.id)" -ForegroundColor Gray
Write-Host "  Subtotal: R$ $($delivery.subtotal)" -ForegroundColor Gray
Write-Host "  Desconto: R$ $($delivery.discount)" -ForegroundColor Gray
Write-Host "  Taxa entrega: R$ $($delivery.deliveryFee)" -ForegroundColor Gray
Write-Host "  Total: R$ $($delivery.total)" -ForegroundColor Gray
Write-Host ""

# Registrar uso do cupom no delivery
Write-Host "Registrando uso do cupom no delivery..." -ForegroundColor Yellow
$applyDeliveryBody = @{
    couponId = $couponId
    customerId = $customerId
    discountApplied = $validationDelivery.discountAmount
    deliveryOrderId = $delivery.id
} | ConvertTo-Json

$usageDelivery = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/coupons/apply" `
    -Method POST `
    -Body $applyDeliveryBody `
    -Headers $headers

Write-Host "✓ Uso do cupom registrado!" -ForegroundColor Green
Write-Host ""

# 9. Estatísticas do cupom
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "ESTATÍSTICAS DO CUPOM" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

$couponDetail = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/coupons/$couponId" `
    -Method GET `
    -Headers $headers

Write-Host "Cupom: $($couponDetail.code)" -ForegroundColor Yellow
Write-Host "Descrição: $($couponDetail.description)" -ForegroundColor Gray
Write-Host "Tipo: $($couponDetail.couponType)" -ForegroundColor Gray
Write-Host "Desconto: $($couponDetail.discountValue)%" -ForegroundColor Gray
Write-Host "Total de usos: $($couponDetail.usageCount)" -ForegroundColor Green
Write-Host ""

Write-Host "Últimos usos:" -ForegroundColor Yellow
foreach ($usage in $couponDetail.usages) {
    Write-Host "  - Cliente: $($usage.customer.name)" -ForegroundColor Gray
    Write-Host "    Desconto aplicado: R$ $($usage.discountApplied)" -ForegroundColor Gray
    Write-Host "    Data: $($usage.usedAt)" -ForegroundColor Gray
    Write-Host ""
}

# Estatísticas gerais
Write-Host "Buscando estatísticas gerais..." -ForegroundColor Yellow
$stats = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/coupons/statistics" `
    -Method GET `
    -Headers $headers

Write-Host "✓ Estatísticas gerais de cupons:" -ForegroundColor Green
Write-Host "  Total de cupons ativos: $($stats.totalActive)" -ForegroundColor Gray
Write-Host "  Total de usos: $($stats.totalUsages)" -ForegroundColor Gray
Write-Host "  Total em descontos: R$ $($stats.totalDiscountGiven)" -ForegroundColor Gray
Write-Host ""

Write-Host "============================================" -ForegroundColor Green
Write-Host "TESTES CONCLUÍDOS COM SUCESSO!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
