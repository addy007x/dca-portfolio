@echo off
cd /d "%~dp0"
title DCA Auto Push
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0auto-push.ps1"
pause
