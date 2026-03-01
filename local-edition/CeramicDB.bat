@echo off
title CeramicDB Local Edition
echo.
echo  ====================================
echo    CeramicDB Local Edition
echo    Ceramic Analysis Platform
echo  ====================================
echo.

:: Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo  [ERROR] Node.js is not installed.
    echo  Please install from: https://nodejs.org
    pause
    exit /b
)

cd /d "%~dp0"

:: Install dependencies if needed
if not exist "node_modules" (
    echo  Installing dependencies...
    call npm install --silent
    echo  Done!
    echo.
)

echo  Starting CeramicDB server...
echo  The application will open in your browser shortly.
echo.
echo  Press Ctrl+C to stop the server when done.
echo.
start "" http://localhost:4000
node server.js
