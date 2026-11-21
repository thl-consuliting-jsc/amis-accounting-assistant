# ===================================================================
# SCRIPT KHOI TAO PORT 9092 & 9093 TREN WINDOWS IIS (CHAY TREN VPS)
# Tự động: UAC Admin, Mo Firewall, Tao AppPool & WebSite tren IIS
# ===================================================================
param()

$ErrorActionPreference = "Continue"

# 1. Kiem tra quyen Administrator (UAC Self-Elevation)
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "Dang yeu cau quyen Administrator..." -ForegroundColor Yellow
    Start-Process powershell.exe -ArgumentList ("-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`"") -Verb RunAs
    exit
}

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "  CAU HINH IIS PORT 9092 (CLIENT) VA 9093 (SERVER) TREN VPS" -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan

# 2. Mo Port Windows Firewall
Write-Host "`n[1/4] Kiem tra va mo Windows Firewall cho Port 9092 va 9093..." -ForegroundColor Green
try {
    $rule9092 = Get-NetFirewallRule -DisplayName "AMIS_Accounting_Client_9092" -ErrorAction SilentlyContinue
    if (-not $rule9092) {
        $null = New-NetFirewallRule -DisplayName "AMIS_Accounting_Client_9092" -Direction Inbound -LocalPort 9092 -Protocol TCP -Action Allow -Profile Any -ErrorAction SilentlyContinue
        Write-Host "  -> Da tao Inbound Firewall Rule cho Port 9092 (TCP Allow)" -ForegroundColor White
    } else {
        Write-Host "  -> Port 9092 da mo trong Firewall" -ForegroundColor Gray
    }

    $rule9093 = Get-NetFirewallRule -DisplayName "AMIS_Accounting_Server_9093" -ErrorAction SilentlyContinue
    if (-not $rule9093) {
        $null = New-NetFirewallRule -DisplayName "AMIS_Accounting_Server_9093" -Direction Inbound -LocalPort 9093 -Protocol TCP -Action Allow -Profile Any -ErrorAction SilentlyContinue
        Write-Host "  -> Da tao Inbound Firewall Rule cho Port 9093 (TCP Allow)" -ForegroundColor White
    } else {
        Write-Host "  -> Port 9093 da mo trong Firewall" -ForegroundColor Gray
    }
}
catch {
    Write-Host "  [Canh bao Firewall] $_" -ForegroundColor Yellow
}

# 3. Tao thu muc tren IIS
$BaseIisDir = "C:\inetpub\wwwroot\HUNG_TEST\0.App"
$ClientPath = Join-Path $BaseIisDir "Client"
$ServerPath = Join-Path $BaseIisDir "Server"

Write-Host "`n[2/4] Khoi tao thu muc dich tren IIS..." -ForegroundColor Green
Write-Host "  -> Thu muc Client: $ClientPath" -ForegroundColor White
Write-Host "  -> Thu muc Server: $ServerPath" -ForegroundColor White

if (-not (Test-Path $ClientPath)) { $null = New-Item -ItemType Directory -Path $ClientPath -Force }
if (-not (Test-Path $ServerPath)) { $null = New-Item -ItemType Directory -Path $ServerPath -Force }

# Phan quyen cho IIS_IUSRS va IUSR
try {
    $null = icacls $BaseIisDir /grant "IIS_IUSRS:(OI)(CI)F" /grant "IUSR:(OI)(CI)F" /t /q
    Write-Host "  -> Da cap quyen truy cap cho IIS_IUSRS va IUSR" -ForegroundColor Gray
} catch {}

# 4. Cau hinh IIS AppPool & Site
Write-Host "`n[3/4] Dang tao AppPools va Web Sites tren IIS..." -ForegroundColor Green
$AppCmd = "$env:SystemRoot\System32\inetsrv\appcmd.exe"

$hasWebAdmin = $false
try {
    Import-Module WebAdministration -ErrorAction Stop
    $hasWebAdmin = $true
} catch {}

# Names
$ClientPool = "AppPool_AmisClient_9092"
$ServerPool = "AppPool_AmisServer_9093"
$ClientSite = "AMIS_Client_9092"
$ServerSite = "AMIS_Server_9093"

