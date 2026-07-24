@echo off
echo ===================================================
echo   Focusnyx Windows Companion - PyInstaller Builder
echo ===================================================
echo.

echo 1. Checking Python dependencies...
pip install -r requirements.txt

echo 2. Packaging Focusnyx Companion executable...
pyinstaller --noconfirm --onedir --windowed --uac-admin --name "FocusnyxCompanion" ^
  --icon="assets\icon.ico" ^
  --add-data ".env;.env" ^
  --add-data "assets;assets" ^
  --hidden-import "win32gui" ^
  --hidden-import "win32con" ^
  --hidden-import "keyboard" ^
  --hidden-import "pynput" ^
  --hidden-import "psutil" ^
  --hidden-import "flask" ^
  --hidden-import "tkinter" ^
  focusnyx_companion.py

echo.
echo ===================================================
echo   Build complete! Output is in dist\FocusnyxCompanion
echo ===================================================
pause
