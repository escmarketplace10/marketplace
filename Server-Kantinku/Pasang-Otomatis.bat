@echo off
title Kantinku - Pasang Server Otomatis
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
set NODE=%~dp0node.exe
set APPJS=%~dp0app\dist\index.js
set APPDIR=%~dp0app

echo ============================================================
echo   Memasang Kantinku Server sebagai layanan Windows otomatis
echo ============================================================
echo.

"%NSSM%" stop %SVC% >nul 2>&1
"%NSSM%" remove %SVC% confirm >nul 2>&1

"%NSSM%" install %SVC% "%NODE%"
"%NSSM%" set %SVC% AppParameters "dist\index.js"
"%NSSM%" set %SVC% AppDirectory "%APPDIR%"
"%NSSM%" set %SVC% DisplayName "Kantinku Server"
"%NSSM%" set %SVC% Description "Server data aplikasi kasir Kantinku. Berjalan otomatis di belakang layar, menyala sendiri tiap PC dihidupkan."
"%NSSM%" set %SVC% Start SERVICE_AUTO_START
"%NSSM%" set %SVC% AppRestartDelay 3000
"%NSSM%" set %SVC% AppStdout "%~dp0server-log.txt"
"%NSSM%" set %SVC% AppStderr "%~dp0server-log.txt"
"%NSSM%" set %SVC% AppRotateFiles 1
"%NSSM%" set %SVC% AppRotateOnline 1
"%NSSM%" set %SVC% AppRotateBytes 1048576
"%NSSM%" start %SVC%

echo.
echo ============================================================
echo  SELESAI! Kantinku Server kini berjalan otomatis di belakang.
echo.
echo  - Anda TIDAK perlu lagi klik Mulai-Server.bat secara manual.
echo  - Server akan menyala sendiri tiap kali PC ini dihidupkan,
echo    dan otomatis menyala ulang jika sempat berhenti/error.
echo  - Untuk melihat alamat IP server, jalankan:
echo        Lihat-Alamat-Server.bat
echo  - Untuk membatalkan mode otomatis ini, jalankan:
echo        Hapus-Otomatis.bat
echo ============================================================
echo.
pause
