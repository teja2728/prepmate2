@echo off
REM Prepmate Setup Script for Windows
REM This script sets up the Prepmate application

echo 🚀 Prepmate Setup Script
echo ========================

REM Check if .env file exists
if not exist .env (
    echo 📝 Creating .env file from template...
    copy env.example .env
    echo ✅ .env file created
    echo ⚠️  Please edit .env file with your MongoDB URI and Gemini API key
) else (
    echo ✅ .env file already exists
)

REM Install backend dependencies
echo 📦 Installing backend dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install backend dependencies
    pause
    exit /b 1
)

REM Install client dependencies
echo 📦 Installing client dependencies...
cd client
call npm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install client dependencies
    pause
    exit /b 1
)
cd ..

echo ✅ Setup complete!
echo.
echo 🚀 To start the application:
echo    npm run dev:full
echo.
echo 📝 Don't forget to:
echo    1. Edit .env file with your MongoDB URI and Gemini API key
echo    2. Start MongoDB if using local instance
echo    3. Get your Gemini API key from Google AI Studio
echo.
pause



