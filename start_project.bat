@echo off
cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -File "activate_venv.ps1"
pause
