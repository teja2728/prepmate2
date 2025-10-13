@echo off
REM Prepmate Deployment Script for Windows
REM This script helps deploy Prepmate to production

echo 🚀 Prepmate Deployment Script
echo ==============================

REM Check if .env file exists
if not exist .env (
    echo ❌ .env file not found. Please copy env.example to .env and configure it.
    pause
    exit /b 1
)

echo ✅ Environment file found

REM Install dependencies
echo 📦 Installing dependencies...
call npm ci --only=production
if %errorlevel% neq 0 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)

REM Install client dependencies
echo 📦 Installing client dependencies...
cd client
call npm ci --only=production
if %errorlevel% neq 0 (
    echo ❌ Failed to install client dependencies
    pause
    exit /b 1
)
cd ..

REM Build frontend
echo 🔨 Building frontend...
cd client
call npm run build
if %errorlevel% neq 0 (
    echo ❌ Failed to build frontend
    pause
    exit /b 1
)
cd ..

REM Run tests
echo 🧪 Running tests...
call npm test
if %errorlevel% neq 0 (
    echo ❌ Tests failed
    pause
    exit /b 1
)

REM Start the application
echo 🚀 Starting Prepmate...
call npm start

