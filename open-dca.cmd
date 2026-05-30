@echo off
cd /d "%~dp0"
title DCA Local App

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found. Please install Node.js or open this project from Codex.
  pause
  exit /b 1
)

node local-server.cjs 5173
pause
