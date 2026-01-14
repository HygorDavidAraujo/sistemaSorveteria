# Verifica persistência de itens do Delivery e impacto no DRE (receita + COGS)
# Credenciais padrão: hygordavidaraujo@gmail.com / admin123

$ErrorActionPreference = 'Stop'

$baseUrl = 'http://localhost:3000/api/v1'

try {
  Write-Host '1) Login...' -ForegroundColor Cyan
  $auth = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Headers @{ 'Content-Type' = 'application/json' } -Body (@{ email = 'hygordavidaraujo@gmail.com'; password = 'admin123' } | ConvertTo-Json)
  $token = $auth.data.accessToken
  if (-not $token) { throw 'Token não retornou no login.' }
  $headers = @{ Authorization = "Bearer $token"; 'Content-Type' = 'application/json' }

  Write-Host '2) Cash session (open or create)...' -ForegroundColor Cyan
  $terminalId = 'TERM-001'
  $currentSession = Invoke-RestMethod -Uri "$baseUrl/cash-sessions/current?terminalId=$terminalId" -Method Get -Headers $headers
  if (-not $currentSession.data) {
    $createdSession = Invoke-RestMethod -Uri "$baseUrl/cash-sessions" -Method Post -Headers $headers -Body (@{ terminalId = $terminalId; initialCash = 1000 } | ConvertTo-Json)
    $cashSessionId = $createdSession.data.id
  } else {
    $cashSessionId = $currentSession.data.id
  }

  Write-Host '3) Customer + Product...' -ForegroundColor Cyan
  $customers = Invoke-RestMethod -Uri "$baseUrl/customers" -Method Get -Headers $headers
  if (-not $customers.data -or $customers.data.Count -eq 0) { throw 'Nenhum cliente cadastrado.' }
  $customerId = $customers.data[0].id

  $products = Invoke-RestMethod -Uri "$baseUrl/products" -Method Get -Headers $headers
  if (-not $products.data -or $products.data.Count -eq 0) { throw 'Nenhum produto cadastrado.' }
  $product = $products.data | Where-Object {
    $raw = $_.costPrice
    if ($null -eq $raw) { return $false }
    $parsed = 0
    return [double]::TryParse(($raw.ToString() -replace ',', '.'), [ref]$parsed) -and $parsed -gt 0
  } | Select-Object -First 1
  if (-not $product) { $product = $products.data[0] }
  $productId = $product.id

  $today = (Get-Date).ToString('yyyy-MM-dd')

  Write-Host "4) DRE antes ($today)..." -ForegroundColor Cyan
  $dreBefore = Invoke-RestMethod -Uri "$baseUrl/financial/reports/dre?startDate=$today&endDate=$today" -Method Get -Headers $headers

  Write-Host '5) Criando delivery order...' -ForegroundColor Cyan
  $payload = @{
    customerId    = $customerId
    cashSessionId = $cashSessionId
    items         = @(
      @{ productId = $productId; quantity = 2 }
    )
    deliveryFee   = 5.00
    discount      = 0
    estimatedTime = 30
    customerNotes = 'Teste COGS delivery'
  } | ConvertTo-Json -Depth 6

  $created = Invoke-RestMethod -Uri "$baseUrl/delivery/orders" -Method Post -Headers $headers -Body $payload
  $orderId = $created.data.id
  if (-not $orderId) { throw 'OrderId não retornou na criação.' }

  Write-Host '6) Atualizando status até delivered...' -ForegroundColor Cyan
  Invoke-RestMethod -Uri "$baseUrl/delivery/orders/$orderId/status" -Method Put -Headers $headers -Body (@{ status = 'preparing' } | ConvertTo-Json) | Out-Null
  Invoke-RestMethod -Uri "$baseUrl/delivery/orders/$orderId/status" -Method Put -Headers $headers -Body (@{ status = 'out_for_delivery' } | ConvertTo-Json) | Out-Null
  Invoke-RestMethod -Uri "$baseUrl/delivery/orders/$orderId/status" -Method Put -Headers $headers -Body (@{ status = 'delivered' } | ConvertTo-Json) | Out-Null

  Write-Host '7) Buscando order...' -ForegroundColor Cyan
  $order = Invoke-RestMethod -Uri "$baseUrl/delivery/orders/$orderId" -Method Get -Headers $headers

  Write-Host "8) DRE depois ($today)..." -ForegroundColor Cyan
  $dreAfter = Invoke-RestMethod -Uri "$baseUrl/financial/reports/dre?startDate=$today&endDate=$today" -Method Get -Headers $headers

  Write-Host ''
  Write-Host "OrderId: $orderId" -ForegroundColor Green
  Write-Host ("Items persisted: {0}" -f ($order.data.items | Measure-Object).Count) -ForegroundColor Green
  ($order.data.items | Select-Object -First 10) | ConvertTo-Json -Depth 6 | Write-Host

  Write-Host ''
  Write-Host ("DRE before: grossRevenue={0} cogs={1} grossProfit={2}" -f $dreBefore.data.grossRevenue, $dreBefore.data.costOfGoodsSold, $dreBefore.data.grossProfit) -ForegroundColor Yellow
  Write-Host ("DRE after : grossRevenue={0} cogs={1} grossProfit={2}" -f $dreAfter.data.grossRevenue, $dreAfter.data.costOfGoodsSold, $dreAfter.data.grossProfit) -ForegroundColor Yellow

} catch {
  Write-Host 'FAILED:' -ForegroundColor Red
  $_ | Format-List * -Force | Out-String | Write-Host
  if ($_.Exception -and $_.Exception.Response) {
    try {
      $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
      $body = $reader.ReadToEnd()
      Write-Host "Response body: $body" -ForegroundColor DarkYellow
    } catch {}
  }
  exit 1
}
