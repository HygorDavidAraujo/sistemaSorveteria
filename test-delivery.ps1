# ========================================
# TESTE: CRIAR PEDIDO DE DELIVERY
# ========================================
# Credenciais (salvas para referência)
# Email: hygordavidaraujo@gmail.com
# Senha: admin123

$baseUrl = "http://localhost:3000/api/v1"

# 1. LOGIN
Write-Host "1️⃣  Fazendo login..." -ForegroundColor Cyan
$loginBody = @{
    email = "hygordavidaraujo@gmail.com"
    password = "admin123"
} | ConvertTo-Json

$auth = Invoke-RestMethod -Uri "$baseUrl/auth/login" `
  -Method POST `
  -Headers @{"Content-Type" = "application/json"} `
  -Body $loginBody

$TOKEN = $auth.data.accessToken
$headers = @{"Authorization" = "Bearer $TOKEN"; "Content-Type" = "application/json"}
Write-Host "✅ Login realizado! Token: $($TOKEN.Substring(0, 20))..." -ForegroundColor Green

# 2. OBTER CLIENTES
Write-Host "`n2️⃣  Buscando clientes..." -ForegroundColor Cyan
$customers = Invoke-RestMethod -Uri "$baseUrl/customers" -Method GET -Headers $headers
$customerId = $customers.data[0].id
Write-Host "✅ Cliente: $($customers.data[0].name)" -ForegroundColor Green
Write-Host "   ID: $customerId" -ForegroundColor Green

# 3. OBTER CASH SESSION
Write-Host "`n3️⃣  Buscando cash session ativa..." -ForegroundColor Cyan
$sessions = Invoke-RestMethod -Uri "$baseUrl/cash-sessions" -Method GET -Headers $headers
$cashSession = $sessions.data | Where-Object {$_.status -eq "open"} | Select-Object -First 1
$cashSessionId = $cashSession.id
Write-Host "✅ Cash Session: $($cashSession.sessionNumber)" -ForegroundColor Green
Write-Host "   ID: $cashSessionId" -ForegroundColor Green

# 4. OBTER PRODUTOS
Write-Host "`n4️⃣  Buscando produtos..." -ForegroundColor Cyan
$products = Invoke-RestMethod -Uri "$baseUrl/products" -Method GET -Headers $headers
$product = $products.data[0]
$productId = $product.id
Write-Host "✅ Produto: $($product.name)" -ForegroundColor Green
Write-Host "   ID: $productId" -ForegroundColor Green
Write-Host "   Preço: R$ $($product.salePrice)" -ForegroundColor Green

# 5. CRIAR PEDIDO DE DELIVERY
Write-Host "`n5️⃣  Criando pedido de delivery..." -ForegroundColor Cyan
$deliveryPayload = @{
    customerId = $customerId
    cashSessionId = $cashSessionId
    items = @(
        @{
            productId = $productId
            quantity = 2
        }
    )
    deliveryFee = 5.00
    discount = 0
    estimatedTime = 30
    customerNotes = "Teste de entrega com cliente vinculado"
} | ConvertTo-Json

Write-Host "Payload: $deliveryPayload" -ForegroundColor DarkGray

try {
    $delivery = Invoke-RestMethod -Uri "$baseUrl/delivery/orders" `
      -Method POST `
      -Headers $headers `
      -Body $deliveryPayload

    Write-Host "✅ Pedido criado com sucesso!" -ForegroundColor Green
    Write-Host "`n📋 RESULTADO:" -ForegroundColor Cyan
    $delivery | ConvertTo-Json | Write-Host
    
    # Verificar se customer foi vinculado
    Write-Host "`n🔍 VERIFICAÇÃO:" -ForegroundColor Yellow
    if ($delivery.data.customerId -eq $customerId) {
        Write-Host "✅ CLIENTE VINCULADO COM SUCESSO!" -ForegroundColor Green
        Write-Host "   Customer ID: $($delivery.data.customerId)" -ForegroundColor Green
    } else {
        Write-Host "❌ ERRO: Cliente não foi vinculado!" -ForegroundColor Red
        Write-Host "   Esperado: $customerId" -ForegroundColor Red
        Write-Host "   Recebido: $($delivery.data.customerId)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Erro ao criar pedido:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host "`nResposta completa:" -ForegroundColor Yellow
    $_.Exception.Response.Content | Write-Host
}
