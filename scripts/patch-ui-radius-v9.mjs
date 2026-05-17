import fs from "node:fs";
import path from "node:path";

const root = path.join(path.resolve(import.meta.dirname, ".."), "public", "mini-app");

function patchCss() {
  let css = fs.readFileSync(path.join(root, "styles.css"), "utf8");

  const replacements = [
    ["body.web-mode .web-dash-hero{border:none!important;border-radius:24px!important", "body.web-mode .web-dash-hero{border:none!important;border-radius:10px!important"],
    ["border-radius:16px 16px 0 0;background:#fff}body.web-mode .web-accounts-head-badge", "border-radius:10px 10px 0 0;background:#fff}body.web-mode .web-accounts-head-badge"],
    ["border-radius:0 0 16px 16px;background:#fff;box-shadow:0 4px 22px #0f172a0f}body.web-mode .tg-accou", "border-radius:0 0 10px 10px;background:#fff;box-shadow:0 4px 22px #0f172a0f}body.web-mode .tg-accou"],
    [".web-categories-table-shell{border-radius:0 0 16px 16px;border-top", ".web-categories-table-shell{border-radius:0 0 10px 10px;border-top"],
    [".report-stat-card{border-radius:14px;border:1px solid", ".report-stat-card{border-radius:10px;border:1px solid"],
    [".report-summary-aside{padding:16px 18px!important;border-radius:14px!important", ".report-summary-aside{padding:16px 18px!important;border-radius:10px!important"],
    [".web-settings-tile{display:flex;align-items:center;gap:14px;min-width:0;padding:18px 20px;border-radius:16px;border", ".web-settings-tile{display:flex;align-items:center;gap:14px;min-width:0;padding:18px 20px;border-radius:10px;border"],
    [".primary-button{min-height:46px;border:none;border-radius:16px;background", ".primary-button{min-height:46px;border:none;border-radius:10px;background"],
    [".ghost-button{min-height:42px;border-radius:13px;font-size:13px", ".ghost-button{min-height:42px;border-radius:10px;font-size:13px"],
    [".report-segment{min-width:0;width:auto;display:flex;align-items:center;justify-content:center;text-align:center;font-size:9px;font-weight:600;line-height:1.15;letter-spacing:-.02em;padding:7px 2px;border-radius:8px", ".report-segment{min-width:0;width:auto;display:flex;align-items:center;justify-content:center;text-align:center;font-size:9px;font-weight:600;line-height:1.15;letter-spacing:-.02em;padding:7px 2px;border-radius:10px"],
  ];

  for (const [from, to] of replacements) {
    if (css.includes(from)) css = css.replace(from, to);
    else console.warn("CSS skip (not found):", from.slice(0, 70));
  }

  const tailAnchor = "body:not(.web-mode) #screen-home .card.hero-balance-card{border-radius:10px!important}";
  if (css.includes(tailAnchor)) css = css.slice(0, css.indexOf(tailAnchor));

  const block = `
:root{--balancy-control-radius:10px}
body:not(.web-mode) #screen-home .web-dash-hero.hero-card,
body:not(.web-mode) #screen-home .hero-balance-card.web-dash-hero,
body.web-mode #screen-home .web-dash-hero.hero-card,
body.web-mode #screen-home .hero-balance-card{border-radius:10px!important;overflow:hidden}
body.web-mode .web-categories-section-head{border-radius:10px 10px 0 0!important}
body.web-mode .web-categories-table-shell{border-radius:0 0 10px 10px!important}
body.web-mode .web-accounts-list-head{border-radius:10px 10px 0 0!important}
body.web-mode .web-accounts-list-body{border-radius:0 0 10px 10px!important}
body.web-mode #screen-reports .report-stat-card,
body.web-mode #screen-reports .report-chart-panel.card,
body.web-mode #screen-reports .report-matrix-card.card,
body.web-mode #screen-reports .report-summary-aside.card,
body.web-mode #screen-reports .report-web-toolbar,
body.web-mode #screen-reports .report-layout-card>.report-web-toolbar,
body.web-mode #screen-reports .report-transfers-fallback,
body.web-mode #screen-reports .report-balance-box{border-radius:10px!important}
body.web-mode #screen-reports .card.report-chart-panel,
body.web-mode #screen-reports .card.report-matrix-card,
body.web-mode #screen-reports .card.report-summary-aside{background:#fff!important;border:1px solid rgb(15 23 42 / .08)!important;box-shadow:0 4px 22px #0f172a0f!important}
body.web-mode #screen-activity .web-activity-recent-card.card,
body.web-mode #screen-transfer .web-activity-recent-card.card{display:flex!important;visibility:visible!important;background:#fff!important;border:1px solid rgb(15 23 42 / .08)!important;border-radius:10px!important;box-shadow:0 4px 22px #0f172a0f!important;padding:16px!important;margin:0!important;min-width:0}
body.web-mode .web-activity-layout,
body.web-mode .web-transfer-layout{display:grid!important;gap:16px!important;width:100%}
@media(min-width:901px){body.web-mode .web-activity-layout,body.web-mode .web-transfer-layout{grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important}}
body.web-mode #screen-settings .web-settings-tile,
body.web-mode #screen-settings .web-settings-panel,
body.web-mode #screen-settings .balancy-hint-card{border-radius:10px!important}
.primary-button,.ghost-button,.toolbar-text-btn,.refresh-text-btn,.report-export-btn,.report-segment,.balancy-filter-pill,.balancy-hint-card,.web-new-entry-option,.web-top-nav-brand-btn,.web-op-kind-card,.text-link-button,input:not([type=checkbox]):not([type=radio]),select,textarea,.native-datetime-shell,.web-transfer-select-shell,.web-transfer-amount-input,.web-transfer-swap-btn,.balancy-attach-btn,.entry-type-modal .primary-button,.entry-type-modal .ghost-button,.web-settings-tile,.web-cat-kind-pick,.web-home-foot-cta,.tg-home-quick-action,.account-item,.category-item,.entry-item,.stat-box,.empty-state,.swipe-row-sheet{border-radius:var(--balancy-control-radius)!important}
.currency-mini-pill,.web-categories-badge,.web-accounts-head-badge,.tg-home-quick-action-icon,.web-cat-kind-pick-icon-ring,.global-busy-spinner,.app-splash-line,[class*="icon-btn"],.web-team-icon-btn{border-radius:999px!important}
`;

  css += block;
  fs.writeFileSync(path.join(root, "styles.css"), css);
  console.log("Patched styles.css ui-v9");
}

