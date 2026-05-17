import fs from "node:fs";

const html = fs.readFileSync("public/mini-app/index.html", "utf8");
const app = fs.readFileSync("public/mini-app/app.js", "utf8");
const css = fs.readFileSync("public/mini-app/styles.css", "utf8");

const checks = [
  ["no legacy photo", !html.includes("entryPhotoInput-legacy")],
  ["amounts grid", html.includes("web-transfer-amounts-grid")],
  ["attach btn", html.includes("balancy-attach-btn")],
  ["rev ui-v2", html.includes("20260517ui-v2")],
  ["categories legacy visible tg", css.includes("body:not(.web-mode) .web-categories-legacy-wrap")],
  ["openScreen categories", app.includes('n==="categories"') && app.includes("renderCategories")],
  ["team prepend", app.includes("r.prepend(s)")],
  ["attach icon", app.includes("BALANCY_ATTACH_ICON_SVG")],
];

for (const [name, ok] of checks) {
  console.log(ok ? "OK" : "FAIL", name);
}
