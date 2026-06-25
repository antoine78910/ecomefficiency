# AdsPower-ready flat ZIP (manifest + all assets at ZIP root, no subfolders)
param(
    [string]$OutName = "Ecom-Efficiency-AdsPower.zip"
)

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$zipPath = Join-Path $root $OutName
$tempFolder = Join-Path $root "temp_zip_folder"
$manifestSrc = Join-Path $root "manifest.json"
$utf8NoBom = New-Object System.Text.UTF8Encoding $false

Write-Host "Building AdsPower package: $OutName" -ForegroundColor Green

if (-not (Test-Path $manifestSrc)) {
    Write-Host "manifest.json not found in $root" -ForegroundColor Red
    exit 1
}

if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
if (Test-Path $tempFolder) { Remove-Item $tempFolder -Recurse -Force }
New-Item -ItemType Directory -Path $tempFolder | Out-Null

function ConvertTo-AdsPowerPaths {
    param([string]$Content)
    $Content = $Content.Replace('nox-tools/ex1/', 'e1-')
    $Content = $Content.Replace('nox-tools/ex2/', 'e2-')
    $Content = $Content.Replace('nox-tools/', '')
    return $Content
}

function Get-AdsPowerRelativePath {
    param([string]$RelativePath)
    return ConvertTo-AdsPowerPaths -Content $RelativePath
}

function Copy-RelativeFile {
    param([string]$RelativePath)
    if ([string]::IsNullOrWhiteSpace($RelativePath)) { return $false }
    $adsPath = Get-AdsPowerRelativePath -RelativePath $RelativePath
    $src = Join-Path $root $RelativePath
    if (-not (Test-Path $src)) { return $false }
    $dst = Join-Path $tempFolder $adsPath
    Copy-Item $src -Destination $dst -Force
    return $true
}

function Get-ManifestFileRefs {
    param([object]$Manifest)
    $refs = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)

    if ($Manifest.background -and $Manifest.background.service_worker) {
        [void]$refs.Add([string]$Manifest.background.service_worker)
    }
    if ($Manifest.action -and $Manifest.action.default_popup) {
        [void]$refs.Add([string]$Manifest.action.default_popup)
    }
    if ($Manifest.icons) {
        foreach ($p in $Manifest.icons.PSObject.Properties) {
            if ($p.Value) { [void]$refs.Add([string]$p.Value) }
        }
    }
    if ($Manifest.content_scripts) {
        foreach ($cs in $Manifest.content_scripts) {
            if ($cs.js) { foreach ($j in $cs.js) { if ($j) { [void]$refs.Add([string]$j) } } }
            if ($cs.css) { foreach ($c in $cs.css) { if ($c) { [void]$refs.Add([string]$c) } } }
        }
    }
    if ($Manifest.web_accessible_resources) {
        foreach ($war in $Manifest.web_accessible_resources) {
            if ($war.resources) {
                foreach ($r in $war.resources) { if ($r) { [void]$refs.Add([string]$r) } }
            }
        }
    }
    return @($refs)
}

function Install-FlattenedNoxTools {
    $noxSrc = Join-Path $root "nox-tools"
    if (-not (Test-Path $noxSrc)) { return 0 }
    $count = 0

    Get-ChildItem $noxSrc -File -ErrorAction SilentlyContinue | ForEach-Object {
        Copy-Item $_.FullName -Destination (Join-Path $tempFolder $_.Name) -Force
        $count++
    }
    $ex1 = Join-Path $noxSrc "ex1"
    if (Test-Path $ex1) {
        Get-ChildItem $ex1 -File | ForEach-Object {
            Copy-Item $_.FullName -Destination (Join-Path $tempFolder ("e1-" + $_.Name)) -Force
            $count++
        }
    }
    $ex2 = Join-Path $noxSrc "ex2"
    if (Test-Path $ex2) {
        Get-ChildItem $ex2 -File | ForEach-Object {
            Copy-Item $_.FullName -Destination (Join-Path $tempFolder ("e2-" + $_.Name)) -Force
            $count++
        }
    }
    return $count
}

