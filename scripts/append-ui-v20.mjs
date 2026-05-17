import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const stylesPath = path.join(root, "public/mini-app/styles.css");
const indexPath = path.join(root, "public/mini-app/index.html");
const appPath = path.join(root, "public/mini-app/app.js");

const uiV20 = `
/* ui-v20 */
body.web-mode .web-dash-hero .section-label,body.web-mode .web-dash-hero .hero-currency-label{font-weight:400!important}
body:not(.web-mode) #screen-home .web-dash-hero #statusText{display:none!important}
body:not(.web-mode) #screen-home .web-dash-hero .balance-trend{display:flex!important;flex-direction:row!important;align-items:baseline!important;flex-wrap:wrap!important;gap:4px 10px!important}
body:not(.web-mode) #screen-home .web-dash-hero .balance-trend .muted{white-space:nowrap}
body:not(.web-mode) #screen-home .web-dash-hero .hero-balance-top{align-items:flex-start!important}
body:not(.web-mode) #screen-home .web-dash-hero .hero-balance-top>div:first-child,body:not(.web-mode) #screen-home .web-dash-hero .hero-currency-field{margin-top:0!important;padding-top:0!important}
body:not(.web-mode) #screen-home .web-dash-hero .section-label,body:not(.web-mode) #screen-home .web-dash-hero .hero-currency-label{margin:0 0 4px!important;padding:0!important;line-height:1.25!important;font-size:10px!important;letter-spacing:.07em!important}
body:not(.web-mode) #screen-home .web-home-dash-top>.balancy-home-hints-grid:not([hidden]){margin-bottom:var(--balancy-hint-gap-after,12px)!important}
@media(min-width:1279px){body.web-mode .web-profile-menu--sidebar .web-profile-dropdown{position:fixed!important;left:auto!important;right:auto!important;top:auto!important;width:min(290px,calc(100vw - 16px))!important;min-width:0!important;max-width:none!important}}
body.web-mode.web-profile-dropdown-open .web-sidebar,body.web-mode.web-profile-dropdown-open .web-sidebar-footer{overflow:visible!important}
`;

let styles = fs.readFileSync(stylesPath, "utf8");
if (!styles.includes("/* ui-v20 */")) {
  styles += uiV20;
  fs.writeFileSync(stylesPath, styles);
}

let indexHtml = fs.readFileSync(indexPath, "utf8");
indexHtml = indexHtml.replace(/20260517ui-v\d+/g, "20260517ui-v20");
fs.writeFileSync(indexPath, indexHtml);

let appJs = fs.readFileSync(appPath, "utf8");

appJs = appJs.replace(
  "window.innerWidth<=900&&!document.body.classList.contains(\"web-nav-drawer-open\")",
  "window.innerWidth<=1278&&!document.body.classList.contains(\"web-nav-drawer-open\")"
);

const oldPositionBranch =
  'if(window.innerWidth>=1279){clearWebSidebarProfileDropdownPosition(),webProfileDropdown.style.position="absolute",webProfileDropdown.style.left="0",webProfileDropdown.style.right="0",webProfileDropdown.style.top="calc(100% + 8px)",webProfileDropdown.style.width="100%",webProfileDropdown.style.minWidth="0",webProfileDropdown.style.maxWidth="none",webProfileDropdown.style.bottom="auto",webProfileDropdown.style.zIndex="560";return}';

if (appJs.includes(oldPositionBranch)) {
  appJs = appJs.replace(oldPositionBranch, "");
}

const oldToggle =
  'function toggleWebProfileDropdown(){if(!webProfileDropdown||!webProfileToggleButton)return;closeWebNewEntryMenu();const u=!webProfileDropdown.hidden;webProfileDropdown.hidden=u,webProfileToggleButton.setAttribute("aria-expanded",String(!u)),u?clearWebSidebarProfileDropdownPosition():window.requestAnimationFrame(()=>{positionWebSidebarProfileDropdown()})}';

const newToggle =
  'function toggleWebProfileDropdown(){if(!webProfileDropdown||!webProfileToggleButton)return;closeWebNewEntryMenu();const u=!webProfileDropdown.hidden;webProfileDropdown.hidden=u,webProfileToggleButton.setAttribute("aria-expanded",String(!u)),u?(document.body.classList.remove("web-profile-dropdown-open"),clearWebSidebarProfileDropdownPosition()):(document.body.classList.add("web-profile-dropdown-open"),window.requestAnimationFrame(()=>{positionWebSidebarProfileDropdown()}))}';

if (appJs.includes(oldToggle)) {
  appJs = appJs.replace(oldToggle, newToggle);
}

const oldClose =
  'function closeWebProfileDropdown(){!webProfileDropdown||!webProfileToggleButton||(webProfileDropdown.hidden=!0,webProfileToggleButton.setAttribute("aria-expanded","false"),clearWebSidebarProfileDropdownPosition())}';

const newClose =
  'function closeWebProfileDropdown(){!webProfileDropdown||!webProfileToggleButton||(webProfileDropdown.hidden=!0,webProfileToggleButton.setAttribute("aria-expanded","false"),document.body.classList.remove("web-profile-dropdown-open"),clearWebSidebarProfileDropdownPosition())}';

if (appJs.includes(oldClose)) {
  appJs = appJs.replace(oldClose, newClose);
}

fs.writeFileSync(appPath, appJs);
console.log("ui-v20 applied");
