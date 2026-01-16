# Development Script for Windows PowerShell
# Run both frontend and backend concurrently

$ErrorActionPreference = "Stop"

Write-Host "=====================================" -ForegroundColor Blue
Write-Host "  Food Calorie Estimation - Dev Mode " -ForegroundColor Blue
Write-Host "=====================================" -ForegroundColor Blue

# Get paths
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent $ScriptDir
$FrontendDir = Join-Path $RootDir "frontend"
$BackendDir = Join-Path $RootDir "backend"

Write-Host "Root directory: $RootDir" -ForegroundColor Green

# Check .env files
if (-not (Test-Path (Join-Path $FrontendDir ".env.local"))) {
    Write-Host "Warning: frontend/.env.local not found" -ForegroundColor Yellow
    Write-Host "Copy .env.example to .env.local and configure"
}

if (-not (Test-Path (Join-Path $BackendDir ".env"))) {
    Write-Host "Warning: backend/.env not found" -ForegroundColor Yellow
    Write-Host "Copy .env.example to .env and configure"
}

# Install frontend dependencies if needed
if (-not (Test-Path (Join-Path $FrontendDir "node_modules"))) {
    Write-Host "Installing frontend dependencies..." -ForegroundColor Blue
    Push-Location $FrontendDir
    npm install
    Pop-Location
}

# Create Python venv if needed
$VenvPath = Join-Path $BackendDir ".venv"
if (-not (Test-Path $VenvPath)) {
    Write-Host "Creating Python virtual environment..." -ForegroundColor Blue
    Push-Location $BackendDir
    python -m venv .venv
    & ".venv\Scripts\Activate.ps1"
    pip install -r requirements.txt
    Pop-Location
}

# Start backend as job
Write-Host "Starting backend on http://localhost:8000" -ForegroundColor Green
$BackendJob = Start-Job -ScriptBlock {
    param($Dir)
    Set-Location $Dir
    & ".venv\Scripts\Activate.ps1"
    uvicorn main:app --reload --port 8000
} -ArgumentList $BackendDir

# Wait for backend to start
Start-Sleep -Seconds 3

# Start frontend as job
Write-Host "Starting frontend on http://localhost:3000" -ForegroundColor Green
$FrontendJob = Start-Job -ScriptBlock {
    param($Dir)
    Set-Location $Dir
    npm run dev
} -ArgumentList $FrontendDir

Write-Host ""
Write-Host "Press Ctrl+C to stop both servers" -ForegroundColor Yellow
Write-Host ""

# Monitor jobs
try {
    while ($true) {
        # Output from backend
        Receive-Job -Job $BackendJob -ErrorAction SilentlyContinue
        
        # Output from frontend
        Receive-Job -Job $FrontendJob -ErrorAction SilentlyContinue
        
        Start-Sleep -Milliseconds 500
    }
}
finally {
    Write-Host "`nShutting down..." -ForegroundColor Blue
    Stop-Job -Job $BackendJob -ErrorAction SilentlyContinue
    Stop-Job -Job $FrontendJob -ErrorAction SilentlyContinue
    Remove-Job -Job $BackendJob -ErrorAction SilentlyContinue
    Remove-Job -Job $FrontendJob -ErrorAction SilentlyContinue
}