# --- TAO APP POOL ---
function Setup-AppPool($poolName) {
    if ($hasWebAdmin) {
        if (-not (Test-Path "IIS:\AppPools\$poolName")) {
            $null = New-WebAppPool -Name $poolName
            Write-Host "  -> Da tao AppPool: $poolName" -ForegroundColor White
        }
        Set-ItemProperty "IIS:\AppPools\$poolName" -Name "managedRuntimeVersion" -Value ""
        Set-ItemProperty "IIS:\AppPools\$poolName" -Name "startMode" -Value "AlwaysRunning"
        Set-ItemProperty "IIS:\AppPools\$poolName" -Name "autoStart" -Value $true
    } elseif (Test-Path $AppCmd) {
        $check = & $AppCmd list apppool /name:"$poolName"
        if (-not $check) {
            $null = & $AppCmd add apppool /name:"$poolName" /managedRuntimeVersion:"" /managedPipelineMode:Integrated
            Write-Host "  -> Da tao AppPool: $poolName" -ForegroundColor White
        } else {
            $null = & $AppCmd set apppool /apppool.name:"$poolName" /managedRuntimeVersion:""
        }
        $null = & $AppCmd set apppool /apppool.name:"$poolName" /startMode:AlwaysRunning /autoStart:true
    }
}

Setup-AppPool $ClientPool
Setup-AppPool $ServerPool

# --- TAO WEB SITE ---
function Setup-WebSite($siteName, $port, $path, $poolName) {
    if ($hasWebAdmin) {
        $site = Get-Website -Name $siteName -ErrorAction SilentlyContinue
        if ($site) {
            Write-Host "  -> Site $siteName da ton tai. Cap nhat duong dan..." -ForegroundColor Gray
            Set-ItemProperty "IIS:\Sites\$siteName" -Name "physicalPath" -Value $path
            Set-ItemProperty "IIS:\Sites\$siteName" -Name "applicationPool" -Value $poolName
        } else {
            # Kiem tra xem port co bi trung voi site khac khong
            $existing = Get-WebBinding -Port $port -ErrorAction SilentlyContinue
            if ($existing) {
                Write-Host "  [Canh bao] Port $port dang bi chiem boi site $($existing.ItemXPath), dang go bo binding cu..." -ForegroundColor Yellow
                Remove-WebBinding -Port $port -ErrorAction SilentlyContinue
            }
            $null = New-Website -Name $siteName -Port $port -PhysicalPath $path -ApplicationPool $poolName
            Write-Host "  -> Da tao Web Site: $siteName tren Port $port" -ForegroundColor Green
        }
        Start-Website -Name $siteName -ErrorAction SilentlyContinue
    } elseif (Test-Path $AppCmd) {
        $check = & $AppCmd list site /name:"$siteName"
        if ($check) {
            Write-Host "  -> Site $siteName da ton tai. Cap nhat..." -ForegroundColor Gray
            $null = & $AppCmd set site /site.name:"$siteName" /[path='/'].[path='/'].physicalPath:"$path"
            $null = & $AppCmd set app "$siteName/" /applicationPool:"$poolName"
        } else {
            # appcmd add site KHONG chap nhan /applicationPool truc tiep
            $null = & $AppCmd add site /name:"$siteName" /bindings:"http/*:${port}:" /physicalPath:"$path"
            $null = & $AppCmd set app "$siteName/" /applicationPool:"$poolName"
            Write-Host "  -> Da tao Web Site: $siteName tren Port $port" -ForegroundColor Green
        }
        $null = & $AppCmd start site /name:"$siteName"
    }
}

Setup-WebSite $ClientSite 9092 $ClientPath $ClientPool
Setup-WebSite $ServerSite 9093 $ServerPath $ServerPool

# 5. Kiem tra va in danh sach Site
Write-Host "`n[4/4] Kiem tra trang thai thuc te tren IIS..." -ForegroundColor Green
if ($hasWebAdmin) {
    Get-Website | Where-Object { $_.Name -like "*AMIS*" -or $_.Name -like "*HUNG*" } | Select-Object Name, ID, State, @{Name="Port";Expression={$_.Bindings.Collection.bindingInformation}} | Format-Table -AutoSize
} elseif (Test-Path $AppCmd) {
    & $AppCmd list site
}

Write-Host "`n=================================================================" -ForegroundColor Cyan
Write-Host "  HOAN TAT! KIEM TRA TREN IIS MANAGER:" -ForegroundColor Green
Write-Host "  1. Vao IIS Manager, click chuot vao 'Sites' va bam F5 (Refresh)." -ForegroundColor White
Write-Host "  2. Chay tiep file 'cap-nhat-vps.bat' de day toan bo code vao 2 site nay." -ForegroundColor White
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host ""
