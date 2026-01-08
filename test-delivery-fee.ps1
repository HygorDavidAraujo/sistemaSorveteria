# Test delivery fee calculation with zero subtotal

$BASE_URL = "http://localhost:3000/api/v1"
$EMAIL = "hygordavidaraujo@gmail.com"
$PASSWORD = "admin123"

# Login first
Write-Host "🔐 Realizando login..." -ForegroundColor Cyan
$loginResponse = Invoke-RestMethod -Uri "$BASE_URL/auth/login" `
  -Method POST `
  -ContentType "application/json" `
  -Body (@{email=$EMAIL; password=$PASSWORD} | ConvertTo-Json)

$token = $loginResponse.data.token
Write-Host "✅ Login realizado" -ForegroundColor Green

$headers = @{
  "Authorization" = "Bearer $token"
  "Content-Type" = "application/json"
}

Write-Host ""
Write-Host "🧪 Testando cálculo de taxa de entrega com subtotal = 0" -ForegroundColor Cyan

try {
  $response = Invoke-RestMethod -Uri "$BASE_URL/delivery/calculate-fee" `
    -Method POST `
    -ContentType "application/json" `
    -Headers $headers `
    -Body (@{
      neighborhood = "Setor Central"
      city = "Goiânia"
      subtotal = 0
    } | ConvertTo-Json)
  
  Write-Host "✅ Sucesso! Taxa calculada: R$ $($response.fee)" -ForegroundColor Green
} catch {
  $errorResponse = $_.Exception.Response
  $statusCode = $errorResponse.StatusCode.Value__
  
  if ($statusCode -eq 422) {
    Write-Host "❌ Erro 422 - Validação falhou (ainda não corrigido)" -ForegroundColor Red
    Write-Host "   Mensagem: $($_.Exception.Message)" -ForegroundColor Red
  } elseif ($statusCode -eq 400) {
    Write-Host "✅ Erro 400 - Validação passou, mas negócio falhou (esperado)" -ForegroundColor Green
    Write-Host "   Isso significa que a validação foi corrigida!" -ForegroundColor Green
    
    try {
      $bodyReader = New-Object System.IO.StreamReader($errorResponse.GetResponseStream())
      $body = $bodyReader.ReadToEnd()
      Write-Host "   Detalhes: $body" -ForegroundColor Yellow
    } catch {}
  } else {
    Write-Host "❌ Erro $statusCode" -ForegroundColor Red
    Write-Host "   Mensagem: $($_.Exception.Message)" -ForegroundColor Red
  }
}

Write-Host ""
Write-Host "🧪 Testando cálculo de taxa de entrega com subtotal válido (50.00)" -ForegroundColor Cyan

try {
  $response = Invoke-RestMethod -Uri "$BASE_URL/delivery/calculate-fee" `
    -Method POST `
    -ContentType "application/json" `
    -Headers $headers `
    -Body (@{
      neighborhood = "Setor Central"
      city = "Goiânia"
      subtotal = 50.00
    } | ConvertTo-Json)
  
  Write-Host "✅ Sucesso! Taxa calculada: R$ $($response.fee)" -ForegroundColor Green
} catch {
  $errorResponse = $_.Exception.Response
  $statusCode = $errorResponse.StatusCode.Value__
  Write-Host "❌ Erro $statusCode - $($_.Exception.Message)" -ForegroundColor Red
}
