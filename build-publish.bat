@echo off
chcp 65001 >nul
title BUILD VA DONG GOI HE THONG KE TOAN (PORT 9092 VA 9093)
cd /d "%~dp0"

echo.
echo =================================================================
echo   DANG CHAY BUILD VA DONG GOI PUBLISH.ZIP CHO HE THONG
echo =================================================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0build-publish.ps1"
if errorlevel 1 (
    echo.
    echo [LOI] Qua trinh build gap su co. Vui long kiem tra log o tren!
    pause
    exit /b 1
)

echo.
echo [HOAN TAT] File publish.zip da san sang trong thu muc nay!
echo.
pause
exit /b 0
