@echo off
title Kantinku - Server Backend
color 0A
cd /d "%~dp0backend"

echo ============================================================
echo            KANTINKU - SERVER BACKEND (PC Kasir Utama)
echo ============================================================
echo.

REM Pastikan dependensi terpasang
if not exist "node_modules" (
  echo [INFO] Memasang dependensi backend untuk pertama kali...
  call npm install
  echo.
)

echo [INFO] Alamat untuk diisi di aplikasi Android ("Setup Server"):
echo.
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
  for /f "tokens=* delims= " %%b in ("%%a") do echo        http://%%b:3001
)
echo.
echo   - Pastikan HP/Tablet terhubung ke WiFi yang SAMA dengan PC ini.
echo   - Biarkan jendela ini TETAP TERBUKA selama berjualan.
echo   - Tutup jendela ini untuk mematikan server.
echo.
echo ============================================================
echo.

call npm run dev
pause
