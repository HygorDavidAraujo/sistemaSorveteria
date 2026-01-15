# Teste de validação de cupom com caractere especial %
# Script para verificar se cupom INDICA20%OFF retorna 422

Write-Host "🔐 Fazendo login..." -ForegroundColor Cyan

# Passo 1: Login
$loginResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/auth/login" `
    -Method POST `
    -ContentType "application/json" `
    -Body '{"email":"hygordavidaraujo@gmail.com","password":"admin123"}' `
    -ErrorAction Stop

$token = $loginResponse.token
Write-Host "✅ Token obtido: $($token.Substring(0,20))..." -ForegroundColor Green

# Passo 2: Buscar cliente
Write-Host "`n🔍 Buscando cliente..." -ForegroundColor Cyan
$customerResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/customers?limit=1" `
    -Method GET `
    -Headers @{ "Authorization" = "Bearer $token" } `
    -ErrorAction Stop

$customerId = $customerResponse.data[0].id
Write-Host "✅ Cliente ID: $customerId" -ForegroundColor Green

# Passo 3: Validar cupom com %
Write-Host "`n🎟️ Validando cupom INDICA20%OFF..." -ForegroundColor Cyan

try {
    $validateResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/coupons/validate" `
        -Method POST `
        -ContentType "application/json" `
        -Headers @{ "Authorization" = "Bearer $token" } `
        -Body (@{
            code = "INDICA20%OFF"
            subtotal = 50.00
            customerId = $customerId
        } | ConvertTo-Json) `
        -ErrorAction Stop
    
    Write-Host "✅ Cupom validado com sucesso!" -ForegroundColor Green
    Write-Host "Resposta: $($validateResponse | ConvertTo-Json -Depth 5)" -ForegroundColor White
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    $errorBody = $_.ErrorDetails.Message
    
    Write-Host "❌ Erro ao validar cupom!" -ForegroundColor Red
    Write-Host "Status Code: $statusCode" -ForegroundColor Yellow
    Write-Host "Error Body: $errorBody" -ForegroundColor Yellow
    
    if ($statusCode -eq 422) {
        Write-Host "`n ERRO 422 confirmado!" -ForegroundColor Magenta
        Write-Host "Problema: Schema Joi rejeitando caractere especial" -ForegroundColor Magenta
    }
}
