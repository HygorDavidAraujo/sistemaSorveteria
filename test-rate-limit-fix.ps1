# Test script to verify rate limiting issue is fixed
# This script simulates rapid tab switching and requests to loyalty config

$BASE_URL = "http://localhost:3000/api/v1"
$EMAIL = "hygordavidaraujo@gmail.com"
$PASSWORD = "admin123"

Write-Host "🔐 Realizando login..." -ForegroundColor Cyan

# Login
$loginResponse = Invoke-RestMethod -Uri "$BASE_URL/auth/login" `
  -Method POST `
  -ContentType "application/json" `
  -Body (@{email=$EMAIL; password=$PASSWORD} | ConvertTo-Json)

$token = $loginResponse.data.token
Write-Host "✅ Login realizado: $($loginResponse.data.user.fullName)" -ForegroundColor Green

# Set up headers
$headers = @{
  "Authorization" = "Bearer $token"
  "Content-Type" = "application/json"
}

Write-Host "`n📋 Testando múltiplas requisições rápidas ao endpoint /loyalty/config..." -ForegroundColor Cyan

$successCount = 0
$errorCount = 0
$rateLimitErrors = 0

# Make 10 rapid requests to simulate rapid tab switching and re-renders
for ($i = 1; $i -le 10; $i++) {
  try {
    $response = Invoke-RestMethod -Uri "$BASE_URL/loyalty/config" `
      -Method GET `
      -Headers $headers `
      -TimeoutSec 5
    
    Write-Host "✅ Requisição $($i): Sucesso" -ForegroundColor Green
    $successCount++
  } catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 429) {
      Write-Host "❌ Requisição $($i): 429 Too Many Requests (Rate Limit)" -ForegroundColor Red
      $rateLimitErrors++
      $errorCount++
    } else {
      Write-Host "❌ Requisição $($i): Erro $statusCode - $($_.Exception.Message)" -ForegroundColor Red
      $errorCount++
    }
  }
  
  # Small delay between requests
  Start-Sleep -Milliseconds 100
}

Write-Host "`n📊 Resultado do teste:" -ForegroundColor Cyan
Write-Host "   Requisições bem-sucedidas: $successCount/10" -ForegroundColor Green
Write-Host "   Erros de Taxa Limite (429): $rateLimitErrors" -ForegroundColor $(if ($rateLimitErrors -gt 0) { "Red" } else { "Green" })
Write-Host "   Total de erros: $errorCount" -ForegroundColor $(if ($errorCount -gt 0) { "Red" } else { "Green" })

if ($rateLimitErrors -eq 0 -and $errorCount -eq 0) {
  Write-Host "`n🎉 TESTE PASSADO: Nenhum erro de taxa limite detectado!" -ForegroundColor Green
} else {
  Write-Host "`n⚠️  TESTE FALHOU: Rate limit ou outros erros foram detectados" -ForegroundColor Red
}
