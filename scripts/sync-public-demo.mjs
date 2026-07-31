import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = (path) => readFileSync(resolve(root, path), "utf8");
const target = (path) => resolve(root, path);
const publicIndex = read("app/index.html").replace(
  '<script src="config.js"></script>',
  '<script>window.ASSET_PASSPORT_DATA_URL = "demo-assets.json"; window.ASSET_PASSPORT_SAMPLE_BASE = "./";</script><script src="config.js"></script>',
);
const publicAssets = JSON.parse(read("data/demo-assets.json")).map((asset) => ({
  ...asset,
  ...(asset.sampleFile ? { sampleFile: asset.sampleFile.replace("../data/", "") } : {}),
}));
const expected = {
  "docs/mvp/index.html": publicIndex,
  "docs/mvp/styles.css": read("app/styles.css"),
  "docs/mvp/app.js": read("app/app.js"),
  "docs/mvp/config.js": read("app/config.js"),
  "docs/mvp/demo-assets.json": `${JSON.stringify(publicAssets, null, 2)}\n`,
  "docs/mvp/demo-solar-valuation-v3.txt": read("data/demo-solar-valuation-v3.txt"),
};
const check = process.argv.includes("--check");
const stale = Object.entries(expected).filter(([path, contents]) => {
  try { return read(path) !== contents; } catch { return true; }
});

if (check) {
  if (stale.length) throw new Error(`Public demo is out of sync: ${stale.map(([path]) => path).join(", ")}`);
  console.log("Public GitHub Pages demo is in sync with app source.");
  process.exit(0);
}

for (const [path, contents] of Object.entries(expected)) writeFileSync(target(path), contents);
console.log(`Synced ${Object.keys(expected).length} public demo files.`);
