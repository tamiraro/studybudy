@echo off
REM start.bat — Start the StudyBudy backend server.
REM Run this once before opening the app in a browser.
REM The server must stay open in this window while you use the app.

set PY=C:\Users\tamir1\AppData\Local\Programs\Python\Python311\python.exe
set PYTHONIOENCODING=utf-8

echo.
echo  StudyBudy Backend
echo  ==================
echo  Starting on http://127.0.0.1:5000
echo  Press Ctrl+C to stop.
echo.

cd /d "%~dp0"
"%PY%" app.py
pause
