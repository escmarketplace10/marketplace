@echo off
title Kantinku - Server
color 0A
cd /d "%~dp0"

echo ============================================================
echo               KANTINKU - SERVER (PC Kasir)
echo ============================================================
echo.
echo  Alamat untuk diisi di aplikasi HP/Tablet ("Setup Server"):
echo.
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
  for /f "tokens=* delims= " %%b in ("%%a") do echo         http://%%b:3001
)
echo.
echo   - HP/Tablet harus terhubung ke WiFi yang SAMA dengan PC ini.
echo   - Biarkan jendela ini TETAP TERBUKA selama berjualan.
echo   - Tutup jendela ini untuk mematikan server.
echo.
echo ============================================================
echo.

"%~dp0node.exe" "%~dp0app\dist\index.js"

echo.
echo Server berhenti. Tekan tombol apa saja untuk menutup.
pause >nul
