# -*- mode: python ; coding: utf-8 -*-


a = Analysis(
    ['focusnyx_companion.py'],
    pathex=[],
    binaries=[],
    datas=[('.env', '.env'), ('assets', 'assets')],
    hiddenimports=['win32gui', 'win32con', 'keyboard', 'pynput', 'psutil', 'flask', 'tkinter'],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='FocusnyxCompanionApp',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    uac_admin=True,
    icon=['assets\\icon.ico'],
)
coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='FocusnyxCompanionApp',
)
