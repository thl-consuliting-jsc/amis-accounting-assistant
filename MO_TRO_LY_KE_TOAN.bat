@echo off
title Tro ly ke toan
cd /d "D:\2026\1.Work\9.PHUONG\Server_Publish"

netstat -ano | findstr ":9092" >nul
if errorlevel 1 (
    echo Dang khoi dong may chu Tro ly ke toan...
    start "" "start_silent.vbs"
    timeout /t 3 /nobreak >nul
)

echo Dang mo Tro ly ke toan tren trinh duyet...
start "" "http://localhost:9092"
exit
