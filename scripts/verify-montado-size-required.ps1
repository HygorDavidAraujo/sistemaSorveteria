$ErrorActionPreference = 'Stop'

$baseUrl = 'http://localhost:3000/api/v1'

Write-Host "Logging in..."
$auth = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Headers @{ 'Content-Type' = 'application/json' } -Body (@{ email = 'hygordavidaraujo@gmail.com'; password = 'admin123' } | ConvertTo-Json)
$token = $auth.data.accessToken
$token = if ($token) { $token } else { $auth.data.token }
$token = if ($token) { $token } else { $auth.data.access_token }
$token = if ($token) { $token } else { $auth.data.accessToken }
$token = if ($token) { $token } else { $auth.accessToken }
$token = if ($token) { $token } else { $auth.token }
$token = if ($token) { $token } else { $null }
$token = if ($token) { $token } else { throw 'Falha no login: token vazio.' }
$headers = @{ Authorization = "Bearer $token"; 'Content-Type' = 'application/json' }

Write-Host "Finding an assembled (Montado) product..."
$productsRes = Invoke-RestMethod -Uri "$baseUrl/products" -Headers $headers
$products = @()
if ($productsRes.data.items) { $products = $productsRes.data.items }
elseif ($productsRes.data -and ($productsRes.data -is [System.Collections.IEnumerable])) { $products = $productsRes.data }
else { $products = @() }

$assembled = $products | Where-Object { $_.category -and $_.category.categoryType -eq 'assembled' } | Select-Object -First 1

if (-not $assembled) {
  Write-Host "No Montado product found; creating one for the test..."
  $cats = Invoke-RestMethod -Uri "$baseUrl/categories" -Headers $headers
  $categories = @()
  if ($cats.data -and ($cats.data -is [System.Collections.IEnumerable])) { $categories = $cats.data }
  elseif ($cats.data.items) { $categories = $cats.data.items }

  $assembledCat = $categories | Where-Object { $_.categoryType -eq 'assembled' -and $_.sizes -and $_.sizes.Count -gt 0 } | Select-Object -First 1
  if (-not $assembledCat) { throw 'No Montado categories with sizes found to create a test product.' }

  $code = "MONTADO-TEST-" + ([Guid]::NewGuid().ToString('N').Substring(0,8))
  $sizePrices = @()
  $i = 0
  foreach ($s in $assembledCat.sizes) {
    $i++
    $sizePrices += @{ sizeId = $s.id; price = (10 + $i) }
  }

  $createBody = @{
    name = "Montado Test $code"
    code = $code
    categoryId = $assembledCat.id
    saleType = 'unit'
    # será ignorado (regra Montado); fica aqui só por compatibilidade.
    salePrice = 999.99
    sizePrices = $sizePrices
    isActive = $true
  } | ConvertTo-Json -Depth 10

  $created = Invoke-RestMethod -Method Post -Uri "$baseUrl/products" -Headers $headers -Body $createBody
  $assembled = $created.data
}

Write-Host "Using Montado product:" $assembled.id $assembled.name

Write-Host "Getting current cash session..."
$terminalId = 'PDV-TEST'
$cs = Invoke-RestMethod -Uri "$baseUrl/cash-sessions/current?terminalId=$terminalId" -Method Get -Headers $headers
if (-not $cs.data) {
  $opened = Invoke-RestMethod -Uri "$baseUrl/cash-sessions" -Method Post -Headers $headers -Body (@{ terminalId = $terminalId; initialCash = 100 } | ConvertTo-Json)
  $cashSessionId = $opened.data.id
} else {
  $cashSessionId = $cs.data.id
}

Write-Host "Testing: PDV sale WITHOUT sizeId should fail..."
$saleBody = @{
  cashSessionId = $cashSessionId
  items = @(
    @{ productId = $assembled.id; quantity = 1 }
  )
  payments = @(
    @{ paymentMethod = 'cash'; amount = 10 }
  )
} | ConvertTo-Json -Depth 10

$failed = $false
try {
  Invoke-RestMethod -Method Post -Uri "$baseUrl/sales" -Headers $headers -Body $saleBody | Out-Null
} catch {
  $failed = $true
  Write-Host "OK - blocked as expected:" $_.Exception.Message
}
if (-not $failed) { throw 'Expected sale to be rejected, but it succeeded.' }

Write-Host "Done."