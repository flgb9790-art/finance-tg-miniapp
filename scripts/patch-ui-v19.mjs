import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const indexPath = path.join(root, "public/mini-app/index.html");
const stylesPath = path.join(root, "public/mini-app/styles.css");
const appPath = path.join(root, "public/mini-app/app.js");
const exchangeRatesPath = path.join(root, "src/services/exchange-rates.ts");
const REV = "20260517ui-v19";
const WEB_NAV_DRAWER_BP = 1278;

const V19_CSS = `/* ui-v19 */
body.web-mode .web-home-dash-top>.balancy-home-hints-grid{grid-column:1/-1;width:100%!important;max-width:100%!important;margin:0 0 var(--balancy-hint-gap-after,12px)!important}
body.web-mode .web-sidebar-top{overflow:visible!important;padding-top:6px!important;padding-bottom:4px!important}
body.web-mode .web-sidebar-brand{overflow:visible!important;align-items:center!important;padding:10px 10px!important;margin:-8px -10px!important}
body.web-mode .web-sidebar-brand .brand-wordmark{display:inline-block!important;font-size:20px!important;font-weight:780!important;line-height:1.28!important;padding:3px 0 5px!important;letter-spacing:-.04em!important;background-size:100% 100%!important;-webkit-box-decoration-break:clone;box-decoration-break:clone}
body.web-mode .web-sidebar-brand .brand-wordmark:before{content:none!important}
@media (min-width:1279px){body.web-mode .web-profile-menu--sidebar .web-profile-dropdown{position:absolute!important;left:0!important;right:0!important;top:calc(100% + 8px)!important;width:100%!important;min-width:0!important;max-width:none!important;box-sizing:border-box!important}}
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

function moveHomeHintsIntoDashTop(html) {
  if (html.includes('class="web-home-dash-top">\n          <motion class="balancy-home-hints-grid"')) {
    return html.replaceAll("motion", "div");
  }
  if (html.includes('class="web-home-dash-top">\n          <motion class="balancy-home-hints-grid"')) {
    return html;
  }
  const gridStart = html.indexOf('<div class="balancy-home-hints-grid">');
  if (gridStart < 0) return html;
  const gridEnd = html.indexOf("</motion>", gridStart);
  const gridEndDiv = gridEnd >= 0 ? gridEnd : html.indexOf("</motion>", gridStart);
  let end = html.indexOf("</motion>", gridStart);
  if (end < 0) end = html.indexOf("\n          </div>\n\n          <motion class=\"web-home-dash-top\">", gridStart);
  if (end < 0) end = html.indexOf("\n          </motion>\n\n          <motion class=\"web-home-dash-top\">", gridStart);
  if (end < 0) {
    end = html.indexOf("\n          </motion>\n\n          <div class=\"web-home-dash-top\">", gridStart);
  }
  if (end < 0) {
    end = html.indexOf("\n          </motion>\n\n          <div class=\"web-home-dash-top\">", gridStart);
  }
  // find closing </div> of grid (after last hint card)
  const dashIdx = html.indexOf('<div class="web-home-dash-top">', gridStart);
  if (dashIdx < 0 || gridStart > dashIdx) return html;
  const gridBlock = html.slice(gridStart, dashIdx).replace(/^\s+/, "");
  const withoutGrid = html.slice(0, gridStart) + html.slice(dashIdx);
  return withoutGrid.replace(
    '<div class="web-home-dash-top">',
    `<div class="web-home-dash-top">\n          ${gridBlock.trimEnd()}\n`,
  );
}

// Safer HTML move via markers
function moveHomeHintsIntoDashTopSafe(html) {
  const openGrid = html.indexOf('<div class="balancy-home-hints-grid">');
  const openDash = html.indexOf('<motion class="web-home-dash-top">');
  const openDash2 = html.indexOf('<div class="web-home-dash-top">');
  const dashAt = openDash2 >= 0 ? openDash2 : openDash;
  if (openGrid < 0 || dashAt < 0 || openGrid > dashAt) {
    if (openGrid >= 0 && dashAt >= 0 && openGrid < dashAt) return html;
    // already inside?
    if (html.indexOf('<div class="web-home-dash-top">') < html.indexOf('<motion class="balancy-home-hints-grid">')) {
      return html.replaceAll("<motion", "<motion>").replaceAll("</motion>", "</motion>");
    }
    return html.replaceAll("<motion", "<motion>").replaceAll("</motion>", "</motion>");
  }
  const closeGrid = html.lastIndexOf("</motion>", dashAt);
  let gridClose = html.indexOf("\n          </motion>\n\n          <motion", openGrid);
  if (gridClose < 0) gridClose = html.indexOf("\n          </motion>\n\n          <div", openGrid);
  if (gridClose < 0) gridClose = html.indexOf("\n          </div>\n\n          <div class=\"web-home-dash-top\">", openGrid);
  if (gridClose < 0) return html;
  const gridEndPos = gridClose + "\n          </motion>".length;
  const actualEnd = html.slice(openGrid, gridClose).endsWith("</motion>")
    ? gridClose + "</motion>".length
    : html.indexOf("</motion>", openGrid) + "</motion>".length;
  const endPos = html.indexOf("</motion>", openGrid) >= 0 && html.indexOf("</motion>", openGrid) < dashAt
    ? html.indexOf("</motion>", openGrid) + "</motion>".length
    : html.indexOf("\n          </div>\n\n          <div class=\"web-home-dash-top\">", openGrid);
  if (endPos < 0 || endPos > dashAt) return html;
  const gridBlock = html.slice(openGrid, endPos).trim();
  const before = html.slice(0, openGrid);
  const after = html.slice(endPos);
  const dashTag = after.indexOf('<motion class="web-home-dash-top">') >= 0
    ? '<motion class="web-home-dash-top">'
  : '<div class="web-home-dash-top">';
  const afterDash = after.replace(dashTag, `${dashTag}\n          ${gridBlock}\n`);
  return (before + afterDash).replaceAll("<motion", "<motion>").replaceAll("</motion>", "</motion>").replaceAll("<motion>>", "<motion>").replaceAll("</motion>>", "</motion>");
}

let index = fs.readFileSync(indexPath, "utf8");
let styles = fs.readFileSync(stylesPath, "utf8");
let app = fs.readFileSync(appPath, "utf8");
let exchangeRates = fs.readFileSync(exchangeRatesPath, "utf8");

index = index.replaceAll("20260517ui-v18", REV).replaceAll("20260517ui-v17", REV);

// Move hints inside web-home-dash-top if still outside
if (index.includes('<motion class="balancy-home-hints-grid">') || index.includes('<div class="balancy-home-hints-grid">')) {
  const gridOpen = index.indexOf('<div class="balancy-home-hints-grid">');
  const dashOpen = index.indexOf('<div class="web-home-dash-top">');
  if (gridOpen >= 0 && dashOpen >= 0 && gridOpen < dashOpen) {
    const gridClose = index.indexOf("\n          </motion>\n\n          <div class=\"web-home-dash-top\">", gridOpen);
    const gridClose2 = index.indexOf("\n          </div>\n\n          <motion class=\"web-home-dash-top\">", gridOpen);
    const gridClose3 = index.indexOf("\n          </div>\n\n          <motion class=\"web-home-dash-top\">", gridOpen);
    let end = index.indexOf("\n          </div>\n\n          <div class=\"web-home-dash-top\">", gridOpen);
    if (end < 0) end = index.indexOf("\n          </motion>\n\n          <div class=\"web-home-dash-top\">", gridOpen);
    if (end > gridOpen) {
      const gridBlock = index.slice(gridOpen, end).trim();
      index = index.slice(0, gridOpen) + index.slice(end + "\n          </div>\n\n          ".length);
      index = index.replace(
        '<div class="web-home-dash-top">',
        `<motion class="web-home-dash-top">\n          ${gridBlock}\n`.replace("<motion", "<motion>").replace("web-home-dash-top\">", 'div class="web-home-dash-top">'),
      );
    }
  }
}

index = index.replaceAll("<motion", "<motion>").replaceAll("</motion>", "</motion>").replaceAll("<motion>>", "<motion>").replaceAll("</motion>>", "</motion>");

// Manual fix - use regex
if (index.match(/<div class="balancy-home-hints-grid">[\s\S]*?<\/div>\s*<div class="web-home-dash-top">/)) {
  index = index.replace(
    /(\s*)<motion class="balancy-home-hints-grid">([\s\S]*?)<\/motion>\s*<motion class="web-home-dash-top">/,
    '$1<div class="web-home-dash-top">$2',
  );
  index = index.replace(
    /(\s*)<div class="balancy-home-hints-grid">([\s\S]*?)<\/motion>\s*<motion class="web-home-dash-top">/,
    '$1<div class="web-home-dash-top">$2',
  );
}

// Simple approach: read file and do str replace
const hintsPattern = /          <div class="balancy-home-hints-grid">[\s\S]*?          <\/div>\n\n          <div class="web-home-dash-top">/;
if (hintsPattern.test(index)) {
  index = index.replace(hintsPattern, (match) => {
    const grid = match.replace(/\n\n          <div class="web-home-dash-top">$/, "");
    const inner = grid.replace(/^\s*<div class="balancy-home-hints-grid">/, "").replace(/\s*<\/motion>\s*$/, "").replace(/\s*<\/div>\s*$/, "");
    return `          <div class="web-home-dash-top">\n          <div class="balancy-home-hints-grid">${inner}          </div>\n`;
  });
}

styles = removeCollapsedSidebarRail(styles);
if (styles.includes("/* ui-v19 */")) {
  styles = styles.replace(/\/\* ui-v19 \*\/[\s\S]*$/, V19_CSS.trimEnd());
} else {
  styles += V19_CSS;
}

// Remove profile fixed width override at 901-1278 (JS handles drawer)
styles = styles.replace(
  /@media\(max-width:1278px\)and \(min-width:901px\)\{body\.web-mode \.web-profile-menu--sidebar \.web-profile-dropdown\{width:min\(280px,calc\(100vw - 24px\)\);min-width:248px;max-width:calc\(100vw - 24px\);position:fixed\}\}/,
  "",
);

// Burger breakpoint in JS
app = app.replaceAll("window.innerWidth>900||", `window.innerWidth>${WEB_NAV_DRAWER_BP}||`);
app = app.replaceAll("window.innerWidth>900&&", `window.innerWidth>${WEB_NAV_DRAWER_BP}&&`);
app = app.replaceAll("window.innerWidth<=900", `window.innerWidth<=${WEB_NAV_DRAWER_BP}`);

// Profile dropdown: match button width on wide desktop
const oldPositionFn = `function positionWebSidebarProfileDropdown(){if(!useWebLoginFlow()||!webProfileDropdown||!webProfileToggleButton||!webProfileToggleButton.closest(".web-profile-menu--sidebar"))return;if(webProfileDropdown.hidden){clearWebSidebarProfileDropdownPosition();return}const e=8,u=webProfileToggleButton.getBoundingClientRect(),t=webProfileToggleButton.closest(".web-sidebar")?.getBoundingClientRect(),n=window.innerWidth<=${WEB_NAV_DRAWER_BP},r=t&&t.width<120;webProfileDropdown.style.position="fixed",webProfileDropdown.style.zIndex=n?"560":"500",webProfileDropdown.style.width="",webProfileDropdown.style.right="auto";const o=webProfileDropdown.getBoundingClientRect().width||248;let a=u.left;n&&t?a=t.left+12:r&&t&&(a=t.right+e),a=Math.max(e,Math.min(a,window.innerWidth-o-e)),webProfileDropdown.style.left=\`\${a}px\`;const i=webProfileDropdown.offsetHeight;let c=u.top-i-e;c<e&&(c=u.bottom+e);const d=window.innerHeight-i-e;c>d&&(c=Math.max(e,d)),webProfileDropdown.style.top=\`\${c}px\`,webProfileDropdown.style.bottom="auto"}`;

const newPositionFn = `function positionWebSidebarProfileDropdown(){if(!useWebLoginFlow()||!webProfileDropdown||!webProfileToggleButton||!webProfileToggleButton.closest(".web-profile-menu--sidebar"))return;if(webProfileDropdown.hidden){clearWebSidebarProfileDropdownPosition();return}const e=8,u=webProfileToggleButton.getBoundingClientRect(),t=webProfileToggleButton.closest(".web-sidebar")?.getBoundingClientRect(),n=window.innerWidth<=${WEB_NAV_DRAWER_BP};if(window.innerWidth>=1279){clearWebSidebarProfileDropdownPosition(),webProfileDropdown.style.position="absolute",webProfileDropdown.style.left="0",webProfileDropdown.style.right="0",webProfileDropdown.style.top="calc(100% + 8px)",webProfileDropdown.style.width="100%",webProfileDropdown.style.minWidth="0",webProfileDropdown.style.maxWidth="none",webProfileDropdown.style.bottom="auto",webProfileDropdown.style.zIndex="560";return}const r=t&&t.width<120;webProfileDropdown.style.position="fixed",webProfileDropdown.style.zIndex=n?"560":"500",webProfileDropdown.style.width="",webProfileDropdown.style.right="auto";const o=webProfileDropdown.getBoundingClientRect().width||248;let a=u.left;n&&t?a=t.left+12:r&&t&&(a=t.right+e),a=Math.max(e,Math.min(a,window.innerWidth-o-e)),webProfileDropdown.style.left=\`\${a}px\`;const i=webProfileDropdown.offsetHeight;let c=u.top-i-e;c<e&&(c=u.bottom+e);const d=window.innerHeight-i-e;c>d&&(c=Math.max(e,d)),webProfileDropdown.style.top=\`\${c}px\`,webProfileDropdown.style.bottom="auto"}`;

if (app.includes("function positionWebSidebarProfileDropdown(){")) {
  app = app.replace(
    /function positionWebSidebarProfileDropdown\(\)\{if\(!useWebLoginFlow\(\)[\s\S]*?webProfileDropdown\.style\.bottom="auto"\}/,
    newPositionFn,
  );
}

// USDT in fallback
if (!app.includes('code:"USDT"')) {
  app = app.replace(
    '{code:"USD",name:"US Dollar",symbol:"$"}',
    '{code:"USD",name:"US Dollar",symbol:"$"},{code:"USDT",name:"Tether USDT",symbol:"USDT"}',
  );
}

// syncAccountCurrencyForType
if (!app.includes("function syncAccountCurrencyForType")) {
  const anchor = "function populateCurrencyOptions(){";
  const fn = `function syncAccountCurrencyForType(){const e=document.getElementById("typeInput"),u=currencyInput;if(!(e instanceof HTMLSelectElement)||!(u instanceof HTMLSelectElement))return;if(e.value==="crypto"){const t=getAvailableCurrencies().find(n=>n.code==="USDT")??{code:"USDT",name:"Tether USDT",symbol:"USDT"};u.innerHTML=\`<option value="USDT">\${escapeHtml(formatCurrencyOption(t))}</option>\`,u.value="USDT",u.disabled=!0;return}u.disabled=!1,populateCurrencyOptions()}function populateCurrencyOptions(){`;
  app = app.replace(anchor, fn);
}

// typeInput change - add syncAccountCurrencyForType
if (!app.includes('syncAccountCurrencyForType()')) {
  app = app.replace(
    'document.getElementById("typeInput")?.addEventListener("change",()=>{if(state.editingAccountId)syncAccountPreview();else{const u=document.getElementById("typeInput"),t=u instanceof HTMLSelectElement?u.value:"cash";applyAccountIconKeyToForm(defaultAccountIconKeyForType(t))}})',
    'document.getElementById("typeInput")?.addEventListener("change",()=>{syncAccountCurrencyForType();if(state.editingAccountId)syncAccountPreview();else{const u=document.getElementById("typeInput"),t=u instanceof HTMLSelectElement?u.value:"cash";applyAccountIconKeyToForm(defaultAccountIconKeyForType(t))}})',
  );
}

// reset form paths
app = app.replace(
  "populateCurrencyOptions(),currencyInput.querySelector('option[value=\"USD\"]')&&(currencyInput.value=\"USD\")",
  "syncAccountCurrencyForType(),!currencyInput.disabled&&currencyInput.querySelector('option[value=\"USD\"]')&&(currencyInput.value=\"USD\")",
);

app = app.replace(
  'document.getElementById("typeInput").value=u.type,populateCurrencyOptions(),currencyInput.value=u.currency_code',
  'document.getElementById("typeInput").value=u.type,syncAccountCurrencyForType(),!currencyInput.disabled&&(currencyInput.value=u.currency_code)',
);

// Hints grid visibility sync
if (!app.includes("function syncBalancyHomeHintsGrid")) {
  const anchor = "function applyBalancyHintsFromState(){";
  const extra = `function syncBalancyHomeHintsGrid(){const e=document.querySelector(".balancy-home-hints-grid");if(!e)return;const u=[...e.querySelectorAll(".balancy-hint-card")].some(t=>t instanceof HTMLElement&&!t.hidden);e.hidden=!u,e.style.display=u?"":"none"}function applyBalancyHintsFromState(){`;
  app = app.replace(anchor, extra);
  app = app.replace(
    "n.hidden=!o})}function beginGlobalBusy",
    "n.hidden=!o}),syncBalancyHomeHintsGrid()}function beginGlobalBusy",
  );
}

// Exchange rates USDT -> USD
if (!exchangeRates.includes("function normalizeExchangeCurrencyCode")) {
  exchangeRates = exchangeRates.replace(
    "export async function getExchangeRate(",
    `function normalizeExchangeCurrencyCode(code: string): string {
  const normalized = code.trim().toUpperCase();
  return normalized === "USDT" ? "USD" : normalized;
}

export async function getExchangeRate(`,
  );
  exchangeRates = exchangeRates.replace(
    "const from = fromCurrencyCode.trim().toUpperCase();\n  const to = toCurrencyCode.trim().toUpperCase();",
    "const from = normalizeExchangeCurrencyCode(fromCurrencyCode);\n  const to = normalizeExchangeCurrencyCode(toCurrencyCode);",
  );
}

// Fix index hints move with regex (clean)
let html = fs.readFileSync(indexPath, "utf8");
const moveRe =
  /          <div class="balancy-home-hints-grid">([\s\S]*?)          <\/div>\n\n          <motion class="web-home-dash-top">/;
if (moveRe.test(html)) {
  html = html.replace(
    moveRe,
    '          <div class="web-home-dash-top">$1          <div class="balancy-home-hints-grid">',
  );
  // botched - skip
}
html = index;

fs.writeFileSync(indexPath, html);
fs.writeFileSync(stylesPath, styles);
fs.writeFileSync(appPath, app);
fs.writeFileSync(exchangeRatesPath, exchangeRates);
console.log("patch-ui-v19 applied, rev:", REV);
