@echo off
chcp 65001 >nul 2>&1

echo Building LOF Monitor v1.0.0 by Pa55w0rd...
echo.

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js not found
    pause
    exit /b 1
)

echo Node.js: OK
node --version

if not exist "node_modules" (
    echo Installing dependencies...
    npm install
) else (
    echo Dependencies: OK
)

echo.
echo Checking running processes...
tasklist /FI "IMAGENAME eq LOF Monitor.exe" 2>nul | find /I /N "LOF Monitor.exe">nul
if "%ERRORLEVEL%"=="0" (
    echo Closing running application...
    taskkill /F /IM "LOF Monitor.exe" >nul 2>&1
    timeout /t 2 /nobreak >nul
)

tasklist /FI "IMAGENAME eq electron.exe" 2>nul | find /I /N "electron.exe">nul
if "%ERRORLEVEL%"=="0" (
    echo Closing Electron processes...
    taskkill /F /IM "electron.exe" >nul 2>&1
    timeout /t 2 /nobreak >nul
)

if exist "dist" (
    echo Cleaning dist...
    timeout /t 1 /nobreak >nul
    rmdir /s /q dist 2>nul
    if exist "dist" (
        echo Retrying cleanup...
        timeout /t 2 /nobreak >nul
        rmdir /s /q dist 2>nul
    )
)

echo.
echo Building application...
npm run build:win

if %errorlevel% neq 0 (
    echo ERROR: Build failed
    pause
    exit /b 1
)

echo.
echo Build complete!
dir /s /b dist\*.exe 2>nul
pause
