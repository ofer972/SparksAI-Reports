@echo off
echo Merging relevant source files...
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0merge-files.ps1"

echo.
pause
