# ===================================================================
# SCRIPT BUILD & PACKAGING TOI UU DUNG LUONG (PORT 9092 & 9093)
# Toi uu hoa: Loai bo go chat cu (emoji ~5MB), bo runtime Linux/ARM, bo satellite DLLs
# ===================================================================
param(
    [switch]$KeepStaging = $false
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "  BUILD & TOI UU DUNG LUONG FILE PUBLISH.ZIP (PORT 9092 & 9093)" -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan

# 1. Thu muc lam viec
$StagingDir = Join-Path $ScriptDir "publish_staging"
$ClientPublishDir = Join-Path $StagingDir "Client"
$ServerPublishDir = Join-Path $StagingDir "Server"
$ZipOutputPath = Join-Path $ScriptDir "publish.zip"

if (Test-Path $StagingDir) {
    Write-Host "[1/6] Don dep thu muc staging cu..." -ForegroundColor Yellow
    Remove-Item -Path $StagingDir -Recurse -Force
}
if (Test-Path $ZipOutputPath) {
    Write-Host "[1/6] Xoa file publish.zip cu..." -ForegroundColor Yellow
    Remove-Item -Path $ZipOutputPath -Force
}

$null = New-Item -ItemType Directory -Path $ClientPublishDir -Force
$null = New-Item -ItemType Directory -Path $ServerPublishDir -Force

# 2. Build Backend .NET chi dinh win-x64 runtime (Tiet kiem bo nho)
Write-Host "`n[2/6] Dang compile Backend .NET API (win-x64, Framework-dependent)..." -ForegroundColor Green
$ServerDir = Join-Path $ScriptDir "Server"
Push-Location $ServerDir
try {
    dotnet publish -c Release -r win-x64 --no-self-contained -o $ServerPublishDir --nologo
    if ($LASTEXITCODE -ne 0) { throw "Dotnet publish that bai voi ma loi $LASTEXITCODE" }
}
finally {
    Pop-Location
}

# 3. Build Frontend Angular (Production)
Write-Host "`n[3/6] Dang compile Frontend Angular (Production)..." -ForegroundColor Green
$ClientDir = Join-Path $ScriptDir "Client"
Push-Location $ClientDir
try {
    npm run build:ci
    if ($LASTEXITCODE -ne 0) { throw "NPM build that bai voi ma loi $LASTEXITCODE" }
}
finally {
    Pop-Location
}

# 4. Sao chep phan Client sang Staging
Write-Host "`n[4/6] Sao chep ban build Web vao Staging..." -ForegroundColor Green
$ClientDistBrowser = Join-Path $ClientDir "dist\amt-chat-internal\browser"
if (-not (Test-Path $ClientDistBrowser)) {
    throw "Khong tim thay thu muc build $ClientDistBrowser"
}
Copy-Item -Path "$ClientDistBrowser\*" -Destination $ClientPublishDir -Recurse -Force

# Copy Web.config
$ClientWebConfig = Join-Path $ClientDir "web.config"
if (Test-Path $ClientWebConfig) {
    Copy-Item -Path $ClientWebConfig -Destination $ClientPublishDir -Force
}

$ServerWebConfig = Join-Path $ServerDir "web.config"
if (Test-Path $ServerWebConfig) {
    Copy-Item -Path $ServerWebConfig -Destination $ServerPublishDir -Force
}

# Copy cac script cap nhat vao staging de tien loi trien khai tren VPS
Copy-Item -Path (Join-Path $ScriptDir "cap-nhat-vps.ps1") -Destination $StagingDir -Force
Copy-Item -Path (Join-Path $ScriptDir "cap-nhat-vps.bat") -Destination $StagingDir -Force
Copy-Item -Path (Join-Path $ScriptDir "tao-port-9092-9093.ps1") -Destination $StagingDir -Force
Copy-Item -Path (Join-Path $ScriptDir "tao-port-9092-9093.bat") -Destination $StagingDir -Force

# Copy thu muc 6. APP (Chua dong co Trolyketoan.exe va quy_tac.json)
$AppSource = Join-Path $ScriptDir "6. APP"
if (Test-Path $AppSource) {
    Write-Host "  -> Copy 6. APP (Trolyketoan.exe) vao Staging va Server..." -ForegroundColor Green
    Copy-Item -Path $AppSource -Destination (Join-Path $StagingDir "6. APP") -Recurse -Force
    Copy-Item -Path $AppSource -Destination (Join-Path $ServerPublishDir "6. APP") -Recurse -Force
}

# Dam bao co file App Desktop (Tauri build moi) trong thu muc assets/downloads
$TauriNsisExe = Join-Path $ScriptDir "Client\src-tauri\target\release\bundle\nsis\Trợ lý kế toán_2.5.0_x64-setup.exe"
if (-not (Test-Path $TauriNsisExe)) {
    $TauriNsisExe = Get-ChildItem -Path (Join-Path $ScriptDir "Client\src-tauri\target\release\bundle\nsis") -Filter "*.exe" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1 -ExpandProperty FullName
}
$ExeSource = if ($TauriNsisExe -and (Test-Path $TauriNsisExe)) { $TauriNsisExe } else { Join-Path $ScriptDir "Client\src\assets\downloads\TroLyKeToan_Setup.exe" }
$DownloadsDest = Join-Path $ClientPublishDir "assets\downloads"
if (Test-Path $ExeSource) {
    $null = New-Item -ItemType Directory -Path $DownloadsDest -Force
    Copy-Item -Path $ExeSource -Destination (Join-Path $DownloadsDest "TroLyKeToan_Setup.exe") -Force
    # Chi giu 1 file cai dat chuan duy nhat TroLyKeToan_Setup.exe, loai bo cac ban sao trung lap
    Get-ChildItem -Path $DownloadsDest -Filter "TroLyKeToan_v2*.exe" -ErrorAction SilentlyContinue | Remove-Item -Force
}

# 5. TOI UU HOA DUNG LUONG (TAY SACH CAC TEP THUA):
Write-Host "`n[5/6] Dang cat giam dung luong triet de..." -ForegroundColor Green

# A. Xoa toan bo thu muc emoji cua chat noi bo cu (~4.7MB khong su dung)
$StagingEmoji = Join-Path $ClientPublishDir "assets\emoji"
if (Test-Path $StagingEmoji) {
    Remove-Item -Path $StagingEmoji -Recurse -Force
    Write-Host "  -> Da loai bo thu muc emoji chat noi bo cu (-4.7 MB)" -ForegroundColor Yellow
}

# B. Xoa cac thu muc ngon ngu thua cua Microsoft.Data.SqlClient (ru, ja, ko, de, fr...)
$LangFolders = @("cs", "de", "es", "fr", "it", "ja", "ko", "pl", "pt-BR", "ru", "tr", "zh-Hans", "zh-Hant")
foreach ($lang in $LangFolders) {
    $targetLang = Join-Path $ServerPublishDir $lang
    if (Test-Path $targetLang) {
        Remove-Item -Path $targetLang -Recurse -Force
    }
}
Write-Host "  -> Da loai bo cac thu muc ngon ngu thua cua SqlClient (-2.2 MB)" -ForegroundColor Yellow

# C. Xoa runtimes khong phai Windows x64 (unix, win-arm64, win-x86)
$UnusedRuntimes = @(
    (Join-Path $ServerPublishDir "runtimes\unix"),
    (Join-Path $ServerPublishDir "runtimes\win-arm64"),
    (Join-Path $ServerPublishDir "runtimes\win-x86")
)
foreach ($rt in $UnusedRuntimes) {
    if (Test-Path $rt) {
        Remove-Item -Path $rt -Recurse -Force
    }
}
Write-Host "  -> Da loai bo runtimes Linux va ARM64 khong can thiet cho IIS" -ForegroundColor Yellow

# D. Xoa file sourcemap va debug .pdb
Get-ChildItem -Path $StagingDir -Include "*.pdb", "*.map", "*.xml" -Recurse -File | ForEach-Object {
    if ($_.Extension -ne ".json" -and $_.Extension -ne ".config") {
        Remove-Item $_.FullName -Force
    }
}

# 6. Dong goi file publish.zip
Write-Host "`n[6/6] Dang dong goi thanh publish.zip sieu nhe..." -ForegroundColor Green
Add-Type -AssemblyName System.IO.Compression.FileSystem
if (Test-Path $ZipOutputPath) { Remove-Item -Path $ZipOutputPath -Force }
try {
    [System.IO.Compression.ZipFile]::CreateFromDirectory($StagingDir, $ZipOutputPath, [System.IO.Compression.CompressionLevel]::Optimal, $false)
    # Kiem tra tinh toan ven cua zip
    $testZip = [System.IO.Compression.ZipFile]::OpenRead($ZipOutputPath)
    $testEntriesCount = $testZip.Entries.Count
    $testZip.Dispose()
    Write-Host "  -> Kiem tra ZIP thanh cong: $testEntriesCount tep." -ForegroundColor Green
} catch {
    Write-Host "  -> Dang dong goi lai qua Python an toan..." -ForegroundColor Yellow
    python -c "import os, zipfile; z = zipfile.ZipFile('$($ZipOutputPath.Replace('\','/'))', 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=6); [z.write(os.path.join(r, f), os.path.relpath(os.path.join(r, f), '$($StagingDir.Replace('\','/'))')) for r, d, files in os.walk('$($StagingDir.Replace('\','/'))') for f in files]; z.close()"
}

if (-not $KeepStaging) {
    Remove-Item -Path $StagingDir -Recurse -Force
}

$ZipSizeMb = (Get-Item $ZipOutputPath).Length / 1MB
$ZipSizeKb = (Get-Item $ZipOutputPath).Length / 1KB

Write-Host "`n=================================================================" -ForegroundColor Cyan
Write-Host "  DONG GOI THANH CONG! FILE PUBLISH.ZIP DA DUOC TOI UU TRIET DE" -ForegroundColor Green
Write-Host "  Dung luong cu: ~7.86 MB" -ForegroundColor Gray
Write-Host "  Dung luong moi: $('{0:N2}' -f $ZipSizeMb) MB ($('{0:N0}' -f $ZipSizeKb) KB)" -ForegroundColor White
Write-Host "=================================================================" -ForegroundColor Cyan
