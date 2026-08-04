@echo off
title Focusnyx Windows Companion
echo Starting Focusnyx Windows Companion...
python focusnyx_companion.py
if errorlevel 1 (
    echo.
    echo Installing dependencies...
    pip install -r requirements.txt
    python focusnyx_companion.py
)
pause
