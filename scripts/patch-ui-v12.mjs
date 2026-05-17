import fs from "node:fs";
import path from "node:path";

const root = path.join(path.resolve(import.meta.dirname, ".."), "public", "mini-app");
const cssPath = path.join(root, "styles.css");
const htmlPath = path.join(root, "index.html");

let css = fs.readFileSync(cssPath, "utf8");

const replacements = [
  [
    "body.web-mode .report-web-toolbar{background:#fff;border:1px solid rgb(15 23 42 / .08);border-radius:14px",
    "body.web-mode .report-web-toolbar{background:#fff;border:1px solid rgb(15 23 42 / .08);border-radius:10px",
  ],
  [
    ".ghost-button{min-height:46px;border-radius:16px;border:1px solid var(--line)",
    ".ghost-button{min-height:46px;border-radius:10px;border:1px solid var(--line)",
  ],
  [
    "web-transfer-submit.primary-button{width:100%;justify-content:center;min-height:50px;border-radius:16px",
    "web-transfer-submit.primary-button{width:100%;justify-content:center;min-height:50px;border-radius:10px",
  ],
  [
    "web-transfer-cancel-btn.ghost-button{width:100%;justify-content:center;min-height:48px;border-radius:16px",
    "web-transfer-cancel-btn.ghost-button{width:100%;justify-content:center;min-height:48px;border-radius:10px",
  ],
  [
    "web-categories-save-btn.primary-button{width:100%;min-height:50px;border-radius:14px",
    "web-categories-save-btn.primary-button{width:100%;min-height:50px;border-radius:10px",
  ],
  [
    "web-categories-cancel-btn.ghost-button{width:100%;min-height:48px;border-radius:14px",
    "web-categories-cancel-btn.ghost-button{width:100%;min-height:48px;border-radius:10px",
  ],
  [
    "web-accounts-submit.primary-button{width:100%;min-height:48px;border-radius:12px",
    "web-accounts-submit.primary-button{width:100%;min-height:48px;border-radius:10px",
  ],
];

for (const [from, to] of replacements) {
  if (css.includes(from)) css = css.replace(from, to);
  else console.warn("skip:", from.slice(0, 70));
}

const v12Marker = "/* ui-v12:";
if (css.includes(v12Marker)) css = css.slice(0, css.indexOf(v12Marker));
else {
  const anchor = "body.web-mode .tg-accounts-add-btn.web-categories-add-outline{border-radius:10px!important}";
  const i = css.lastIndexOf(anchor);
  if (i >= 0) css = css.slice(0, i + anchor.length);
  else {
    const j = css.lastIndexOf("--balancy-block-title-size:15px");
    if (j >= 0) {
      const k = css.indexOf("body:not(.web-mode) #screen-activity .web-op-kind-card.is-selected", j);
      if (k > j) css = css.slice(0, k);
    }
  }
}

const v12 = `
/* ui-v12 */
body.web-mode #screen-transfer.screen-active{display:flex!important;flex-direction:column!important;gap:var(--balancy-hint-gap-after)!important;align-content:start!important}
body.web-mode #screen-transfer>.balancy-hint-card{width:100%!important;max-width:100%!important;box-sizing:border-box!important;margin:0!important;flex:0 0 auto}
body.web-mode #screen-transfer>.web-transfer-layout{width:100%!important;min-width:0}
body:not(.web-mode) #screen-transfer>.balancy-hint-card{width:100%;max-width:100%;box-sizing:border-box;margin:0 0 var(--balancy-hint-gap-after)}
body.web-mode .report-layout-card>.report-web-toolbar{border-radius:10px!important}
body.web-mode .web-op-form-actions .primary-button,
body.web-mode .web-op-form-actions .ghost-button,
body.web-mode .web-op-cancel-btn,
body.web-mode .web-transfer-submit.primary-button,
body.web-mode .web-transfer-cancel-btn.ghost-button,
body.web-mode .web-categories-save-btn.primary-button,
body.web-mode .web-categories-cancel-btn.ghost-button,
body.web-mode .web-accounts-submit.primary-button,
body.web-mode .web-accounts-cancel.ghost-button,
body.web-mode .tg-accounts-add-btn.web-categories-add-outline{border-radius:10px!important}
`;

css += v12;
fs.writeFileSync(cssPath, css);

let html = fs.readFileSync(htmlPath, "utf8");
html = html.replace(/BALANCY_CLIENT_ASSET_REV = "20260517ui-v\d+"/, 'BALANCY_CLIENT_ASSET_REV = "20260517ui-v12"');
fs.writeFileSync(htmlPath, html);
console.log("Patched ui-v12");
