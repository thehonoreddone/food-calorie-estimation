# Start Expo dev server for USB-connected Android device
# Uses adb reverse to forward port, avoiding network issues

Set-Location $PSScriptRoot

# Kill any existing Metro bundler on port 8081
$existing = netstat -ano | Select-String ":8081.*LISTENING"
if ($existing) {
    $pid = ($existing -split '\s+')[-1]
    Write-Host "Killing existing process on port 8081 (PID: $pid)..." -ForegroundColor Yellow
    taskkill /PID $pid /F 2>$null
    Start-Sleep -Seconds 2
}

# Check connected devices
$devices = adb devices | Select-String "device$"
if (-not $devices) {
    Write-Host "No Android device found! Make sure:" -ForegroundColor Red
    Write-Host "  1. USB cable is connected" -ForegroundColor Red
    Write-Host "  2. USB debugging is enabled on phone" -ForegroundColor Red
    Write-Host "  3. You authorized this computer on the phone" -ForegroundColor Red
    exit 1
}

Write-Host "Found device(s):" -ForegroundColor Green
$devices | ForEach-Object { Write-Host "  $_" -ForegroundColor Green }

# Get the first physical device (not emulator)
$physicalDevice = ($devices | Where-Object { $_ -notmatch "emulator" } | Select-Object -First 1) -replace '\s+device$',''
if ($physicalDevice) {
    Write-Host "Setting up ADB port forwarding for $physicalDevice..." -ForegroundColor Cyan
    adb -s $physicalDevice reverse tcp:8081 tcp:8081
} else {
    Write-Host "Setting up ADB port forwarding..." -ForegroundColor Cyan
    adb reverse tcp:8081 tcp:8081
}

Write-Host "Starting Metro Bundler (localhost mode)..." -ForegroundColor Green
$env:REACT_NATIVE_PACKAGER_HOSTNAME = "127.0.0.1"
npx expo start --android
