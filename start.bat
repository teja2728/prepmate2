@echo off
REM Prepmate Startup Script for Windows
REM This script starts both backend and frontend

echo 🚀 Starting Prepmate Application
echo ================================

echo 📦 Starting backend server...
start "Prepmate Backend" cmd /k "npm run dev"

echo ⏳ Waiting for backend to start...
timeout /t 5 /nobreak >nul

echo 🌐 Starting frontend...
start "Prepmate Frontend" cmd /k "cd client && npm start"

echo ✅ Both servers are starting!
echo.
echo 📋 Access URLs:
echo    Frontend: http://localhost:3000
echo    Backend:  http://localhost:5000
echo.
echo Press any key to close this window...
pause >nul



