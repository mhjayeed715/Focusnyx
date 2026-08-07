import zipfile, os, sys, shutil

src = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.normpath(os.path.join(src, '..'))
dest_frontend = os.path.normpath(os.path.join(root_dir, 'frontend', 'public', 'downloads', 'FocusnyxCompanionApp-Windows.zip'))
dest_root = os.path.normpath(os.path.join(root_dir, 'companion.zip'))

os.makedirs(os.path.dirname(dest_frontend), exist_ok=True)

files = [
    'focusnyx_companion.py',
    'keyboard_blocker.py',
    'registry_manager.py',
    'process_monitor.py',
    'window_manager.py',
    'supabase_sync.py',
    'requirements.txt',
    'build_exe.bat',
    'run_companion.bat',
    '.env.example',
    'FocusnyxCompanion.spec',
]

print(f"Creating ZIP at: {dest_frontend}")
with zipfile.ZipFile(dest_frontend, 'w', zipfile.ZIP_DEFLATED) as z:
    # 1. Include built executable if available
    exe_path = os.path.join(src, 'dist', 'FocusnyxCompanion.exe')
    if os.path.exists(exe_path):
        z.write(exe_path, 'FocusnyxCompanion.exe')
        print("  + FocusnyxCompanion.exe (standalone Windows executable)")

    # 2. Include companion source files & launchers
    for f in files:
        full = os.path.join(src, f)
        if os.path.exists(full):
            z.write(full, f)
            print(f"  + {f}")
        else:
            print(f"  SKIP (not found): {f}")

    # 3. Include assets folder
    assets_dir = os.path.join(src, 'assets')
    if os.path.isdir(assets_dir):
        for fname in os.listdir(assets_dir):
            full = os.path.join(assets_dir, fname)
            if os.path.isfile(full):
                z.write(full, f'assets/{fname}')
                print(f"  + assets/{fname}")

# Copy to root companion.zip as well
shutil.copy2(dest_frontend, dest_root)
size = os.path.getsize(dest_frontend)
print(f"Done. Packaged size: {size:,} bytes")
print(f"Copied to: {dest_root}")

