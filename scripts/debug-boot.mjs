import fs from "node:fs";

const app = fs.readFileSync("public/mini-app/app.js", "utf8");
const css = fs.readFileSync("public/mini-app/styles.css", "utf8");

console.log("dismissAppSplash", app.includes("dismissAppSplash"));
console.log("balancy-boot-pending", app.includes("balancy-boot-pending"));
console.log("balancy-app-ready", app.includes("balancy-app-ready"));

const badCss = css.includes("body.web-mode .body.web-mode");
console.log("corrupt css duplicate selector", badCss);
if (badCss) {
  const i = css.indexOf("body.web-mode .body.web-mode");
  console.log(css.slice(i - 80, i + 200));
}

// Brace balance in css (rough)
let depth = 0;
let minDepth = 0;
for (const ch of css) {
  if (ch === "{") depth++;
  if (ch === "}") depth--;
  if (depth < minDepth) minDepth = depth;
}
console.log("css brace depth end", depth, "min", minDepth);