function Copy-RootExtensionAssets {
    $skip = @('manifest.json', 'package.json', 'package-lock.json', 'ee_check.json')
    $added = 0
    foreach ($pattern in @('*.js', '*.html', '*.css', '*.png', '*.json', '*.csv')) {
        Get-ChildItem $root -File -Filter $pattern -ErrorAction SilentlyContinue | ForEach-Object {
            if ($skip -contains $_.Name) { return }
            if ($_.Name -like '.*') { return }
            if (Copy-RelativeFile -RelativePath $_.Name) { $script:rootAssetsAdded++ }
        }
    }
}

function Write-AdsPowerManifest {
    param([string]$DestPath)
    $content = [System.IO.File]::ReadAllText($manifestSrc, [System.Text.Encoding]::UTF8)
    $content = $content.TrimStart([char]0xFEFF)
    $content = ConvertTo-AdsPowerPaths -Content $content

    # AdsPower / Chrome local install fixes
    $content = [regex]::Replace($content, ',\s*\r?\n\s*"key"\s*:\s*"(?:[^"\\]|\\.)*"', '')
    $content = [regex]::Replace($content, '\r?\n\s*"webRequestBlocking",\s*', "`n")
    $content = [regex]::Replace($content, '"webRequestBlocking",\s*', '')
    $content = [regex]::Replace($content, '\r?\n\s*"chrome://\*\/\*",\s*', "`n")

    # Bump patch version so AdsPower shows a fresh build
    $content = [regex]::Replace($content, '"version"\s*:\s*"1\.0\.8"', '"version": "1.0.8"')

    [System.IO.File]::WriteAllText($DestPath, $content, $utf8NoBom)
}

function Write-AdsPowerBackground {
    param([string]$DestPath)
    $bgSrc = Join-Path $root "background.js"
    $content = [System.IO.File]::ReadAllText($bgSrc, [System.Text.Encoding]::UTF8)
    $content = ConvertTo-AdsPowerPaths -Content $content
    [System.IO.File]::WriteAllText($DestPath, $content, $utf8NoBom)
}

