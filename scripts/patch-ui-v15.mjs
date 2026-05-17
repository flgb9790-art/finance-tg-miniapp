import fs from "node:fs";
import path from "node:path";

const root = path.join(path.resolve(import.meta.dirname, ".."), "public", "mini-app");
const cssPath = path.join(root, "styles.css");
const htmlPath = path.join(root, "index.html");

let css = fs.readFileSync(cssPath, "utf8");

css = css.replace(
  /body:not\(\.web-mode\) \.web-cat-kind-pick\{align-items:center;text-align:center;padding:14px 10px 16px;border-radius:14px\}/,
  "body:not(.web-mode) .web-cat-kind-pick--legacy-center{display:none}"
);

const v15Marker = "/* ui-v15:";
if (css.includes(v15Marker)) {
  css = css.slice(0, css.indexOf(v15Marker));
} else {
  const v14Marker = "/* ui-v14:";
  if (css.includes(v14Marker)) {
    css = css.slice(0, css.indexOf(v14Marker));
  }
}

const v15Css = `
/* ui-v15 */
body:not(.web-mode) .web-cat-kind-picks{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:10px!important}
body:not(.web-mode) .web-cat-kind-pick{display:flex!important;flex-direction:row!important;align-items:center!important;justify-content:space-between!important;gap:10px!important;padding:14px 16px!important;border-radius:10px!important;border:1px solid var(--line)!important;background:#fff!important;text-align:left!important}
body:not(.web-mode) .web-cat-kind-pick-icon-ring{display:none!important}
body:not(.web-mode) .web-cat-kind-pick-copy{display:flex!important;flex-direction:column!important;align-items:flex-start!important;justify-content:center!important;gap:2px!important;min-width:0!important;flex:1 1 auto!important;text-align:left!important}
body:not(.web-mode) .web-cat-kind-pick-title{display:block!important;width:100%!important;font-size:15px!important;font-weight:700!important;color:#0f172a!important;line-height:1.2!important}
body:not(.web-mode) .web-cat-kind-pick-desc{display:block!important;width:100%!important;font-size:12px!important;line-height:1.35!important;margin:0!important}
body:not(.web-mode) .web-cat-kind-pick-icon{flex:0 0 auto!important;font-size:22px!important;font-weight:700!important;line-height:1!important}
body:not(.web-mode) .web-cat-kind-pick[data-set-category-kind=income] .web-cat-kind-pick-icon{color:#4338ca!important}
body:not(.web-mode) .web-cat-kind-pick[data-set-category-kind=expense] .web-cat-kind-pick-icon{color:#ef4444!important}
body:not(.web-mode) .web-cat-kind-pick.is-selected[data-set-category-kind=income]{border-color:#4338ca!important;box-shadow:0 0 0 1px #4338ca38!important}
body:not(.web-mode) .web-cat-kind-pick.is-selected[data-set-category-kind=expense]{border-color:#ef4444!important;box-shadow:0 0 0 1px #ef444438!important}
.web-transfer-select-shell{padding:10px 12px!important;border-radius:10px!important}
.web-transfer-select-icon{width:32px!important;height:32px!important;border-radius:10px!important}
.web-transfer-select{flex:1!important;min-width:0!important;font-size:16px!important;font-weight:400!important;line-height:1.35!important;padding:0 28px 0 0!important;color:#0f172a!important}
.web-transfer-amount-row .web-transfer-amount-input{padding:12px 14px!important;font-size:16px!important;font-weight:400!important;line-height:1.35!important}
.web-transfer-amount-row .web-transfer-currency-badge{font-size:12px!important;font-weight:600!important;letter-spacing:.02em!important;padding:0 12px!important}
body:not(.web-mode) #screen-home.screen-active,
body:not(.web-mode)[data-app-active-screen=home] #screen-home.screen-active,
body:not(.web-mode) #screen-accounts.screen-active,
body:not(.web-mode) #screen-categories.screen-active,
body:not(.web-mode) #screen-activity.screen-active,
body:not(.web-mode) #screen-transfer.screen-active{display:flex!important;flex-direction:column!important;gap:var(--balancy-hint-gap-after,12px)!important}
body:not(.web-mode) .web-accounts-page>.balancy-hint-card,
body:not(.web-mode) .web-categories-page>.balancy-hint-card,
body:not(.web-mode) #screen-activity>.balancy-hint-card,
body:not(.web-mode) #screen-transfer>.balancy-hint-card,
body:not(.web-mode) #screen-home>.balancy-hint-card{margin:0!important}
body:not(.web-mode) #screen-activity .balancy-hint-card[data-balancy-hint=activityForm]{margin:0!important}
body:not(.web-mode)[data-app-active-screen=transfer] #screen-transfer.screen-active{padding-bottom:8px}
`;

css += v15Css;
fs.writeFileSync(cssPath, css);

let html = fs.readFileSync(htmlPath, "utf8");

html = html.replace(
  `                  <button
                    class="toolbar-text-btn"
                    data-refresh-action="true"
                    type="button"
                    title="Обновить данные приложения"
                  >
                    Обновить
                  </button>
`,
  ""
);

html = html.replace(
  /BALANCY_CLIENT_ASSET_REV = "20260517ui-v\d+"/,
  'BALANCY_CLIENT_ASSET_REV = "20260517ui-v15"'
);

fs.writeFileSync(htmlPath, html);
console.log("Patched ui-v15");
