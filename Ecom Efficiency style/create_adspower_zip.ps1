# Script PowerShell pour créer un ZIP correct pour AdsPower
# Ce script crée un ZIP avec les fichiers à la racine (pas dans un sous-dossier)

Write-Host "Creation du ZIP pour AdsPower..." -ForegroundColor Green

# Nom du fichier ZIP de sortie
$zipFileName = "Ecom-Efficiency-AdsPower.zip"
$zipPath = Join-Path $PSScriptRoot $zipFileName

# Supprimer l'ancien ZIP s'il existe
if (Test-Path $zipPath) {
    Remove-Item $zipPath -Force
    Write-Host "Ancien ZIP supprime" -ForegroundColor Yellow
}

# Liste des fichiers à inclure (tous les fichiers JS et le manifest)
$filesToInclude = @(
    "manifest.json",
    "background.js",
    "content.js",
    "popup-detector.js",
    "popup.html",
    "popup.js",
    "icon.png",
    "logo_ecom.png",
    "loadingBar.js",
    "style.css",
    "blocked.html",
    # Tous les scripts auto-login
    "after_block.js",
    "afterlib_overlay.js",
    "atria_auto_login.js",
    "atria_remove.js",
    "auto_11.js",
    "auto_login_11.js",
    "auto_login_after.js",
    "auto_login_ai.js",
    "auto_login_brandsearch.js",
    "auto_login_capcut.js",
    "auto_login_dropship.js",
    "auto_login_ecomh.js",
    "auto_login_foreplay.js",
    "auto_login_gemini_google.js",
    "auto_login_heygen.js",
    "auto_login_kalo.js",
    "auto_login_pipiads_fr.js",
    "auto_login_pipiads.js",
    "auto_login_rankerfox.js",
    "auto_login_semrush.js",
    "auto_login_sendshort.js",
    "auto_login_shop.js",
    "auto_login_shophunter.js",
    "auto_login_spy.js",
    "auto_logout_11.js",
    "auto_pipiads.js",
    "auto_trendtrack.js",
    "block_canv_2head.js",
    "block_canva_1head.js",
    "block_win_head.js",
    "block11labs.js",
    "blocked_redirect.js",
    "bootstrap_login.js",
    "brandsearch_cleanup.js",
    "crisp_remover.js",
    "capcut_hide_titlebar_controls.js",
    "capcut_remove_recent_projects.js",
    "cutout.js",
    "disable_overlay_pipiads.js",
    "ecomefficiency_auto_login.js",
    "elevenlabs_card_updated.html",
    "fomo.js",
    "foreplay_auto_logout.js",
    "foreplay_login.js",
    "fotor.js",
    "gemini_overlay.js",
    "gpt.js",
    "helium.js",
    "heygen_blocker.js",
    "hide_banner.js",
    "higgsfield_ms_click.js",
    "higgsfield_overlay.js",
    "higgsfield-email-login.js",
    "higgsfield-login.js",
    "imap_server.js",
    "kalo_simple_blocker.js",
    "kalo_url_blocker.js",
    "live_oauth_password.js",
    "log_exp.js",
    "log_filki.js",
    "log_pipiads.js",
    "log_sendshort.js",
    "log_spy.js",
    "modify_title_and_link.js",
    "ms_oauth_email.js",
    "nichescrapper.js",
    "nop_after.js",
    "nox_tools.js",
    "nox-runway.js",
    "oauth_login.js",
    "openai_email_verification.js",
    "pinspy.js",
    "pipiads_logout_externe.js",
    "pipiads.html",
    "pop.js",
    "premium_redirect_rankerfox.js",
    "remove_11_profile.js",
    "remove_banner_rankerfox.js",
    "remove_dropship_banner.js",
    "remove_exp.js",
    "remove_foreplay_trial.js",
    "remove_foreplay.js",
    "remove_fotor.js",
    "remove_sendshort.js",
    "runway.js",
    "sell.js",
    "semrush_overlay.js",
    "shop_redirect.js",
    "shophunter_remove_usermenu.js",
    "spy_block_card.js",
    "spy_get_log.js",
    "spy_remove.js",
    "submagic.js",
    "test_server.js",
    "trendtrack.js",
    "tt_auto_login.js",
    "tt_content.js",
    "veo3.js",
    "vidyo.js",
    "win.js",
    "winninghunter_auto_logout.js"
)

