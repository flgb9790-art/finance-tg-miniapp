import fs from "node:fs";
import path from "node:path";

const root = path.join(path.resolve(import.meta.dirname, ".."), "public", "mini-app");
const cssPath = path.join(root, "styles.css");
const htmlPath = path.join(root, "index.html");

let css = fs.readFileSync(cssPath, "utf8");

const replacements = [
  ["body.web-mode .web-accounts-title{font-size:20px;font-weight:750}", "body.web-mode .web-accounts-title{font-size:15px;font-weight:700}"],
  [".web-accounts-title{margin:0;font-size:17px;font-weight:700", ".web-accounts-title{margin:0;font-size:15px;font-weight:700"],
  ["body.web-mode .web-activity-recent-title{margin:0;font-size:17px;font-weight:750", "body.web-mode .web-activity-recent-title{margin:0;font-size:15px;font-weight:700"],
  [".report-screen-title{margin:0;font-size:20px;font-weight:700", ".report-screen-title{margin:0;font-size:15px;font-weight:700"],
  ["body:not(.web-mode) .report-screen-title{order:1;margin:0;font-size:22px", "body:not(.web-mode) .report-screen-title{order:1;margin:0;font-size:15px"],
  [
    "body.web-mode .web-op-kind-card{display:flex;flex-direction:row;align-items:center;justify-content:space-between;gap:12px;padding:16px 18px;border-radius:16px;border:2px solid rgb(226 232 240)",
    "body.web-mode .web-op-kind-card{display:flex;flex-direction:row;align-items:center;justify-content:space-between;gap:12px;padding:16px 18px;border-radius:10px;border:1px solid rgb(226 232 240)",
  ],
  [
    "body:not(.web-mode) #screen-activity .web-op-kind-card{display:flex;flex-direction:row;align-items:center;justify-content:space-between;gap:10px;padding:14px 16px;border-radius:10px;border:2px solid rgb(226 232 240)",
    "body:not(.web-mode) #screen-activity .web-op-kind-card{display:flex;flex-direction:row;align-items:center;justify-content:space-between;gap:10px;padding:14px 16px;border-radius:10px;border:1px solid rgb(226 232 240)",
  ],
  [
    "body.web-mode #screen-activity>.balancy-hint-card,body.web-mode #screen-home>.balancy-hint-card{width:100%!important;max-width:100%!important;box-sizing:border-box!important;margin:0!important}",
    "body.web-mode #screen-home>.balancy-hint-card{width:100%!important;max-width:100%!important;box-sizing:border-box!important;margin:0!important}",
  ],
];

for (const [from, to] of replacements) {
  if (css.includes(from)) css = css.replace(from, to);
  else console.warn("skip:", from.slice(0, 60));
}

const v11Marker = ":root{--balancy-block-title-size:15px";
if (css.includes(v11Marker)) {
  const i = css.indexOf(v11Marker);
  css = css.slice(0, i);
} else {
  const anchor = "body:not(.web-mode) #screen-accounts .web-accounts-list-body{border-radius:0 0 10px 10px!important}";
  const i = css.lastIndexOf(anchor);
  if (i >= 0) css = css.slice(0, i + anchor.length);
}

const v11 = `
:root{--balancy-block-title-size:15px;--balancy-block-title-weight:700}
body.web-mode .web-accounts-title,
body.web-mode .web-categories-section-title,
body.web-mode .web-activity-recent-title,
body.web-mode .report-screen-title,
body.web-mode #reportTitle.report-screen-title{margin:0!important;font-size:var(--balancy-block-title-size)!important;font-weight:var(--balancy-block-title-weight)!important;letter-spacing:-.02em!important;line-height:1.25!important;color:#0f172a!important}
body.web-mode #screen-activity.screen-active{display:flex!important;flex-direction:column!important;gap:var(--balancy-hint-gap-after)!important;align-content:start!important}
body.web-mode #screen-activity>.balancy-hint-card,
body.web-mode #screen-transfer>.balancy-hint-card{width:100%!important;max-width:100%!important;box-sizing:border-box!important;margin:0!important;flex:0 0 auto}
body.web-mode #screen-activity>.web-activity-layout,
body.web-mode #screen-transfer>.web-transfer-layout{width:100%!important;min-width:0}
body.web-mode .web-op-kind-card{border-width:1px!important;border-radius:10px!important}
body.web-mode .web-op-kind-card--income.is-selected,
body.web-mode .web-op-kind-card--expense.is-selected{box-shadow:none!important}
body:not(.web-mode) #screen-activity .web-op-kind-card{border-width:1px!important}
body:not(.web-mode) #screen-activity .web-op-kind-card.is-selected,
body:not(.web-mode) #screen-activity .web-op-kind-card--expense.is-selected{box-shadow:none!important}
`;

css += v11;
fs.writeFileSync(cssPath, css);

let html = fs.readFileSync(htmlPath, "utf8");
html = html.replace(/BALANCY_CLIENT_ASSET_REV = "20260517ui-v\d+"/, 'BALANCY_CLIENT_ASSET_REV = "20260517ui-v11"');
fs.writeFileSync(htmlPath, html);

console.log("Patched ui-v11");
