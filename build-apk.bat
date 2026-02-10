@echo off
setlocal

echo.
echo ==========================================
echo       MEMBANGUN APK (ANDROID) - EAS
echo ==========================================
echo.

:: Cek apakah EAS CLI tersedia
where eas >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] EAS CLI tidak ditemukan.
    echo Silakan install dengan: npm install -g eas-cli
    pause
    exit /b %errorlevel%
)

echo [1/2] Memastikan file eas.json sudah benar...
:: eas.json sudah kita cek sebelumnya dan memiliki profil preview dengan buildType: apk

echo [2/2] Memulai proses build APK...
echo Pilih metode build:
echo 1. Build di Cloud (Bawaan Expo - Antrean mungkin lama)
echo 2. Build di Lokal (Memerlukan Android SDK & Java terinstall)
echo.

set /p choice="Masukkan pilihan (1/2): "

if "%choice%"=="1" (
    echo Menjalankan: eas build -p android --profile preview
    eas build -p android --profile preview
) else if "%choice%"=="2" (
    echo Menjalankan: eas build -p android --profile preview --local
    eas build -p android --profile preview --local
) else (
    echo Pilihan tidak valid. Membatalkan.
)

echo.
echo ==========================================
if %errorlevel% equ 0 (
    echo BERHASIL! Silakan cek output di atas.
) else (
    echo TERJADI KESALAHAN saat proses build.
)
echo ==========================================
pause
