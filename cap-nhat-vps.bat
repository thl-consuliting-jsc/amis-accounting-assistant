@echo off
chcp 65001 >nul
title CAP NHAT HE THONG KE TOAN 1-CLICK TREN VPS (PORT 9092 VA 9093)
cd /d "%~dp0"

echo.
echo =================================================================
echo   TIEN TRINH CAP NHAT HE THONG TREN VPS PORT 9092 VA 9093
echo =================================================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0cap-nhat-vps.ps1"
if errorlevel 1 (
    echo.
    echo [CANH BAO] Qua trinh cap nhat can kiem tra lai.
)

echo.
echo Nhan phim bat ky de ket thuc...
pause >nul
exit /b 0
