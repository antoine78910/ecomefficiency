# Flat ZIP for Pro Extension (AdsPower / Chrome)
param([string]$OutName = "ecom-efficiency-pro-extension.zip")

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$zipPath = Join-Path $root $OutName
$temp = Join-Path $root "temp_pro_zip"

$include = @('*.js', '*.html', '*.json', '*.png', '*.svg')
$exclude = @('manifest_no_icons.json', 'create_pro_zip.ps1', 'create_icons.html', 'test_extension.html')

if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
if (Test-Path $temp) { Remove-Item $temp -Recurse -Force }
New-Item -ItemType Directory -Path $temp | Out-Null

foreach ($pattern in $include) {
  Get-ChildItem $root -File -Filter $pattern -ErrorAction SilentlyContinue | ForEach-Object {
    if ($exclude -contains $_.Name) { return }
    if ($_.Extension -eq '.zip') { return }
    Copy-Item $_.FullName -Destination (Join-Path $temp $_.Name) -Force
  }
}

if (-not (Test-Path (Join-Path $temp "manifest.json"))) {
  Write-Host "manifest.json missing" -ForegroundColor Red
  exit 1
}

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive = [System.IO.Compression.ZipFile]::Open($zipPath, [System.IO.Compression.ZipArchiveMode]::Create)
try {
  Get-ChildItem $temp -File | ForEach-Object {
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive, $_.FullName, $_.Name, [System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
  }
} finally {
  $archive.Dispose()
}

Remove-Item $temp -Recurse -Force
$count = (Get-ChildItem $root -File | Where-Object { $_.Extension -ne '.zip' }).Count
Write-Host "Done: $OutName ($count source files, flat root)" -ForegroundColor Green
Write-Host "ZIP: $zipPath" -ForegroundColor Cyan
