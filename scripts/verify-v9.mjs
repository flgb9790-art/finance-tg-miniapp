import fs from "node:fs";
const css = fs.readFileSync("public/mini-app/styles.css", "utf8");
const js = fs.readFileSync("public/mini-app/app.js", "utf8");

const checks = [
  ["hero 24 web", !css.includes("web-dash-hero{border:none!important;border-radius:24px")],
  ["hero 10 web", css.includes("web-dash-hero{border:none!important;border-radius:10px")],
  ["recent display flex", css.includes("web-activity-recent-card.card{display:flex!important")],
  ["accounts head 10", css.includes("web-accounts-list-head{border-radius:10px 10px 0 0")],
  ["categories shell 10", css.includes("web-categories-table-shell{border-radius:0 0 10px 10px")],
  ["report stat 14", !css.includes("report-stat-card{border-radius:14px")],
  ["control radius", css.includes("--balancy-control-radius:10px")],
  ["js render &&", js.includes("useWebLoginFlow()&&webActivityRecentListElement")],
  ["js openScreen render", js.includes('safeRenderStep("webActivityRecent",()=>renderWebActivityRecentList')],
];

for (const [name, ok] of checks) console.log(ok ? "OK" : "FAIL", name);
