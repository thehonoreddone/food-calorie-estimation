# ============================================================
# Nutrino - Android Emülatör + Expo Başlatma Scripti
# ============================================================
# Kullanım: PowerShell'de şu komutu çalıştır:
#   cd app\mobile
#   .\start-emulator.ps1
# ============================================================

$ErrorActionPreference = "SilentlyContinue"
$ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$ADB = "$ANDROID_HOME\platform-tools\adb.exe"
$EMULATOR = "$ANDROID_HOME\emulator\emulator.exe"
$AVD_NAME = "Medium_Phone_API_36.1"

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Nutrino - Emulator Launcher" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# 1. Check if emulator is already running
Write-Host "[1/5] Emulator kontrol ediliyor..." -ForegroundColor Cyan
$devices = & $ADB devices 2>&1 | Out-String
if ($devices -match "emulator-\d+\s+device") {
    Write-Host "  -> Emulator zaten calisiyor!" -ForegroundColor Yellow
} else {
    # 2. Launch emulator
    Write-Host "[2/5] Emulator baslatiliyor ($AVD_NAME)..." -ForegroundColor Cyan
    Start-Process $EMULATOR -ArgumentList "-avd", $AVD_NAME -WindowStyle Normal
    
    # Wait for boot
    Write-Host "  -> Boot bekleniyor..." -ForegroundColor Gray
    & $ADB wait-for-device 2>&1 | Out-Null
    
    # Wait for boot_completed
    $bootComplete = ""
    $retries = 0
    while ($bootComplete -ne "1" -and $retries -lt 60) {
        Start-Sleep -Seconds 2
        $bootComplete = (& $ADB shell getprop sys.boot_completed 2>&1).ToString().Trim()
        $retries++
        Write-Host "." -NoNewline
    }
    Write-Host ""
    
    if ($bootComplete -eq "1") {
        Write-Host "  -> Emulator basariyla basladi!" -ForegroundColor Green
    } else {
        Write-Host "  -> Emulator boot zaman asimina ugradi!" -ForegroundColor Red
        exit 1
    }
}

# 3. Check Expo Go installed
Write-Host "[3/5] Expo Go kontrol ediliyor..." -ForegroundColor Cyan
$packages = & $ADB shell "pm list packages" 2>&1 | Out-String
if ($packages -match "host.exp.exponent") {
    Write-Host "  -> Expo Go yuklu!" -ForegroundColor Green
} else {
    Write-Host "  -> Expo Go yuklu degil, Expo onu otomatik indirecek." -ForegroundColor Yellow
}

# 4. ADB Reverse Port (emulator -> host bağlantısı)
Write-Host "[4/5] Port yonlendirme ayarlaniyor (adb reverse)..." -ForegroundColor Cyan
& $ADB reverse tcp:8081 tcp:8081 2>&1 | Out-Null
& $ADB reverse tcp:8082 tcp:8082 2>&1 | Out-Null
Write-Host "  -> Port 8081 ve 8082 yonlendirildi!" -ForegroundColor Green

# 5. Start Expo
Write-Host "[5/5] Expo Dev Server baslatiliyor..." -ForegroundColor Cyan
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Uygulama emulator'de acilacak!" -ForegroundColor Green
Write-Host "  Ctrl+C ile durdurabilirsiniz." -ForegroundColor Gray
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

npx expo start --android