# Créer un dossier temporaire pour les fichiers
$tempFolder = Join-Path $PSScriptRoot "temp_zip_folder"
if (Test-Path $tempFolder) {
    Remove-Item $tempFolder -Recurse -Force
}
New-Item -ItemType Directory -Path $tempFolder | Out-Null

Write-Host "Copie des fichiers..." -ForegroundColor Cyan

# Copier les fichiers dans le dossier temporaire
$copiedCount = 0
$missingFiles = @()

foreach ($file in $filesToInclude) {
    $sourcePath = Join-Path $PSScriptRoot $file
    if (Test-Path $sourcePath) {
        Copy-Item $sourcePath -Destination $tempFolder
        $copiedCount++
    } else {
        $missingFiles += $file
        Write-Host "Fichier manquant: $file" -ForegroundColor Yellow
    }
}

Write-Host "$copiedCount fichiers copies" -ForegroundColor Green

if ($missingFiles.Count -gt 0) {
    Write-Host "$($missingFiles.Count) fichiers manquants (non critiques)" -ForegroundColor Yellow
}

# Créer une copie modifiée du manifest sans la clé
Write-Host "Modification du manifest.json (suppression de la cle)..." -ForegroundColor Cyan

$manifestPath = Join-Path $tempFolder "manifest.json"
$manifestContent = Get-Content $manifestPath -Raw | ConvertFrom-Json

# Supprimer la clé pour AdsPower
if ($manifestContent.PSObject.Properties.Name -contains "key") {
    $manifestContent.PSObject.Properties.Remove("key")
    Write-Host "Cle publique supprimee du manifest" -ForegroundColor Green
}

# Supprimer la permission obsolète webRequestBlocking
if ($manifestContent.permissions -contains "webRequestBlocking") {
    $manifestContent.permissions = $manifestContent.permissions | Where-Object { $_ -ne "webRequestBlocking" }
    Write-Host "Permission obsolete 'webRequestBlocking' supprimee" -ForegroundColor Green
}

# Sauvegarder le manifest modifié
$manifestContent | ConvertTo-Json -Depth 10 | Set-Content $manifestPath -Encoding UTF8

Write-Host "Creation du fichier ZIP..." -ForegroundColor Cyan

# Créer le ZIP avec les fichiers à la racine
Compress-Archive -Path "$tempFolder\*" -DestinationPath $zipPath -Force

# Nettoyer le dossier temporaire
Remove-Item $tempFolder -Recurse -Force

Write-Host "`nZIP cree avec succes: $zipFileName" -ForegroundColor Green
Write-Host "Emplacement: $zipPath" -ForegroundColor Cyan
Write-Host "`nInstructions pour AdsPower:" -ForegroundColor Yellow
Write-Host "   1. Ouvrir AdsPower" -ForegroundColor White
Write-Host "   2. Aller dans Extensions" -ForegroundColor White
Write-Host "   3. Activer le 'Mode développeur'" -ForegroundColor White
Write-Host "   4. Cliquer sur 'Charger l'extension décompressée' ou importer le ZIP" -ForegroundColor White
Write-Host "   5. Sélectionner le fichier: $zipFileName`n" -ForegroundColor White

# Afficher la taille du fichier
$zipSize = (Get-Item $zipPath).Length / 1MB
Write-Host "Taille du ZIP: $([Math]::Round($zipSize, 2)) MB" -ForegroundColor Cyan

Write-Host "`nTermine !" -ForegroundColor Green

