param(
  [string]$BackendPath = (Resolve-Path "$PSScriptRoot\.." | Select-Object -ExpandProperty Path)
)

Set-Location $BackendPath

$npmPath = (Get-Command npm -ErrorAction Stop).Source

& $npmPath --prefix $BackendPath run dev
