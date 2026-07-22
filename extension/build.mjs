import * as esbuild from "esbuild";

const watch = process.argv.includes("--watch");
const ctx = await esbuild.context({
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
});

if (watch) {
  await ctx.watch();
  console.log("Watching for changes...");
} else {
  await ctx.rebuild();
  await ctx.dispose();
}