function patchAppJs() {
  let js = fs.readFileSync(path.join(root, "app.js"), "utf8");

  js = js.replace(
    "function renderWebTransferRecentList(u){!useWebLoginFlow()||!webTransferRecentListElement||(webTransferRecentListElement.innerHTML=buildWebRecentTransfersHtml(u,WEB_RECENT_SIDEBAR_LIMIT))}",
    "function renderWebTransferRecentList(u){useWebLoginFlow()&&webTransferRecentListElement&&(webTransferRecentListElement.innerHTML=buildWebRecentTransfersHtml(u,WEB_RECENT_SIDEBAR_LIMIT))}"
  );

  js = js.replace(
    "function renderWebActivityRecentList(u,e){!useWebLoginFlow()||!webActivityRecentListElement||(webActivityRecentListElement.innerHTML=buildRecentActivityCombinedHtml(u,e,WEB_RECENT_SIDEBAR_LIMIT))}",
    "function renderWebActivityRecentList(u,e){useWebLoginFlow()&&webActivityRecentListElement&&(webActivityRecentListElement.innerHTML=buildRecentActivityCombinedHtml(u,e,WEB_RECENT_SIDEBAR_LIMIT))}"
  );

  const openNeedle =
    't==="audit-log"&&loadWebAuditLogPage(),applyBalancyHintsFromState()}';
  const openReplace =
    't==="audit-log"&&loadWebAuditLogPage(),useWebLoginFlow()&&(t==="activity"||t==="transfer")&&(safeRenderStep("webActivityRecent",()=>renderWebActivityRecentList(state.recentEntries,state.recentTransfers)),safeRenderStep("webTransferRecent",()=>renderWebTransferRecentList(state.recentTransfers))),applyBalancyHintsFromState()}';

  if (js.includes(openNeedle)) js = js.replace(openNeedle, openReplace);
  else console.warn("app.js openScreen patch skip");

  fs.writeFileSync(path.join(root, "app.js"), js);
  console.log("Patched app.js recent sidebar");
}

patchCss();
patchAppJs();
