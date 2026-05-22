# Creates an AdsPower-ready ZIP:
# - manifest.json at ZIP root, UTF-8 without BOM, original JSON preserved
# - no Chrome Web Store "key", no webRequestBlocking
# - nox-tools/ex1 + ex2 flattened to nox-tools/e1-* and e2-* (max 1 subfolder at root)
param(
    [string]$OutName = "Ecom-Efficiency-AdsPower.zip",
    [string]$OutFolderName = "Ecom-Efficiency-AdsPower"
)

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$zipPath = Join-Path $root $OutName
$outFolderPath = Join-Path $root $OutFolderName
$tempFolder = Join-Path $root "temp_zip_folder"
$manifestSrc = Join-Path $root "manifest.json"
$utf8NoBom = New-Object System.Text.UTF8Encoding $false

Write-Host "Creating AdsPower ZIP: $OutName" -ForegroundColor Green

if (-not (Test-Path $manifestSrc)) {
    Write-Host "manifest.json not found in $root" -ForegroundColor Red
    exit 1
}

if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
if (Test-Path $tempFolder) { Remove-Item $tempFolder -Recurse -Force }
New-Item -ItemType Directory -Path $tempFolder | Out-Null

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
            if ($cs.js) {
                foreach ($j in $cs.js) { if ($j) { [void]$refs.Add([string]$j) } }
            }
            if ($cs.css) {
                foreach ($c in $cs.css) { if ($c) { [void]$refs.Add([string]$c) } }
            }
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

function Get-AdsPowerRelativePath {
    param([string]$RelativePath)
    if ($RelativePath -match '^nox-tools/ex1/(.+)$') { return "nox-tools/e1-$($matches[1])" }
    if ($RelativePath -match '^nox-tools/ex2/(.+)$') { return "nox-tools/e2-$($matches[1])" }
    return $RelativePath
}

function Copy-RelativeFile {
    param([string]$RelativePath)
    $adsPath = Get-AdsPowerRelativePath -RelativePath $RelativePath
    $src = Join-Path $root $RelativePath
    if (-not (Test-Path $src)) { return $false }
    $dst = Join-Path $tempFolder $adsPath
    $dstDir = Split-Path $dst -Parent
    if ($dstDir -and -not (Test-Path $dstDir)) {
        New-Item -ItemType Directory -Path $dstDir -Force | Out-Null
    }
    Copy-Item $src -Destination $dst -Force
    return $true
}

function Install-FlattenedNoxTools {
    $noxSrc = Join-Path $root "nox-tools"
    $noxDst = Join-Path $tempFolder "nox-tools"
    if (-not (Test-Path $noxSrc)) { return 0 }

    if (Test-Path $noxDst) { Remove-Item $noxDst -Recurse -Force }
    New-Item -ItemType Directory -Path $noxDst -Force | Out-Null

    Get-ChildItem $noxSrc -File -ErrorAction SilentlyContinue | ForEach-Object {
        Copy-Item $_.FullName -Destination (Join-Path $noxDst $_.Name) -Force
    }

    $ex1 = Join-Path $noxSrc "ex1"
    if (Test-Path $ex1) {
        Get-ChildItem $ex1 -File | ForEach-Object {
            Copy-Item $_.FullName -Destination (Join-Path $noxDst ("e1-" + $_.Name)) -Force
        }
    }

    $ex2 = Join-Path $noxSrc "ex2"
    if (Test-Path $ex2) {
        Get-ChildItem $ex2 -File | ForEach-Object {
            Copy-Item $_.FullName -Destination (Join-Path $noxDst ("e2-" + $_.Name)) -Force
        }
    }

    return (Get-ChildItem $noxDst -File).Count
}

function Write-AdsPowerManifest {
    param([string]$DestPath)
    $content = [System.IO.File]::ReadAllText($manifestSrc, [System.Text.Encoding]::UTF8)
    $content = $content.TrimStart([char]0xFEFF)

    # Flatten nox-tools paths (AdsPower: max 3 subfolders - ex1/ex2 nested too deep)
    $content = $content.Replace('nox-tools/ex1/', 'nox-tools/e1-')
    $content = $content.Replace('nox-tools/ex2/', 'nox-tools/e2-')

    # Remove Chrome Web Store public key (last property before closing brace)
    $content = [regex]::Replace($content, ',\s*\r?\n\s*"key"\s*:\s*"(?:[^"\\]|\\.)*"', '')

    # Remove obsolete MV3 permission
    $content = [regex]::Replace($content, '\r?\n\s*"webRequestBlocking",\s*', "`n")
    $content = [regex]::Replace($content, '"webRequestBlocking",\s*', '')

    [System.IO.File]::WriteAllText($DestPath, $content, $utf8NoBom)
}

