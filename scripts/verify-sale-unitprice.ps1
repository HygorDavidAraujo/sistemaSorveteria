# Verifica se /sales aceita unitPrice enviado pelo frontend (override) e não falha no check de pagamentos.
$ErrorActionPreference = 'Stop'

$baseUrl = 'http://localhost:3000/api/v1'

Write-Host '1) Login...' -ForegroundColor Cyan
$auth = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Headers @{ 'Content-Type' = 'application/json' } -Body (@{ email = 'hygordavidaraujo@gmail.com'; password = 'admin123' } | ConvertTo-Json)
$token = $auth.data.accessToken
if (-not $token) { throw 'Falha no login: token vazio.' }
$headers = @{ Authorization = "Bearer $token"; 'Content-Type' = 'application/json' }

Write-Host '2) Cash session...' -ForegroundColor Cyan
$terminalId = 'TERM-001'
$current = Invoke-RestMethod -Uri "$baseUrl/cash-sessions/current?terminalId=$terminalId" -Method Get -Headers $headers
if (-not $current.data) {
  $opened = Invoke-RestMethod -Uri "$baseUrl/cash-sessions" -Method Post -Headers $headers -Body (@{ terminalId = $terminalId; initialCash = 1000 } | ConvertTo-Json)
  $cashSessionId = $opened.data.id
} else {
  $cashSessionId = $current.data.id
}

Write-Host '3) Produto...' -ForegroundColor Cyan
$products = Invoke-RestMethod -Uri "$baseUrl/products" -Method Get -Headers $headers
if (-not $products.data -or $products.data.Count -eq 0) { throw 'Sem produtos.' }
$product = $products.data[0]

$qty = 27
$unitPrice = 75.90
$total = [math]::Round($qty * $unitPrice, 2)

Write-Host "4) Criando venda com override unitPrice=$unitPrice qty=$qty total=$total" -ForegroundColor Cyan
$payload = @{
  cashSessionId = $cashSessionId
  saleType      = 'pdv'
  items         = @(
    @{ productId = $product.id; quantity = $qty; unitPrice = $unitPrice; discount = 0 }
  )
  payments      = @(
    @{ paymentMethod = 'cash'; amount = $total }
  )
  discount      = 0
  additionalFee = 0
  deliveryFee   = 0
} | ConvertTo-Json -Depth 6

$res = Invoke-RestMethod -Uri "$baseUrl/sales" -Method Post -Headers $headers -Body $payload

Write-Host ('OK - sale.total=' + $res.data.total + ' sale.subtotal=' + $res.data.subtotal) -ForegroundColor Green
Write-Host 'Item salvo:' -ForegroundColor Green
($res.data.items | Select-Object -First 1 | ConvertTo-Json -Depth 5) | Write-Host
