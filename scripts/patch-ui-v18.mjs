import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const indexPath = path.join(root, "public/mini-app/index.html");
const stylesPath = path.join(root, "public/mini-app/styles.css");
const appPath = path.join(root, "public/mini-app/app.js");
const REV = "20260517ui-v18";

const V18_CSS = `/* ui-v18 */
body:not(.web-mode) .balancy-home-hints-grid{display:flex!important;flex-direction:column!important;gap:var(--balancy-hint-gap-after,12px)!important;width:100%;max-width:100%;box-sizing:border-box}
body.web-mode #screen-home>.balancy-home-hints-grid{width:100%!important;max-width:100%!important;box-sizing:border-box!important;margin:0!important;flex:0 0 auto}
body.web-mode .balancy-home-hints-grid{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr));gap:var(--balancy-hint-gap-after,12px);width:100%;max-width:100%;box-sizing:border-box}
body.web-mode .balancy-home-hints-grid>.balancy-hint-card{margin:0!important;width:100%!important;max-width:100%!important;box-sizing:border-box!important;height:100%;align-self:stretch}
@media (max-width:960px){body.web-mode .balancy-home-hints-grid{grid-template-columns:1fr!important}}
body.web-mode .web-dash-hero #statusText{display:none!important}
body.web-mode .web-dash-hero .balance-trend{display:flex!important;flex-direction:row!important;align-items:baseline!important;flex-wrap:wrap!important;gap:4px 10px!important}
body.web-mode .web-dash-hero .balance-trend .muted{white-space:nowrap}
body.web-mode .web-dash-spark::after{content:"";position:absolute;left:0;right:0;bottom:0;height:34px;background:linear-gradient(to top,#fff 0%,rgb(255 255 255 / 0) 100%);pointer-events:none}
body.web-mode .web-sidebar-brand:hover,body.web-mode .web-sidebar-brand:focus-visible{background:transparent!important}
body.web-mode .web-sidebar-top{overflow:visible;padding-top:4px}
body.web-mode .web-sidebar-brand{overflow:visible}
body.web-mode .web-sidebar-brand .brand-wordmark{display:inline-block;line-height:1.2!important;padding:2px 0}
@media (min-width:1279px){body.web-mode .web-sidebar-burger{display:none!important}body.web-mode .web-profile-menu--sidebar .web-profile-dropdown{position:absolute;left:0;right:0;top:calc(100% + 8px);width:auto;min-width:0;max-width:none}}
@media (max-width:1278px){body.web-mode{--web-sidebar-w:min(300px,88vw)!important}
body.web-mode .web-sidebar-burger{display:inline-flex!important}
body.web-mode .web-sidebar{position:fixed;left:0;top:0;bottom:0;z-index:450;width:var(--web-sidebar-w);flex:none!important;flex-direction:column!important;align-items:stretch!important;align-self:auto!important;height:100dvh;max-height:100dvh;padding:16px 14px 14px!important;border-right:1px solid var(--line);overflow:hidden;transform:translate(-108%);transition:transform .22s ease;box-shadow:none}
body.web-mode.web-nav-drawer-open .web-sidebar{transform:translate(0);box-shadow:12px 0 40px #0f172a2e}
body.web-mode .web-sidebar-brand{justify-content:flex-start!important;margin:-8px -10px!important;padding:8px 10px!important}
body.web-mode .web-sidebar-brand .brand-wordmark{font-size:inherit!important;line-height:1.2!important}
body.web-mode .web-sidebar-brand .brand-wordmark:before{content:none!important}
body.web-mode .web-sidebar-link{justify-content:flex-start!important;gap:12px!important;padding:10px 12px!important}
body.web-mode .web-sidebar-link>span:not(.web-sidebar-icon){display:inline!important}
body.web-mode .web-sidebar-user{justify-content:flex-start!important;gap:10px!important;padding:10px 12px!important}
body.web-mode .web-sidebar-user-meta,body.web-mode .web-sidebar-user-chevron{display:flex!important}
body.web-mode .web-sidebar-user-meta{flex-direction:column!important}
body.web-mode .web-sidebar-upsell{display:grid!important}
body.web-mode .web-main-column{flex:1 1 auto!important;min-width:0!important;min-height:0!important;width:auto!important}}
@media (max-width:1278px) and (min-width:901px){body.web-mode .web-profile-menu--sidebar .web-profile-dropdown{width:min(280px,calc(100vw - 24px));min-width:248px;max-width:calc(100vw - 24px);position:fixed}}
`;