function New-FlatZip {
    param([string]$SourceDir, [string]$DestinationZip)
    Add-Type -AssemblyName System.IO.Compression
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    if (Test-Path $DestinationZip) { Remove-Item $DestinationZip -Force }
    $archive = [System.IO.Compression.ZipFile]::Open($DestinationZip, [System.IO.Compression.ZipArchiveMode]::Create)
    try {
        Get-ChildItem $SourceDir -File | ForEach-Object {
            $entryName = $_.Name.Replace('\', '/')
            [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive, $_.FullName, $entryName, [System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
        }
    } finally {
        $archive.Dispose()
    }
}

# --- Build ---
$manifest = Get-Content $manifestSrc -Raw -Encoding UTF8 | ConvertFrom-Json
$fileRefs = Get-ManifestFileRefs -Manifest $manifest
Write-Host "Manifest references: $($fileRefs.Count) files" -ForegroundColor Cyan

$missing = [System.Collections.Generic.List[string]]::new()
foreach ($rel in ($fileRefs | Sort-Object)) {
    if (-not (Copy-RelativeFile -RelativePath $rel)) {
        $missing.Add($rel)
        Write-Host "  MISSING in source: $rel" -ForegroundColor Red
    }
}

$noxCount = Install-FlattenedNoxTools
Write-Host "$noxCount nox-tools file(s) flattened to ZIP root" -ForegroundColor Green

foreach ($rel in ($fileRefs | Where-Object { $_ -match '^nox-tools/' })) {
    $adsPath = Get-AdsPowerRelativePath -RelativePath $rel
    if (-not (Test-Path (Join-Path $tempFolder $adsPath))) {
        if (-not $missing.Contains($rel)) { $missing.Add("$rel -> $adsPath") }
        Write-Host "  MISSING flattened: $adsPath" -ForegroundColor Red
    }
}

$rootAssetsAdded = 0
Copy-RootExtensionAssets
Write-Host "$rootAssetsAdded extra root asset(s) synced" -ForegroundColor Green

# Runtime assets used by background.js but not always listed in manifest
$runtimeExtras = @('blocked.html', 'blocked_redirect.js', 'ee_check.json', 'pro_tools_page.html')
foreach ($extra in $runtimeExtras) {
    Copy-RelativeFile -RelativePath $extra | Out-Null
}

if ($missing.Count -gt 0) {
    Write-Host "`nABORT: $($missing.Count) required file(s) missing." -ForegroundColor Red
    Remove-Item $tempFolder -Recurse -Force
    exit 1
}

Write-AdsPowerManifest -DestPath (Join-Path $tempFolder "manifest.json")
Write-AdsPowerBackground -DestPath (Join-Path $tempFolder "background.js")

$builtManifest = [System.IO.File]::ReadAllText((Join-Path $tempFolder "manifest.json"))
$builtBackground = [System.IO.File]::ReadAllText((Join-Path $tempFolder "background.js"))

try {
    $builtManifest | ConvertFrom-Json | Out-Null
    Write-Host "manifest.json: valid JSON" -ForegroundColor Green
} catch {
    Write-Host "manifest.json: INVALID JSON - $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

$blockers = @()
if ($builtManifest -match 'nox-tools/') { $blockers += 'manifest still has nox-tools/' }
if ($builtManifest -match '"key"\s*:') { $blockers += 'manifest still has key' }
if ($builtManifest -match 'chrome://') { $blockers += 'manifest still has chrome:// permission' }
if ($builtBackground -match 'nox-tools/') { $blockers += 'background.js still has nox-tools/' }
if ($builtBackground -notmatch 'e1-background\.js') { $blockers += 'background.js missing e1-background.js import' }

if ($blockers.Count -gt 0) {
    Write-Host "ABORT - package blockers:" -ForegroundColor Red
    $blockers | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
    Remove-Item $tempFolder -Recurse -Force
    exit 1
}

# Verify every manifest ref exists in temp folder (flattened paths)
$built = $builtManifest | ConvertFrom-Json
$verifyRefs = Get-ManifestFileRefs -Manifest $built
$missingBuilt = @()
foreach ($rel in $verifyRefs) {
    if (-not (Test-Path (Join-Path $tempFolder $rel))) { $missingBuilt += $rel }
}
if ($missingBuilt.Count -gt 0) {
    Write-Host "ABORT: $($missingBuilt.Count) file(s) missing from built package:" -ForegroundColor Red
    $missingBuilt | Select-Object -First 20 | ForEach-Object { Write-Host "  $_" -ForegroundColor Red }
    Remove-Item $tempFolder -Recurse -Force
    exit 1
}
Write-Host "All $($verifyRefs.Count) manifest files present in package" -ForegroundColor Green

$rootDirs = Get-ChildItem $tempFolder -Directory
if ($rootDirs.Count -gt 0) {
    Write-Host "ABORT: package contains $($rootDirs.Count) subfolder(s) - must be flat" -ForegroundColor Red
    $rootDirs | ForEach-Object { Write-Host "  $($_.Name)" }
    exit 1
}

$fileCount = (Get-ChildItem $tempFolder -File).Count
Write-Host "Package files at root: $fileCount" -ForegroundColor Green

Write-Host "Creating ZIP..." -ForegroundColor Cyan
New-FlatZip -SourceDir $tempFolder -DestinationZip $zipPath

$outFolder = Join-Path $root ([System.IO.Path]::GetFileNameWithoutExtension($OutName))
if (Test-Path $outFolder) { Remove-Item $outFolder -Recurse -Force }
Copy-Item $tempFolder $outFolder -Recurse -Force

Remove-Item $tempFolder -Recurse -Force

$sizeMb = [Math]::Round((Get-Item $zipPath).Length / 1048576, 2)
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zipArchive = [System.IO.Compression.ZipFile]::OpenRead($zipPath)
try { $zipEntries = $zipArchive.Entries.Count } finally { $zipArchive.Dispose() }

Write-Host ""
Write-Host "Done: $OutName ($sizeMb MB, $zipEntries entries, v1.0.8)" -ForegroundColor Green
Write-Host "ZIP:    $zipPath" -ForegroundColor Cyan
Write-Host "Folder: $outFolder" -ForegroundColor Cyan
Write-Host ""
Write-Host "AdsPower:" -ForegroundColor Yellow
Write-Host "  1. Remove old Ecom Efficiency extension"
Write-Host "  2. Import ZIP or folder Ecom-Efficiency-AdsPower (NOT 'Ecom Efficiency style')"
Write-Host "  3. Enable extension on each profile"
