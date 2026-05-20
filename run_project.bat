@echo off
set "ROOT_DIR=%~dp0"
cd /d "%ROOT_DIR%"

echo ============================================================
echo   AquaMark AI - Intelligent Image Watermarking System
echo ============================================================
echo.

echo [1/3] Installing Python dependencies...
python -m pip install -r requirements.txt
echo.

echo [2/3] Starting Backend Server...
start "AquaMark Backend" powershell -NoExit -Command "Set-Location -LiteralPath '%ROOT_DIR%'; python -m uvicorn backend.main:app --reload --port 8000"
echo Backend starting on http://localhost:8000
echo.

echo [3/3] Installing and starting Frontend...
cd /d "%ROOT_DIR%frontend"
call npm install
start "AquaMark Frontend" powershell -NoExit -Command "Set-Location -LiteralPath '%ROOT_DIR%frontend'; npm run dev"
echo Frontend starting on http://localhost:5173
echo.

echo ============================================================
echo   Both servers are starting in separate windows.
echo   Backend: http://localhost:8000
echo   Frontend: http://localhost:5173
echo   API Docs: http://localhost:8000/docs
echo ============================================================
pause
