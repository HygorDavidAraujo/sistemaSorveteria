# Script para criar cupom INDICA20%OFF
Write-Host "Criando cupom INDICA20%OFF..." -ForegroundColor Cyan

# Login
$loginResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/auth/login" `
    -Method POST `
    -ContentType "application/json" `
    -Body '{"email":"hygordavidaraujo@gmail.com","password":"admin123"}'

$token = $loginResponse.token
Write-Host "Token obtido" -ForegroundColor Green

# Criar cupom
$couponBody = @{
    code = "INDICA20%OFF"
    description = "Cupom de indicacao 20% de desconto"
    couponType = "percentage"
    discountValue = 20
    minPurchaseValue = 0
    usageLimit = 1000
    validFrom = "2026-01-01T00:00:00Z"
    validTo = "2026-12-31T23:59:59Z"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/coupons" `
        -Method POST `
        -ContentType "application/json" `
        -Headers @{ "Authorization" = "Bearer $token" } `
        -Body $couponBody
    
    Write-Host "Cupom criado com sucesso!" -ForegroundColor Green
    Write-Host ($response | ConvertTo-Json -Depth 5) -ForegroundColor White
} catch {
    Write-Host "Erro ao criar cupom:" -ForegroundColor Red
    Write-Host $_.ErrorDetails.Message -ForegroundColor Yellow
}
