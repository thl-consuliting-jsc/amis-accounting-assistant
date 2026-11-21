# ===================================================================
# SCRIPT CAP NHAT 1-CLICK TREN VPS (PORT 9092 & 9093)
# Tu dong: Tim publish.zip, Tu tao Site neu thieu, Anti-File Lock, Xoa Cache, Dong bo & Health Check
# ===================================================================
param(
    [string]$ZipPath = ""
)

$ErrorActionPreference = "Continue"

# 1. Kiem tra quyen Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "`n=================================================================" -ForegroundColor Yellow
    Write-Host "  [CANH BAO] FILE NAY CAN CHAY DUOI QUYEN ADMINISTRATOR!" -ForegroundColor Yellow
    Write-Host "=================================================================" -ForegroundColor Yellow
    Write-Host "  Cach lam: Click chuot phai vao file -> Chon 'Run as administrator'" -ForegroundColor White
    Write-Host "=================================================================`n" -ForegroundColor Yellow
    pause
    exit 1
}

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "  CAP NHAT HE THONG KE TOAN 1-CLICK TREN VPS (PORT 9092 & 9093)" -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan

$AppCmd = "$env:SystemRoot\System32\inetsrv\appcmd.exe"
$BaseIisDir = "C:\inetpub\wwwroot\HUNG_TEST\0.App"
$ClientDest = Join-Path $BaseIisDir "Client"
$ServerDest = Join-Path $BaseIisDir "Server"

# 2. Tu dong tim file publish.zip
Write-Host "`n[1/6] Dang tim file 'publish.zip' tren he thong..." -ForegroundColor Green
$CandidatePaths = @(
    $ZipPath,
    (Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) "publish.zip"),
    (Join-Path $PSScriptRoot "publish.zip"),
    (Join-Path $env:USERPROFILE "Desktop\publish.zip"),
    (Join-Path $env:USERPROFILE "Downloads\publish.zip"),
    (Join-Path $BaseIisDir "publish.zip"),
    "D:\2026\1.Work\9.PHUONG\publish.zip",
    "C:\publish.zip"
) | Where-Object { $_ -and (Test-Path $_) }

$SelectedZip = $CandidatePaths | Select-Object -First 1

if (-not $SelectedZip) {
    Write-Host "[LOI] Khong tim thay file 'publish.zip' o bat ky vi tri nao sau day:" -ForegroundColor Red
    Write-Host "  - Thu muc hien tai: $PSScriptRoot\publish.zip" -ForegroundColor White
    Write-Host "  - Desktop: $env:USERPROFILE\Desktop\publish.zip" -ForegroundColor White
    Write-Host "  - Downloads: $env:USERPROFILE\Downloads\publish.zip" -ForegroundColor White
    Write-Host "  - Thu muc IIS: $BaseIisDir\publish.zip" -ForegroundColor White
    Write-Host "`nVui long copy file 'publish.zip' vao mot trong cac thu muc tren roi chay lai!" -ForegroundColor Yellow
    pause
    exit 1
}

$ZipItem = Get-Item $SelectedZip
Write-Host "  -> Da tim thay file: $($ZipItem.FullName)" -ForegroundColor White
Write-Host "  -> Dung luong: $('{0:N2}' -f ($ZipItem.Length / 1MB)) MB | Ngay tao: $($ZipItem.LastWriteTime.ToString('dd/MM/yyyy HH:mm:ss'))" -ForegroundColor White

# Dam bao thu muc dich ton tai
if (-not (Test-Path $ClientDest)) { $null = New-Item -ItemType Directory -Path $ClientDest -Force }
if (-not (Test-Path $ServerDest)) { $null = New-Item -ItemType Directory -Path $ServerDest -Force }