function Test-AdsPowerFolderStructure {
    param([string]$BaseDir)
    $dirs = Get-ChildItem $BaseDir -Recurse -Directory
    $nestedUnderNox = $dirs | Where-Object {
        $rel = $_.FullName.Substring($BaseDir.Length).TrimStart('\', '/')
        $rel -match '^nox-tools[/\\][^/\\]+[/\\]'
    }
    if ($nestedUnderNox.Count -gt 0) {
        Write-Host "Invalid: nested folders inside nox-tools:" -ForegroundColor Red
        $nestedUnderNox | ForEach-Object { Write-Host "  $($_.FullName)" }
        return $false
    }

    $rootDirs = Get-ChildItem $BaseDir -Directory
    if ($rootDirs.Count -gt 3) {
        Write-Host "Invalid: more than 3 root subfolders ($($rootDirs.Count)):" -ForegroundColor Red
        $rootDirs | ForEach-Object { Write-Host "  $($_.Name)" }
        return $false
    }

    return $true
}

function Copy-RootExtensionAssets {
    $patterns = @("*.js", "*.html", "*.css", "*.png", "*.json")
    $added = 0
    foreach ($pattern in $patterns) {
        Get-ChildItem $root -File -Filter $pattern -ErrorAction SilentlyContinue | ForEach-Object {
            $rel = $_.Name
            if ($rel -eq "manifest.json") { return }
            if (Copy-RelativeFile -RelativePath $rel) { $added++ }
        }
    }
    return $added
}

# --- Build ---
$manifest = Get-Content $manifestSrc -Raw -Encoding UTF8 | ConvertFrom-Json
$fileRefs = Get-ManifestFileRefs -Manifest $manifest
Write-Host "Files referenced in manifest.json: $($fileRefs.Count)" -ForegroundColor Cyan

$copied = 0
$missing = @()
foreach ($rel in ($fileRefs | Sort-Object)) {
    if ($rel -match '^nox-tools/ex[12]/') { continue }
    if (Copy-RelativeFile -RelativePath $rel) {
        $copied++
    } else {
        $missing += $rel
        Write-Host "  MISSING: $rel" -ForegroundColor Red
    }
}

$noxCount = Install-FlattenedNoxTools
Write-Host "$noxCount files in flattened nox-tools/ (no ex1/ex2 subfolders)" -ForegroundColor Green

foreach ($rel in ($fileRefs | Where-Object { $_ -match '^nox-tools/ex[12]/' })) {
    $adsPath = Get-AdsPowerRelativePath -RelativePath $rel
    if (-not (Test-Path (Join-Path $tempFolder $adsPath))) {
        $missing += $rel
        Write-Host "  MISSING (flattened): $adsPath" -ForegroundColor Red
    }
}

$extras = @(
    "style.css", "pro_tools_page.html", "ee_check.json", "higgsfield_ecom_config.js",
    "ee_higgsfield_verify_popup.js", "higgsfield_ecom_subscription.js", "higgsfield_safety.js",
    "higgsfield_payment_early.js", "higgsfield_otp.js", "higgsfield_credits_notif.js",
    "ee_guard_bridge.js", "ee_presence_beacon.js", "ee_silence_console.js", "ee_tools_pro.js",
    "bootstrap_login.js", "blocked_redirect.js", "2fa_live_helper.js"
)
foreach ($extra in $extras) {
    if (Copy-RelativeFile -RelativePath $extra) { $copied++ }
}

$rootAssets = Copy-RootExtensionAssets
Write-Host "$rootAssets extra root asset(s) synced (js/html/css/png/json)" -ForegroundColor Green

if ($missing.Count -gt 0) {
    Write-Host "`nABORT: $($missing.Count) file(s) missing." -ForegroundColor Red
    Remove-Item $tempFolder -Recurse -Force
    exit 1
}

Write-AdsPowerManifest -DestPath (Join-Path $tempFolder "manifest.json")
Write-Host "manifest.json written (UTF-8 no BOM, paths flattened, key removed)" -ForegroundColor Green

try {
    Get-Content (Join-Path $tempFolder "manifest.json") -Raw -Encoding UTF8 | ConvertFrom-Json | Out-Null
    Write-Host "manifest.json JSON validation: OK" -ForegroundColor Green
} catch {
    Write-Host "manifest.json JSON validation FAILED: $($_.Exception.Message)" -ForegroundColor Red
    Remove-Item $tempFolder -Recurse -Force
    exit 1
}

if (-not (Test-AdsPowerFolderStructure -BaseDir $tempFolder)) {
    Remove-Item $tempFolder -Recurse -Force
    exit 1
}

$rootDirCount = (Get-ChildItem $tempFolder -Directory).Count
Write-Host "Root subfolders: $rootDirCount (AdsPower max: 3)" -ForegroundColor Green

Write-Host "Building ZIP..." -ForegroundColor Cyan
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zipTemp = Join-Path $env:TEMP ("ee-adspower-" + [Guid]::NewGuid().ToString() + ".zip")
if (Test-Path $zipTemp) { Remove-Item $zipTemp -Force }
[System.IO.Compression.ZipFile]::CreateFromDirectory($tempFolder, $zipTemp)
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
Move-Item $zipTemp $zipPath -Force

if (Test-Path $outFolderPath) { Remove-Item $outFolderPath -Recurse -Force }
Copy-Item $tempFolder -Destination $outFolderPath -Recurse -Force
Remove-Item $tempFolder -Recurse -Force

$fileCount = (Get-ChildItem $outFolderPath -Recurse -File).Count
$sizeMb = [Math]::Round((Get-Item $zipPath).Length / 1048576, 2)
Write-Host "`nDone: $OutName - $sizeMb MB ($fileCount files)" -ForegroundColor Green
Write-Host "ZIP:  $zipPath" -ForegroundColor Cyan
Write-Host "Folder (use in AdsPower profile): $outFolderPath" -ForegroundColor Cyan
Write-Host @"

AdsPower setup (after changing the extension):
  1. Extensions (global) -> Developer mode -> remove old Ecom Efficiency import
  2. Import ZIP: $OutName  (OR load unpacked folder: $OutFolderName)
  3. Edit each profile -> Extensions -> enable Ecom Efficiency
  4. Do NOT point the profile to 'Ecom Efficiency style' (spaces + manifest key break AdsPower)

"@ -ForegroundColor Yellow
