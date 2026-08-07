import * as esbuild from "esbuild";
import * as fs from "fs";
import * as path from "path";

const watch = process.argv.includes("--watch");

const config = {
  entryPoints: {
    "background/service-worker": "src/background/service-worker.ts",
    "content/overlay": "src/content/overlay.ts",
    "popup/popup": "src/popup/popup.ts",
  },
  bundle: true,
  outdir: "dist",
  format: "esm",
  target: "chrome120",
  sourcemap: watch ? "inline" : false,
  logLevel: "info",
};

if (watch) {
  const ctx = await esbuild.context(config);
  await ctx.watch();
  console.log("Watching for changes...");
} else {
  await esbuild.build(config);
  // Copy popup.html and popup.css into dist/popup/
  fs.mkdirSync(path.join("dist", "popup"), { recursive: true });
  // Fix script src path: source uses ../../dist/popup/popup.js (relative to src/popup/),
  // but the dist copy needs ./popup.js (relative to dist/popup/)
  let popupHtml = fs.readFileSync(path.join("src", "popup", "popup.html"), "utf-8");
  popupHtml = popupHtml.replace('src="../../dist/popup/popup.js"', 'src="./popup.js"');
  fs.writeFileSync(path.join("dist", "popup", "popup.html"), popupHtml);
  fs.copyFileSync(path.join("src", "popup", "popup.css"), path.join("dist", "popup", "popup.css"));
  // Auto-package to the correct ZIP filename used by the landing page
  const { execSync } = await import("child_process");
  const zipTarget = path.join("..", "frontend", "public", "downloads", "Focusnyx-Chrome-Extension.zip");
  const rootTarget = path.join("..", "extension.zip");
  const altTarget = path.join("..", "frontend", "public", "downloads", "FocusnyxExtension.zip");
  try { if (fs.existsSync(zipTarget)) fs.unlinkSync(zipTarget); } catch {}

  const itemsToZip = ["dist", "icons", "blocked.html", "blocked.js", "manifest.json"];

  let zipped = false;
  // Try python/python3 (available in all OS & GitHub Actions runners)
  for (const pyCmd of ["python3", "python"]) {
    try {
      const pyScript = `import zipfile, os; z = zipfile.ZipFile('${zipTarget.replace(/\\/g, "/")}', 'w', zipfile.ZIP_DEFLATED); items = ['dist', 'icons', 'blocked.html', 'blocked.js', 'manifest.json']; [z.write(item, item) if os.path.isfile(item) else [z.write(os.path.join(r, f), os.path.relpath(os.path.join(r, f), '.')) for r, _, files in os.walk(item) for f in files] for item in items]; z.close()`;
      execSync(`${pyCmd} -c "${pyScript}"`, { stdio: "ignore" });
      zipped = true;
      break;
    } catch {}
  }

  // Fallback if python is unavailable
  if (!zipped) {
    if (process.platform === "win32") {
      try {
        execSync(`powershell -Command "Compress-Archive -Path ${itemsToZip.join(",")} -DestinationPath '${zipTarget}' -Force"`);
        zipped = true;
      } catch {}
    } else {
      try {
        execSync(`zip -r "${zipTarget}" ${itemsToZip.join(" ")}`);
        zipped = true;
      } catch {}
    }
  }

  if (zipped) {
    try { fs.copyFileSync(zipTarget, rootTarget); } catch {}
    try { fs.copyFileSync(zipTarget, altTarget); } catch {}
    console.log("Build complete. ZIP updated: Focusnyx-Chrome-Extension.zip & extension.zip");
  } else {
    console.warn("Build complete. (ZIP creation skipped: no zip utility available in current environment)");
  }
}
