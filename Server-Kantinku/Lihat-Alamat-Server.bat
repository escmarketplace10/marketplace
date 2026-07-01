@echo off
title Kantinku - Alamat Server
echo ============================================================
echo   Alamat untuk diisi di aplikasi HP/Tablet ("Setup Server")
echo ============================================================
echo.
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
  for /f "tokens=* delims= " %%b in ("%%a") do echo         http://%%b:3001
)
echo.
echo   HP/Tablet harus terhubung ke WiFi yang SAMA dengan PC ini.
echo ============================================================
echo.
pause
