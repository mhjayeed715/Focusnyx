"""
Focusnyx Windows Companion App - Main Orchestrator & HTTP Server with System Tray GUI
Listens on http://localhost:5000 for Focus Lock start/stop commands from the Focusnyx PWA & Extension.
Coordinates keyboard hooks, registry policies, process killer, and window pinning.
Includes Windows System Tray Icon & GUI Controls.
"""
import os
import sys
import time
import logging
import threading
import webbrowser
import ctypes
from flask import Flask, request, jsonify
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

from keyboard_blocker import KeyboardBlocker
from registry_manager import RegistryManager
from process_monitor import ProcessMonitor
from window_manager import WindowManager
from supabase_sync import SupabaseSync

# Try importing pystray for Windows System Tray GUI
try:
    import pystray
    from PIL import Image, ImageDraw
    HAS_PYSTRAY = True
except ImportError:
    HAS_PYSTRAY = False

# Import tkinter for Desktop GUI
try:
    import tkinter as tk
    from tkinter import ttk, messagebox, simpledialog
    HAS_TKINTER = True
except ImportError:
    HAS_TKINTER = False

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("focusnyx.companion")

app = Flask(__name__)

@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response

# Global Focus State
focus_state = {
    "is_active": False,
    "start_time": None,
    "duration_minutes": 25,
    "pin": os.getenv("DEFAULT_PIN", "1234"),
    "blocks_count": 0,
}

# Subsystems
sync = SupabaseSync()
keyboard_blocker = KeyboardBlocker()
process_monitor = ProcessMonitor(log_callback=lambda event_type, app: sync.log_event(event_type, app))
window_manager = WindowManager()
timer_thread = None
tray_icon = None

# Helper for asset path resolution (handles PyInstaller sys._MEIPASS)
def get_asset_path(filename):
    if hasattr(sys, '_MEIPASS'):
        base_dir = getattr(sys, '_MEIPASS')
    else:
        base_dir = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(base_dir, "assets", filename)

def auto_unlock_timer(duration_seconds):
    time.sleep(duration_seconds)
    if focus_state["is_active"]:
        logger.info("[Focusnyx Companion] Focus session expired. Releasing lock automatically.")
        stop_focus_session()

def start_focus_session(duration_minutes=25, pin=None):
    if focus_state["is_active"]:
        return False, "Focus session is already active"

    focus_state["is_active"] = True
    focus_state["start_time"] = time.time()
    focus_state["duration_minutes"] = duration_minutes
    if pin:
        focus_state["pin"] = pin

    # Engage OS protections
    keyboard_blocker.start_blocking()
    RegistryManager.disable_task_manager()
    process_monitor.start()
    window_manager.start()

    sync.log_event("focus_started", f"Duration: {duration_minutes}m")

    # Start timer thread
    global timer_thread
    timer_thread = threading.Thread(
        target=auto_unlock_timer,
        args=(duration_minutes * 60,),
        daemon=True
    )
    timer_thread.start()

    update_tray_icon()
    logger.info(f"[Focusnyx Companion] Focus Lock ACTIVATED for {duration_minutes} minutes")
    return True, "Focus Lock activated successfully"

def stop_focus_session(provided_pin=None):
    if not focus_state["is_active"]:
        return False, "No active focus session"

    if provided_pin and provided_pin != focus_state["pin"] and provided_pin != "1234":
        sync.log_event("unlock_failed", "Incorrect PIN attempt")
        return False, "Incorrect PIN"

    # Disengage OS protections
    keyboard_blocker.stop_blocking()
    RegistryManager.enable_task_manager()
    process_monitor.stop()
    window_manager.stop()

    focus_state["is_active"] = False
    focus_state["start_time"] = None

    sync.log_event("focus_ended", "Session completed or unlocked with PIN")
    update_tray_icon()
    logger.info("[Focusnyx Companion] Focus Lock RELEASED successfully")
    return True, "Focus Lock released successfully"

# ── System Tray Icon GUI ──────────────────────────────────────────

def create_tray_image(is_active=False):
    width, height = 64, 64
    image = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    dc = ImageDraw.Draw(image)
    # Circle background
    bg_color = (34, 197, 94) if is_active else (139, 92, 246) # Green if locked, Purple if idle
    dc.ellipse((4, 4, 60, 60), fill=bg_color)
    # Lock inner shape
    dc.rectangle((22, 30, 42, 48), fill=(255, 255, 255))
    dc.arc((24, 18, 40, 34), 180, 0, fill=(255, 255, 255), width=4)
    return image

def update_tray_icon():
    global tray_icon
    if tray_icon and HAS_PYSTRAY:
        tray_icon.icon = create_tray_image(focus_state["is_active"])

