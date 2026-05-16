import * as esbuild from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const miniAppDir = path.join(root, "public", "mini-app");

const targets = [
  path.join(miniAppDir, "app.js"),
  path.join(miniAppDir, "styles.css")
];

for (const target of targets) {
  await esbuild.build({
    entryPoints: [target],
    outfile: target,
    minify: true,
    allowOverwrite: true,
    legalComments: "none"
  });
}

console.log("Minified mini-app assets:", targets.map((p) => path.relative(root, p)).join(", "));
