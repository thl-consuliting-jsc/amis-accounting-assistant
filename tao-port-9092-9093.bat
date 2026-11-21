@echo off
chcp 65001 >nul
title KHOI TAO PORT 9092 VA 9093 TREN WINDOWS IIS
cd /d "%~dp0"

:: 1. Kiem tra quyen Administrator (Khong dung ngoac don tranh loi parse)
net session >nul 2>&1
if %errorlevel% neq 0 goto :NOT_ADMIN

set "APPCMD=%windir%\system32\inetsrv\appcmd.exe"
set "BASE_DIR=C:\inetpub\wwwroot\HUNG_TEST\0.App"
set "CLIENT_DIR=%BASE_DIR%\Client"
set "SERVER_DIR=%BASE_DIR%\Server"

echo.
echo =================================================================
echo   KHOI TAO PORT 9092 - CLIENT VA 9093 - SERVER TREN WINDOWS IIS
echo =================================================================
echo.

:: 2. Mo Windows Firewall cho Port 9092 va 9093
echo [1/4] Dang mo Windows Firewall cho Port 9092 va 9093...
netsh advfirewall firewall add rule name="AMIS_Client_9092" dir=in action=allow protocol=TCP localport=9092 profile=any >nul 2>&1
netsh advfirewall firewall add rule name="AMIS_Server_9093" dir=in action=allow protocol=TCP localport=9093 profile=any >nul 2>&1
echo   -^> Da mo Port 9092 va 9093 trong Windows Firewall Inbound TCP.

:: 3. Khoi tao thu muc IIS
echo.
echo [2/4] Khoi tao thu muc tren dia C:...
if not exist "%CLIENT_DIR%" mkdir "%CLIENT_DIR%"
if not exist "%SERVER_DIR%" mkdir "%SERVER_DIR%"
icacls "%BASE_DIR%" /grant "IIS_IUSRS":(OI)(CI)F /grant "IUSR":(OI)(CI)F /t /q >nul 2>&1
echo   -^> Da tao thu muc Client va Server va cap quyen IIS.

:: 4. Cau hinh IIS AppPool va Site bang appcmd
echo.
echo [3/4] Dang cau hinh IIS AppPools va Web Sites...
if not exist "%APPCMD%" goto :NO_IIS

:: Xoa site va apppool cu neu co de binding moi tinh
"%APPCMD%" delete site "AMIS_Client_9092" >nul 2>&1
"%APPCMD%" delete site "AMIS_Server_9093" >nul 2>&1
"%APPCMD%" delete apppool "AppPool_AmisClient_9092" >nul 2>&1
"%APPCMD%" delete apppool "AppPool_AmisServer_9093" >nul 2>&1

:: Tao AppPool moi (No Managed Code, AlwaysRunning)
"%APPCMD%" add apppool /name:"AppPool_AmisClient_9092" /managedRuntimeVersion:"" /managedPipelineMode:Integrated
"%APPCMD%" set apppool /apppool.name:"AppPool_AmisClient_9092" /startMode:AlwaysRunning /autoStart:true

"%APPCMD%" add apppool /name:"AppPool_AmisServer_9093" /managedRuntimeVersion:"" /managedPipelineMode:Integrated
"%APPCMD%" set apppool /apppool.name:"AppPool_AmisServer_9093" /startMode:AlwaysRunning /autoStart:true

:: Tao Web Site Client Port 9092
"%APPCMD%" add site /name:"AMIS_Client_9092" /bindings:http/*:9092: /physicalPath:"%CLIENT_DIR%"
"%APPCMD%" set app "AMIS_Client_9092/" /applicationPool:"AppPool_AmisClient_9092"

:: Tao Web Site Server Port 9093
"%APPCMD%" add site /name:"AMIS_Server_9093" /bindings:http/*:9093: /physicalPath:"%SERVER_DIR%"
"%APPCMD%" set app "AMIS_Server_9093/" /applicationPool:"AppPool_AmisServer_9093"

:: Khoi dong Sites
"%APPCMD%" start site "AMIS_Client_9092" >nul 2>&1
"%APPCMD%" start site "AMIS_Server_9093" >nul 2>&1

:: 5. In danh sach Site xac nhan
echo.
echo [4/4] Ket qua khoi tao tren IIS:
"%APPCMD%" list site | findstr /i "AMIS"
echo.
echo =================================================================
echo   HOAN TAT! DA KHOI TAO THANH CONG PORT 9092 VA 9093 TREN IIS!
echo.
echo   - Web Client: http://localhost:9092 hoac http://103.107.183.86:9092
echo   - API Server: http://localhost:9093 hoac http://103.107.183.86:9093
echo.
echo   Luu y: Tren man hinh IIS Manager hay bam F5 de xem danh sach moi!
echo =================================================================
echo.
pause
exit /b 0

:NOT_ADMIN
echo.
echo =================================================================
echo   [THONG BAO] FILE NAY CAN CHAY DUOI QUYEN ADMINISTRATOR!
echo =================================================================
echo.
echo   Cach lam:
echo     1. Click chuot phai vao file 'tao-port-9092-9093.bat'
echo     2. Chon: "Run as administrator"
echo.
echo =================================================================
echo.
pause
exit /b 1

:NO_IIS
echo.
echo [LOI] Khong tim thay IIS tai: %APPCMD%
echo Vui long kiem tra tinh nang IIS da duoc cai dat tren VPS chua.
echo.
pause
exit /b 1