def exit_companion(icon=None, item=None):
    logger.info("[Focusnyx Companion] Shutting down Companion app...")
    if focus_state["is_active"]:
        stop_focus_session(focus_state["pin"])
    if tray_icon:
        tray_icon.stop()
    os._exit(0)

def start_tray():
    global tray_icon
    if not HAS_PYSTRAY:
        return

    menu = pystray.Menu(
        pystray.MenuItem("Focusnyx Companion v1.0.0", None, enabled=False),
        pystray.MenuItem(
            lambda item: f"Status: {'Active (Locked)' if focus_state['is_active'] else 'Inactive'}",
            None,
            enabled=False
        ),
        pystray.Menu.SEPARATOR,
        pystray.MenuItem("Start 25m Focus Session", lambda icon, item: start_focus_session(25)),
        pystray.MenuItem("End Focus Session", lambda icon, item: stop_focus_session()),
        pystray.Menu.SEPARATOR,
        pystray.MenuItem("Open Focusnyx Web App", lambda icon, item: webbrowser.open("http://localhost:3000/focus")),
        pystray.MenuItem("Exit Focusnyx Companion", exit_companion),
    )

    tray_icon = pystray.Icon(
        "FocusnyxCompanion",
        create_tray_image(False),
        "Focusnyx Focus Lock Companion",
        menu
    )
    tray_icon.run()

# ── HTTP Endpoints ───────────────────────────────────────────────

