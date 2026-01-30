@echo off
chcp 65001 >nul 2>&1

echo Starting LOF Monitor v1.0.0 by Pa55w0rd...
echo.

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js not found
    pause
    exit /b 1
)

echo Node.js: OK
node --version

if not exist "package.json" (
    echo ERROR: package.json not found
    pause
    exit /b 1
)

echo package.json: OK

if not exist "node_modules" (
    echo Installing dependencies...
    npm install
) else (
    echo Dependencies: OK
)

echo.
echo Starting application...
npm start

if %errorlevel% neq 0 (
    echo ERROR: Failed to start
    pause
)
