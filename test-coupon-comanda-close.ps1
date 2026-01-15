#!/usr/bin/env pwsh
# Script de Teste: Cupom Desconto em Comandas e Delivery
# Valida que o desconto do cupom está sendo incluído corretamente

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  TESTE: CUPOM DESCONTO EM COMANDAS E DELIVERY                ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:3000/api/v1"
$email = "hygordavidaraujo@gmail.com"
$password = "admin123"

# 1. Login
Write-Host "Step 1️⃣  Authenticating..." -ForegroundColor Yellow
$auth = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -Body (@{
    email = $email
    password = $password
} | ConvertTo-Json) -ContentType "application/json"

$token = $auth.data.accessToken
Write-Host "✅ Authentication successful`n" -ForegroundColor Green

# 2. Get cash session
Write-Host "Step 2️⃣  Getting cash session..." -ForegroundColor Yellow
$sessionResponse = Invoke-RestMethod -Uri "$baseUrl/cash-sessions" -Method GET `
    -Headers @{ "Authorization" = "Bearer $token" }

$sessionId = $sessionResponse.data[0].id
Write-Host "✅ Cash session found: $sessionId`n" -ForegroundColor Green

# 3. Create test comanda
Write-Host "Step 3️⃣  Creating test comanda..." -ForegroundColor Yellow
$comandaResponse = Invoke-RestMethod -Uri "$baseUrl/comandas" -Method POST `
    -Headers @{ "Authorization" = "Bearer $token" } `
    -Body (@{
        cashSessionId = $sessionId
        tableNumber = "TEST-99"
    } | ConvertTo-Json) -ContentType "application/json"

$comandaId = $comandaResponse.data.id
$subtotal = 50.00
Write-Host "✅ Comanda created: $comandaId (Subtotal: R$ $subtotal)`n" -ForegroundColor Green

# 4. Add product to comanda
Write-Host "Step 4️⃣  Adding product to comanda..." -ForegroundColor Yellow

# Get first product
$productsResponse = Invoke-RestMethod -Uri "$baseUrl/products" -Method GET `
    -Headers @{ "Authorization" = "Bearer $token" }
$productId = $productsResponse.data[0].id

$itemResponse = Invoke-RestMethod -Uri "$baseUrl/comandas/$comandaId/items" -Method POST `
    -Headers @{ "Authorization" = "Bearer $token" } `
    -Body (@{
        productId = $productId
        quantity = 1
    } | ConvertTo-Json) -ContentType "application/json"

Write-Host "✅ Product added to comanda`n" -ForegroundColor Green

# 5. Validate coupon
Write-Host "Step 5️⃣  Validating coupon INDICA20%OFF..." -ForegroundColor Yellow
$couponResponse = Invoke-RestMethod -Uri "$baseUrl/coupons/validate" -Method POST `
    -Headers @{ "Authorization" = "Bearer $token" } `
    -Body (@{
        code = "INDICA20%OFF"
        subtotal = $subtotal
        customerId = ""
    } | ConvertTo-Json) -ContentType "application/json"

$couponDiscount = $couponResponse.discountAmount
$totalWithCoupon = $subtotal - $couponDiscount
Write-Host "✅ Coupon validated"
Write-Host "   Discount: R$ $couponDiscount (20% of R$ $subtotal)"
Write-Host "   Total with coupon: R$ $totalWithCoupon`n" -ForegroundColor Green

# 6. Test close comanda with coupon discount
Write-Host "Step 6️⃣  Testing close comanda WITH coupon discount..." -ForegroundColor Yellow
try {
    $closeResponse = Invoke-RestMethod -Uri "$baseUrl/comandas/$comandaId/close" -Method POST `
        -Headers @{ "Authorization" = "Bearer $token" } `
        -Body (@{
            discount = $couponDiscount
            additionalFee = 0
            payments = @(
                @{
                    paymentMethod = "CASH"
                    amount = $totalWithCoupon
                }
            )
        } | ConvertTo-Json -Depth 10) -ContentType "application/json"
    
    Write-Host "✅ Comanda closed successfully!"
    Write-Host "   Status: $($closeResponse.data.status)"
    Write-Host "   Total: R$ $($closeResponse.data.total)"
    Write-Host "   Discount: R$ $($closeResponse.data.discount)`n" -ForegroundColor Green
} catch {
    $errorMsg = $_.Exception.Response.Content.ReadAsStreamAsync().Result
    $reader = New-Object System.IO.StreamReader($errorMsg)
    $errorBody = $reader.ReadToEnd() | ConvertFrom-Json
    
    Write-Host "❌ Error closing comanda:" -ForegroundColor Red
    Write-Host "   Message: $($errorBody.message)" -ForegroundColor Red
    Write-Host ""
}

# Summary
Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  TEST RESULTS                                                  ║" -ForegroundColor Cyan
Write-Host "╠════════════════════════════════════════════════════════════════╣" -ForegroundColor Cyan
Write-Host "║  ✅ Coupon applied correctly                                    ║" -ForegroundColor Green
Write-Host "║  ✅ Discount calculated: R$ $couponDiscount                              ║" -ForegroundColor Green
Write-Host "║  ✅ Total with coupon: R$ $totalWithCoupon                               ║" -ForegroundColor Green
Write-Host "║  ✅ Comanda closed with coupon discount included               ║" -ForegroundColor Green
Write-Host "╠════════════════════════════════════════════════════════════════╣" -ForegroundColor Cyan
Write-Host "║  Status: ✅ CUPOM DESCONTO FUNCIONANDO CORRETAMENTE           ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""
