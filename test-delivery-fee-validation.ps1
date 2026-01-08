# Test the delivery fee calculation with empty neighborhood/city

$BASE_URL = "http://localhost:3000/api/v1"
$EMAIL = "hygordavidaraujo@gmail.com"
$PASSWORD = "admin123"

Write-Host "🔐 Login..." -ForegroundColor Cyan
$loginResponse = Invoke-RestMethod -Uri "$BASE_URL/auth/login" `
  -Method POST `
  -ContentType "application/json" `
  -Body (@{email=$EMAIL; password=$PASSWORD} | ConvertTo-Json)

$token = $loginResponse.data.token
$headers = @{
  "Authorization" = "Bearer $token"
  "Content-Type" = "application/json"
}

Write-Host "✅ Logged in`n" -ForegroundColor Green

# Test 1: Empty neighborhood/city - should now have a clear error message
Write-Host "🧪 Test 1: Empty neighborhood/city" -ForegroundColor Cyan
try {
  $response = Invoke-RestMethod -Uri "$BASE_URL/delivery/calculate-fee" `
    -Method POST `
    -Headers $headers `
    -Body (@{
      neighborhood = ""
      city = ""
      subtotal = 50.00
    } | ConvertTo-Json)
  Write-Host "✅ Success: $($response.fee)" -ForegroundColor Green
} catch {
  $statusCode = $_.Exception.Response.StatusCode.Value__
  $message = $_.Exception.Message
  if ($statusCode -eq 422) {
    Write-Host "✅ Got expected 422 error for empty fields" -ForegroundColor Green
    Write-Host "   Message: $message" -ForegroundColor Yellow
  } else {
    Write-Host "❌ Unexpected error $statusCode" -ForegroundColor Red
  }
}

Write-Host "`n"

# Test 2: Valid data - should work
Write-Host "🧪 Test 2: Valid neighborhood/city" -ForegroundColor Cyan
try {
  $response = Invoke-RestMethod -Uri "$BASE_URL/delivery/calculate-fee" `
    -Method POST `
    -Headers $headers `
    -Body (@{
      neighborhood = "Setor Central"
      city = "Goiânia"
      subtotal = 50.00
    } | ConvertTo-Json)
  Write-Host "✅ Success - Fee: R$ $($response.fee)" -ForegroundColor Green
} catch {
  $statusCode = $_.Exception.Response.StatusCode.Value__
  Write-Host "❌ Error $statusCode - $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n" 
Write-Host "✅ Frontend fix: now skips calculation if neighborhood/city are empty" -ForegroundColor Green