function removeCollapsedSidebarRail(css) {
  const start = css.indexOf("@media(max-width:1279px)and (min-width:901px)");
  if (start < 0) return css;
  let depth = 0;
  for (let i = start; i < css.length; i += 1) {
    if (css[i] === "{") depth += 1;
    if (css[i] === "}") {
      depth -= 1;
      if (depth === 0) return css.slice(0, start) + css.slice(i + 1);
    }
  }
  return css;
}

const READY_STATUS =
  'hideWebLoginGate(),!document.body.classList.contains("workspace-mode-choice-open")&&!document.body.classList.contains("workspace-invite-gate-open")&&setStatus("\\u0412\\u0441\\u0435 \\u0433\\u043E\\u0442\\u043E\\u0432\\u043E. \\u0418\\u043D\\u0442\\u0435\\u0440\\u0444\\u0435\\u0439\\u0441 \\u0440\\u0430\\u0437\\u0431\\u0438\\u0442 \\u043F\\u043E \\u0432\\u043A\\u043B\\u0430\\u0434\\u043A\\u0430\\u043C \\u0438 \\u0441\\u0442\\u0430\\u043B \\u043F\\u0440\\u043E\\u0449\\u0435 \\u0434\\u043B\\u044F \\u0435\\u0436\\u0435\\u0434\\u043D\\u0435\\u0432\\u043D\\u043E\\u0433\\u043E \\u0438\\u0441\\u043F\\u043E\\u043B\\u044C\\u0437\\u043E\\u0432\\u0430\\u043D\\u0438\\u044F.","success")';

const READY_STATUS_WEB_SKIP =
  'hideWebLoginGate(),!document.body.classList.contains("workspace-mode-choice-open")&&!document.body.classList.contains("workspace-invite-gate-open")&&!useWebLoginFlow()&&setStatus("\\u0412\\u0441\\u0435 \\u0433\\u043E\\u0442\\u043E\\u0432\\u043E. \\u0418\\u043D\\u0442\\u0435\\u0440\\u0444\\u0435\\u0439\\u0441 \\u0440\\u0430\\u0437\\u0431\\u0438\\u0442 \\u043F\\u043E \\u0432\\u043A\\u043B\\u0430\\u0434\\u043A\\u0430\\u043C \\u0438 \\u0441\\u0442\\u0430\\u043B \\u043F\\u0440\\u043E\\u0449\\u0435 \\u0434\\u043B\\u044F \\u0435\\u0436\\u0435\\u0434\\u043D\\u0435\\u0432\\u043D\\u043E\\u0433\\u043E \\u0438\\u0441\\u043F\\u043E\\u043B\\u044C\\u0437\\u043E\\u0432\\u0430\\u043D\\u0438\\u044F.","success")';

let index = fs.readFileSync(indexPath, "utf8");
let styles = fs.readFileSync(stylesPath, "utf8");
let app = fs.readFileSync(appPath, "utf8");

index = index.replaceAll("20260517ui-v17", REV).replaceAll("20260517ui-v16", REV);

if (styles.includes("/* ui-v18 */")) {
  styles = styles.replace(/\/\* ui-v18 \*\/[\s\S]*$/, V18_CSS.trimEnd());
} else {
  // Drop v17 rules superseded by v18 hints fix
  styles = styles.replace(
    /body\.web-mode \.balancy-home-hints-grid:not\(:has\(>\.balancy-hint-card:not\(\[hidden\]\)\)\)\{display:none\}/,
    "",
  );
  styles += V18_CSS;
}

const beforeRail = styles.length;
styles = removeCollapsedSidebarRail(styles);
if (styles.length < beforeRail) {
  console.log("removed collapsed sidebar rail @ 901-1279px");
}

if (app.includes(READY_STATUS)) {
  app = app.replace(READY_STATUS, READY_STATUS_WEB_SKIP);
  console.log("app.js: skip ready status on web");
} else if (!app.includes(READY_STATUS_WEB_SKIP)) {
  console.warn("app.js ready status anchor not found");
}

fs.writeFileSync(indexPath, index);
fs.writeFileSync(stylesPath, styles);
fs.writeFileSync(appPath, app);
console.log("patch-ui-v18 applied, rev:", REV);