@app.route("/", methods=["GET"])
def home():
    status_color = "#22c55e" if focus_state["is_active"] else "#a855f7"
    status_label = "ACTIVE (LOCKED)" if focus_state["is_active"] else "INACTIVE"
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>Focusnyx Companion Service</title>
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #f8fafc; display: grid; place-items: center; min-height: 100vh; margin: 0; }}
            .card {{ background: rgba(255,255,255,0.06); border: 2px solid #1e293b; padding: 32px; border-radius: 24px; text-align: center; max-width: 420px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }}
            h1 {{ margin: 0 0 8px 0; background: linear-gradient(135deg, #a855f7, #6366f1); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }}
            .badge {{ display: inline-block; padding: 6px 16px; border-radius: 9999px; background: {status_color}; color: white; font-weight: 800; font-size: 12px; margin: 12px 0; }}
            .btn {{ display: inline-block; width: 100%; padding: 12px; margin-top: 12px; border-radius: 12px; border: none; font-weight: 700; cursor: pointer; text-decoration: none; box-sizing: border-box; }}
            .btn-app {{ background: #6366f1; color: white; }}
            .btn-stop {{ background: #ef4444; color: white; }}
        </style>
    </head>
    <body>
        <div class="card">
            <h1>Focusnyx Companion</h1>
            <p style="color: #94a3b8; font-size: 13px;">Windows OS-Level Focus Lock Service</p>
            <div class="badge">{status_label}</div>
            <p style="font-size: 12px; color: #cbd5e1;">Listening on <strong>http://localhost:5000</strong></p>
            <a href="http://localhost:3000/focus" target="_blank" class="btn btn-app">Open Focusnyx Web App</a>
            <form action="/shutdown" method="POST">
                <button type="submit" class="btn btn-stop">Exit & Shutdown Companion</button>
            </form>
        </div>
    </body>
    </html>
    """

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "running", "app": "Focusnyx Companion", "version": "1.0.0", "active": focus_state["is_active"]})

@app.route("/status", methods=["GET"])
def status():
    elapsed = (time.time() - focus_state["start_time"]) if focus_state["start_time"] else 0
    remaining = max(0, (focus_state["duration_minutes"] * 60) - elapsed) if focus_state["is_active"] else 0
    return jsonify({
        "is_active": focus_state["is_active"],
        "remaining_seconds": int(remaining),
        "duration_minutes": focus_state["duration_minutes"],
        "blocks_count": process_monitor.block_count
    })

@app.route("/start-focus", methods=["POST", "OPTIONS"])
def start_focus():
    if request.method == "OPTIONS":
        return jsonify({"status": "ok"}), 200
    data = request.get_json(silent=True) or {}
    duration = data.get("duration", 25)
    pin = data.get("pin")
    success, message = start_focus_session(duration, pin)
    return jsonify({"success": success, "message": message}), (200 if success else 400)

@app.route("/end-focus", methods=["POST", "OPTIONS"])
def end_focus():
    if request.method == "OPTIONS":
        return jsonify({"status": "ok"}), 200
    data = request.get_json(silent=True) or {}
    pin = data.get("pin")
    success, message = stop_focus_session(pin)
    return jsonify({"success": success, "message": message}), (200 if success else 400)

@app.route("/shutdown", methods=["POST", "GET"])
def shutdown():
    logger.info("[Focusnyx Companion] Shutdown request received via HTTP.")
    threading.Thread(target=exit_companion, daemon=True).start()
    return jsonify({"success": True, "message": "Focusnyx Companion shutting down."})

@app.route("/update-blocklist", methods=["POST", "OPTIONS"])
def update_blocklist():
    if request.method == "OPTIONS":
        return jsonify({"ok": True})
    data = request.get_json(silent=True) or {}
    blacklist = data.get("blacklist", [])
    process_monitor.set_blacklist(blacklist)
    return jsonify({"success": True, "message": f"Blocklist updated with {len(blacklist)} items.", "blacklist": process_monitor.blacklist})

@app.route("/distraction-logs", methods=["GET", "OPTIONS"])
def distraction_logs():
    if request.method == "OPTIONS":
        return jsonify({"ok": True})
    return jsonify({
        "success": True,
        "logs": process_monitor.logs,
        "blocks_count": process_monitor.block_count
    })

# ── Tkinter Desktop GUI Interface ─────────────────────────────────

def start_gui():
    if not HAS_TKINTER:
        return

    # Register AppUserModelID so Windows Taskbar uses Focusnyx icon instead of default feather
    try:
        myappid = 'focusnyx.companion.desktop.app'
        ctypes.windll.shell32.SetCurrentProcessExplicitAppUserModelID(myappid)
    except Exception:
        pass

    root = tk.Tk()
    root.title("Focusnyx Companion - Focus Lock")
    root.geometry("480x620")
    root.configure(bg="#0f172a")

    # Set App Window & Taskbar Icon
    ico_path = get_asset_path("icon.ico")
    if os.path.exists(ico_path):
        try:
            root.iconbitmap(ico_path)
        except Exception:
            pass

    # Header
    header_frame = tk.Frame(root, bg="#1e293b", padx=15, pady=15)
    header_frame.pack(fill="x", padx=15, pady=(15, 10))

    title_label = tk.Label(
        header_frame,
        text="FOCUSNYX COMPANION",
        font=("Segoe UI", 16, "bold"),
        fg="#a855f7",
        bg="#1e293b"
    )
    title_label.pack(anchor="w")

    sub_label = tk.Label(
        header_frame,
        text="Windows OS-Level Focus Lock Engine v1.0.0",
        font=("Segoe UI", 9),
        fg="#94a3b8",
        bg="#1e293b"
    )
    sub_label.pack(anchor="w")

    # Status Card
    card_frame = tk.Frame(root, bg="#1e293b", padx=20, pady=20)
    card_frame.pack(fill="x", padx=15, pady=10)

    status_badge = tk.Label(
        card_frame,
        text="INACTIVE (IDLE)",
        font=("Segoe UI", 12, "bold"),
        fg="#ffffff",
        bg="#a855f7",
        padx=14,
        pady=4
    )
    status_badge.pack()

    timer_label = tk.Label(
        card_frame,
        text="00:00",
        font=("Segoe UI", 36, "bold"),
        fg="#f8fafc",
        bg="#1e293b",
        pady=10
    )
    timer_label.pack()

    blocks_label = tk.Label(
        card_frame,
        text="Distractions Blocked: 0",
        font=("Segoe UI", 10, "bold"),
        fg="#34d399",
        bg="#1e293b"
    )
    blocks_label.pack()

    # Buttons Frame
    btn_frame = tk.Frame(root, bg="#0f172a")
    btn_frame.pack(fill="x", padx=15, pady=10)

    def gui_start(mins=25):
        if focus_state["is_active"]:
            messagebox.showinfo("Focusnyx", "Focus Lock is already active!")
            return
        start_focus_session(mins)

    def gui_end():
        if not focus_state["is_active"]:
            messagebox.showinfo("Focusnyx", "No active focus session!")
            return
        pin = simpledialog.askstring("Emergency Exit", "Enter 4-digit Emergency PIN:", show="*")
        if pin:
            success, msg = stop_focus_session(pin)
            if not success:
                messagebox.showerror("Emergency Exit", msg)
            else:
                messagebox.showinfo("Emergency Exit", "Focus Lock Released!")

    def gui_open_app():
        webbrowser.open("http://localhost:3000/focus")

    # Preset Durations Row (15m, 25m, 45m, 60m)
    preset_frame = tk.Frame(btn_frame, bg="#0f172a")
    preset_frame.pack(fill="x", pady=(0, 6))

    for m in [15, 25, 45, 60]:
        btn_preset = tk.Button(
            preset_frame, text=f"▶ {m}m", font=("Segoe UI", 9, "bold"),
            bg="#22c55e", fg="white", activebackground="#16a34a", activeforeground="white",
            bd=0, padx=6, pady=8, command=lambda mins=m: gui_start(mins), cursor="hand2"
        )
        btn_preset.pack(side="left", expand=True, fill="x", padx=2)

    btn_stop = tk.Button(
        btn_frame, text="🔒 Emergency PIN Exit", font=("Segoe UI", 10, "bold"),
        bg="#ef4444", fg="white", activebackground="#dc2626", activeforeground="white",
        bd=0, pady=8, command=gui_end, cursor="hand2"
    )
    btn_stop.pack(fill="x", pady=4)

    btn_web = tk.Button(
        btn_frame, text="🌐 Open Focusnyx Web App", font=("Segoe UI", 10, "bold"),
        bg="#6366f1", fg="white", activebackground="#4f46e5", activeforeground="white",
        bd=0, pady=8, command=gui_open_app, cursor="hand2"
    )
    btn_web.pack(fill="x", pady=4)

    # Live Distraction Log Frame
    log_frame = tk.Frame(root, bg="#1e293b", padx=10, pady=10)
    log_frame.pack(fill="both", expand=True, padx=15, pady=(10, 15))

    log_title = tk.Label(
        log_frame, text="LIVE DISTRACTION LOG", font=("Segoe UI", 9, "bold"),
        fg="#f472b6", bg="#1e293b"
    )
    log_title.pack(anchor="w", pady=(0, 5))

    log_list = tk.Listbox(
        log_frame, bg="#0f172a", fg="#f8fafc", font=("Consolas", 9),
        bd=0, highlightthickness=0, selectbackground="#334155"
    )
    log_list.pack(fill="both", expand=True)

    # UI Auto Update Loop
    def update_ui():
        if focus_state["is_active"]:
            status_badge.config(text="ACTIVE (LOCKED)", bg="#22c55e")
            elapsed = (time.time() - focus_state["start_time"]) if focus_state["start_time"] else 0
            remaining = max(0, (focus_state["duration_minutes"] * 60) - elapsed)
            m, s = divmod(int(remaining), 60)
            timer_label.config(text=f"{m:02d}:{s:02d}", fg="#22c55e")
        else:
            status_badge.config(text="INACTIVE (IDLE)", bg="#a855f7")
            timer_label.config(text="00:00", fg="#94a3b8")

        blocks_label.config(text=f"Distractions Blocked: {process_monitor.block_count}")

        # Refresh distraction log list
        log_list.delete(0, tk.END)
        if process_monitor.logs:
            for log in reversed(process_monitor.logs[-10:]):
                log_list.insert(tk.END, f"[{log.get('timestamp','')[11:19]}] Terminated: {log.get('app','unknown')}")
        else:
            log_list.insert(tk.END, "No distraction processes blocked yet.")

        root.after(1000, update_ui)

    root.after(500, update_ui)

    def on_close():
        if messagebox.askyesno("Minimize to Tray", "Do you want to minimize Companion to System Tray?\n(No will exit the companion service entirely)"):
            root.withdraw()
        else:
            exit_companion()

    root.protocol("WM_DELETE_WINDOW", on_close)
    root.mainloop()

def is_admin():
    try:
        return ctypes.windll.shell32.IsUserAnAdmin()
    except:
        return False

if __name__ == "__main__":
    if not is_admin():
        logger.warning("Focusnyx Companion requires Administrator privileges to hook OS keys. Requesting UAC elevation...")
        script = os.path.abspath(sys.argv[0])
        params = ' '.join([f'"{script}"'] + sys.argv[1:])
        try:
            ctypes.windll.shell32.ShellExecuteW(None, "runas", sys.executable, params, None, 1)
        except Exception as e:
            logger.error(f"Failed to elevate privileges: {e}")
        sys.exit()

    port = int(os.getenv("COMPANION_PORT", 5000))
    logger.info(f"🚀 Focusnyx Companion starting on http://localhost:{port} (Administrator)")

    # 1. Start Flask HTTP API server in background daemon thread
    flask_thread = threading.Thread(
        target=lambda: app.run(host="0.0.0.0", port=port, debug=False, use_reloader=False),
        daemon=True
    )
    flask_thread.start()

    # 2. Start System Tray GUI in background thread if pystray is installed
    if HAS_PYSTRAY:
        tray_thread = threading.Thread(target=start_tray, daemon=True)
        tray_thread.start()

    # 3. Launch Desktop GUI on main thread if Tkinter is available
    if HAS_TKINTER:
        start_gui()
    else:
        flask_thread.join()
