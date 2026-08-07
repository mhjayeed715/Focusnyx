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
  execSync(`powershell -Command "Compress-Archive -Path dist,icons,blocked.html,blocked.js,manifest.json -DestinationPath '${zipTarget}' -Force"`);
  try { fs.copyFileSync(zipTarget, rootTarget); } catch {}
  try { fs.copyFileSync(zipTarget, altTarget); } catch {}
  console.log("Build complete. ZIP updated: Focusnyx-Chrome-Extension.zip & extension.zip");
}
