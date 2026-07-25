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
  fs.copyFileSync(path.join("src", "popup", "popup.html"), path.join("dist", "popup", "popup.html"));
  fs.copyFileSync(path.join("src", "popup", "popup.css"), path.join("dist", "popup", "popup.css"));
  console.log("Build complete.");
}
