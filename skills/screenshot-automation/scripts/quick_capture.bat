@echo off
echo ========================================
echo   GBase Support Screenshot Capture
echo ========================================
echo.

REM Check if puppeteer is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed
    echo Please install from https://nodejs.org/
    pause
    exit /b 1
)

REM Install puppeteer if needed
if not exist "node_modules\puppeteer" (
    echo Installing puppeteer...
    npm install puppeteer
    echo.
)

echo Starting screenshot capture...
echo.

REM Run without auth (public pages only)
if "%1"=="--auth" (
    node puppeteer_capture.js --auth
) else (
    node puppeteer_capture.js
)

echo.
echo Done! Check the screenshots folder.
pause
