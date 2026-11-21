@echo off
title SyncUp - Collaboration Platform
echo Starting SyncUp Web Platform...
where node >nul 2>nul
if %errorlevel% equ 0 (
    echo Launching local server with native ES Module and IndexedDB persistence support...
    node "%~dp0scripts\serve.js"
) else (
    echo Node.js not detected in PATH. Opening directly in default browser...
    start "" "%~dp0index.html"
)
