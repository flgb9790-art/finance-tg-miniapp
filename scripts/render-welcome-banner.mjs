import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const svgPath = path.join(
  root,
  "public",
  "mini-app",
  "assets",
  "balancy-welcome-16x9.svg"
);
const outPath = path.join(
  root,
  "public",
  "mini-app",
  "assets",
  "balancy-welcome-16x9.png"
);

const svg = await fs.readFile(svgPath, "utf8");
await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(outPath);
console.log("Wrote", outPath);
