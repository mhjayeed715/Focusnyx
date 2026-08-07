import zipfile, os, sys, shutil

src = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.normpath(os.path.join(src, '..'))
dest_frontend = os.path.normpath(os.path.join(root_dir, 'frontend', 'public', 'downloads', 'FocusnyxCompanionApp-Windows.zip'))
dest_root = os.path.normpath(os.path.join(root_dir, 'companion.zip'))

os.makedirs(os.path.dirname(dest_frontend), exist_ok=True)

exe_path = os.path.join(src, 'dist', 'FocusnyxCompanion.exe')
if not os.path.exists(exe_path):
    print(f"ERROR: Executable not found at {exe_path}. Please build it first.")
    sys.exit(1)

print(f"Creating ZIP with ONLY FocusnyxCompanion.exe at: {dest_frontend}")
with zipfile.ZipFile(dest_frontend, 'w', zipfile.ZIP_DEFLATED) as z:
    z.write(exe_path, 'FocusnyxCompanion.exe')
    print("  + FocusnyxCompanion.exe (standalone Windows executable)")

# Copy to root companion.zip as well
shutil.copy2(dest_frontend, dest_root)
size = os.path.getsize(dest_frontend)
print(f"Done. Packaged size: {size:,} bytes")
print(f"Copied to: {dest_root}")


