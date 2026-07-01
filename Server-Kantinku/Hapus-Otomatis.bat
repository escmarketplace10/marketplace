@echo off
title Kantinku - Hapus Server Otomatis
cd /d "%~dp0"

net session >nul 2>&1
if %errorlevel% neq 0 (
  echo.
  echo ============================================================
  echo  Mohon jalankan file ini sebagai ADMINISTRATOR.
  echo  Klik kanan pada file ini -^> "Run as administrator"
  echo ============================================================
  echo.
  pause
  exit /b 1
)

set SVC=KantinkuServer
set NSSM=%~dp0nssm.exe

echo Menghentikan dan menghapus layanan otomatis Kantinku Server...
"%NSSM%" stop %SVC% >nul 2>&1
"%NSSM%" remove %SVC% confirm

echo.
echo Selesai. Mode otomatis sudah dihapus.
echo Mulai sekarang jalankan server lewat Mulai-Server.bat secara manual.
echo.
pause