# Tu dong kiem tra va khoi tao IIS Site neu chua co (Self-Healing)
if (Test-Path $AppCmd) {
    $siteClient = & $AppCmd list site /name:"AMIS_Client_9092"
    if (-not $siteClient) {
        Write-Host "  -> Tu dong khoi tao AMIS_Client_9092 tren IIS..." -ForegroundColor Yellow
        $null = & $AppCmd add apppool /name:"AppPool_AmisClient_9092" /managedRuntimeVersion:"" /managedPipelineMode:Integrated
        $null = & $AppCmd set apppool /apppool.name:"AppPool_AmisClient_9092" /startMode:AlwaysRunning /autoStart:true
        $null = & $AppCmd add site /name:"AMIS_Client_9092" /bindings:http/*:9092: /physicalPath:"$ClientDest"
        $null = & $AppCmd set app "AMIS_Client_9092/" /applicationPool:"AppPool_AmisClient_9092"
    }

    $siteServer = & $AppCmd list site /name:"AMIS_Server_9093"
    if (-not $siteServer) {
        Write-Host "  -> Tu dong khoi tao AMIS_Server_9093 tren IIS..." -ForegroundColor Yellow
        $null = & $AppCmd add apppool /name:"AppPool_AmisServer_9093" /managedRuntimeVersion:"" /managedPipelineMode:Integrated
        $null = & $AppCmd set apppool /apppool.name:"AppPool_AmisServer_9093" /startMode:AlwaysRunning /autoStart:true
        $null = & $AppCmd add site /name:"AMIS_Server_9093" /bindings:http/*:9093: /physicalPath:"$ServerDest"
        $null = & $AppCmd set app "AMIS_Server_9093/" /applicationPool:"AppPool_AmisServer_9093"
    }

    # Mo Firewall neu chua co (Su dung cmdlet PowerShell an toan tranh loi FileStream cua netsh)
    try {
        if (-not (Get-NetFirewallRule -DisplayName "AMIS_Client_9092" -ErrorAction SilentlyContinue)) {
            $null = New-NetFirewallRule -DisplayName "AMIS_Client_9092" -Direction Inbound -LocalPort 9092 -Protocol TCP -Action Allow -Profile Any -ErrorAction SilentlyContinue
        }
        if (-not (Get-NetFirewallRule -DisplayName "AMIS_Server_9093" -ErrorAction SilentlyContinue)) {
            $null = New-NetFirewallRule -DisplayName "AMIS_Server_9093" -Direction Inbound -LocalPort 9093 -Protocol TCP -Action Allow -Profile Any -ErrorAction SilentlyContinue
        }
    } catch {
        try {
            Start-Process netsh.exe -ArgumentList 'advfirewall firewall add rule name="AMIS_Client_9092" dir=in action=allow protocol=TCP localport=9092 profile=any' -NoNewWindow -Wait -ErrorAction SilentlyContinue
            Start-Process netsh.exe -ArgumentList 'advfirewall firewall add rule name="AMIS_Server_9093" dir=in action=allow protocol=TCP localport=9093 profile=any' -NoNewWindow -Wait -ErrorAction SilentlyContinue
        } catch {}
    }
}

# 3. Co che chong ket file DLL (Anti-File Lock)
Write-Host "`n[2/6] Kich hoat che do chong ket file (Anti-File Lock)..." -ForegroundColor Green

# Tao file app_offline.htm de IIS lap tuc nha tien trinh
$OfflineHtml = @"
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Dang bao tri</title></head>
<body style="font-family:sans-serif;text-align:center;padding:50px;">
  <h2>He thong dang tu dong cap nhat phien ban moi...</h2>
  <p>Vui long cho trong giay lat (he thong se khoi dong lai ngay lap tuc).</p>
</body>
</html>
"@

if (Test-Path $ClientDest) {
    Set-Content -Path (Join-Path $ClientDest "app_offline.htm") -Value $OfflineHtml -Force
}
if (Test-Path $ServerDest) {
    Set-Content -Path (Join-Path $ServerDest "app_offline.htm") -Value $OfflineHtml -Force
}

# Dung AppPool va Site voi timeout an toan
if (Test-Path $AppCmd) {
    Write-Host "  -> Tam dung IIS AppPool & Site..." -ForegroundColor Gray
    $null = & $AppCmd stop apppool /apppool.name:"AppPool_AmisServer_9093"
    $null = & $AppCmd stop apppool /apppool.name:"AppPool_AmisClient_9092"
    $null = & $AppCmd stop site /name:"AMIS_Server_9093"
    $null = & $AppCmd stop site /name:"AMIS_Client_9092"
}

# Cho 2 giay de giai phong handle
Start-Sleep -Seconds 2

# Cuong che giai phong neu con tien trinh khoa dll
Get-Process -Name "dotnet", "w3wp" -ErrorAction SilentlyContinue | ForEach-Object {
    try {
        $pPath = $_.Path
        if ($pPath -and ($pPath.Contains("HUNG_TEST") -or $pPath.Contains("0.App"))) {
            Write-Host "  -> Giai phong tien trinh khoa: $($_.ProcessName) (PID: $($_.Id))" -ForegroundColor Gray
            Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
        }
    } catch {}
}

# 4. Giai nen publish.zip vao thu muc tam
Write-Host "`n[3/6] Dang giai nen publish.zip..." -ForegroundColor Green
$TempExtract = Join-Path $env:TEMP ("AmisPublishTemp_" + (Get-Random))
$null = New-Item -ItemType Directory -Path $TempExtract -Force

try {
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    [System.IO.Compression.ZipFile]::ExtractToDirectory($SelectedZip, $TempExtract)
}
catch {
    Write-Host "[LOI] Khong the giai nen file zip: $_" -ForegroundColor Red
    pause
    exit 1
}

# 5. Xoa file cache cu & Dong bo file moi
Write-Host "`n[4/6] Dong bo ma nguon moi & Xoa cache assets cu..." -ForegroundColor Green

# Xoa cac file js/css bam cu o Client tranh loi cache trinh duyet
if (Test-Path $ClientDest) {
    Get-ChildItem -Path $ClientDest -Include "main-*.js", "styles-*.css", "polyfills-*.js", "chunk-*.js" -Recurse -File -ErrorAction SilentlyContinue | Remove-Item -Force
}

# Copy Client
$SourceClient = Join-Path $TempExtract "Client"
if (Test-Path $SourceClient) {
    $null = New-Item -ItemType Directory -Path $ClientDest -Force
    $null = & robocopy $SourceClient $ClientDest /E /NP /R:2 /W:1 /XF app_offline.htm
    Write-Host "  -> Da cap nhat Client (Port 9092)" -ForegroundColor White
} else {
    Write-Host "  [Canh bao] Khong tim thay thu muc Client trong file zip" -ForegroundColor Yellow
}

# Copy Server
$SourceServer = Join-Path $TempExtract "Server"
if (Test-Path $SourceServer) {
    $null = New-Item -ItemType Directory -Path $ServerDest -Force
    $null = & robocopy $SourceServer $ServerDest /E /NP /R:2 /W:1 /XF app_offline.htm
    Write-Host "  -> Da cap nhat Server (Port 9093)" -ForegroundColor White
} else {
    Write-Host "  [Canh bao] Khong tim thay thu muc Server trong file zip" -ForegroundColor Yellow
}

# Copy 6. APP (Trolyketoan.exe Engine)
$SourceApp = Join-Path $TempExtract "6. APP"
if (Test-Path $SourceApp) {
    $DestApp = Join-Path $BaseIisDir "6. APP"
    $null = New-Item -ItemType Directory -Path $DestApp -Force
    $null = & robocopy $SourceApp $DestApp /E /NP /R:2 /W:1
    $null = & robocopy $SourceApp (Join-Path $ServerDest "6. APP") /E /NP /R:2 /W:1
    Write-Host "  -> Da cap nhat 6. APP (Trolyketoan.exe)" -ForegroundColor White
}

# Xoa thu muc tam
Remove-Item -Path $TempExtract -Recurse -Force -ErrorAction SilentlyContinue

# 6. Go app_offline.htm va Khoi dong lai IIS
Write-Host "`n[5/6] Khoi dong lai he thong & Go bo che do bao tri..." -ForegroundColor Green
Remove-Item -Path (Join-Path $ClientDest "app_offline.htm") -Force -ErrorAction SilentlyContinue
Remove-Item -Path (Join-Path $ServerDest "app_offline.htm") -Force -ErrorAction SilentlyContinue

# Phan quyen day du cho IIS
try {
    $null = icacls $BaseIisDir /grant "IIS_IUSRS:(OI)(CI)F" /grant "IUSR:(OI)(CI)F" /t /q
} catch {}

if (Test-Path $AppCmd) {
    $null = & $AppCmd start apppool /apppool.name:"AppPool_AmisClient_9092"
    $null = & $AppCmd start apppool /apppool.name:"AppPool_AmisServer_9093"
    $null = & $AppCmd start site /name:"AMIS_Client_9092"
    $null = & $AppCmd start site /name:"AMIS_Server_9093"
    $null = & $AppCmd recycle apppool /apppool.name:"AppPool_AmisServer_9093"
    $null = & $AppCmd recycle apppool /apppool.name:"AppPool_AmisClient_9092"
}

# 7. Health Check tu dong (Retry 6 lan cho .NET cold start)
Write-Host "`n[6/6] Dang kiem tra trang thai hoat dong (Health Check)..." -ForegroundColor Green

$clientOk = $false
$serverOk = $false

for ($i = 1; $i -le 6; $i++) {
    Write-Host "  -> Kiem tra ket noi lan $i/6 (cho khoi dong)... " -NoNewline -ForegroundColor Gray
    Start-Sleep -Seconds 3

    # Check Server 9093
    if (-not $serverOk) {
        try {
            $respServer = Invoke-WebRequest -Uri "http://localhost:9093/api/accounting/version" -UseBasicParsing -TimeoutSec 5 -ErrorAction SilentlyContinue
            if ($respServer -and ($respServer.StatusCode -eq 200 -or $respServer.StatusCode -eq 204)) {
                $serverOk = $true
            }
        } catch {}
    }

    # Check Client 9092
    if (-not $clientOk) {
        try {
            $respClient = Invoke-WebRequest -Uri "http://localhost:9092" -UseBasicParsing -TimeoutSec 5 -ErrorAction SilentlyContinue
            if ($respClient -and ($respClient.StatusCode -eq 200 -or $respClient.StatusCode -eq 304)) {
                $clientOk = $true
            }
        } catch {}
    }

    if ($clientOk -and $serverOk) {
        Write-Host "OK!" -ForegroundColor Green
        break
    } else {
        $stt = @()
        if ($clientOk) { $stt += "Client: OK" } else { $stt += "Client: Cho..." }
        if ($serverOk) { $stt += "Server: OK" } else { $stt += "Server: Cho..." }
        Write-Host "($($stt -join ', '))" -ForegroundColor Yellow
    }
}

Write-Host "`n=================================================================" -ForegroundColor Cyan
Write-Host "               KET QUA CAP NHAT HE THONG TREN VPS" -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan

if ($clientOk) {
    Write-Host "  [OK] Client (Web): ONLINE" -ForegroundColor Green
    Write-Host "       -> Noi bo:    http://localhost:9092" -ForegroundColor White
    Write-Host "       -> Cong khai: http://103.107.183.86:9092" -ForegroundColor White
} else {
    Write-Host "  [?] Client (Web): Da khoi dong xong. Mo thu:" -ForegroundColor Yellow
    Write-Host "       -> http://localhost:9092 hoac http://103.107.183.86:9092" -ForegroundColor White
}

if ($serverOk) {
    Write-Host "`n  [OK] Server (API): ONLINE" -ForegroundColor Green
    Write-Host "       -> Noi bo:    http://localhost:9093/api/accounting/version" -ForegroundColor White
    Write-Host "       -> Cong khai: http://103.107.183.86:9093/api/accounting/version" -ForegroundColor White
} else {
    Write-Host "`n  [?] Server (API): Da cap nhat ma nguon. Mo thu:" -ForegroundColor Yellow
    Write-Host "       -> http://localhost:9093/api/accounting/version" -ForegroundColor White
}

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "Hoan tat! Tren IIS Manager hay bam F5 de cap nhat danh sach Site." -ForegroundColor Green
Write-Host ""
pause
