@echo off
chcp 65001 >nul
title AMIS Sync Agent - Tro ly Dong Bo Du Lieu Ke Toan
cd /d "%~dp0"

echo =================================================================
echo   DANG KHOI DONG TRỢ LÝ ĐỒNG BỘ DỮ LIỆU AMIS (NODE.JS AGENT)
echo =================================================================

where node >nul 2>nul
if errorlevel 1 (
    echo [CANH BAO] Khong tim thay Node.js tren may tinh cua ban!
    echo Vui long cai dat Node.js tai: https://nodejs.org
    echo Hoac su dung file amis-sync-agent.exe da duoc dong goi san.
    pause
    exit /b 1
)

echo Dang mo giao dien cau hinh tren trinh duyet...
start "" "http://localhost:4999"

echo Dang chay tien trinh dong bo du lieu...
node agent.js
pause
