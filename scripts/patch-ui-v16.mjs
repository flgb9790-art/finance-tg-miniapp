import fs from "node:fs";
import path from "node:path";

const root = path.join(path.resolve(import.meta.dirname, ".."), "public", "mini-app");
const cssPath = path.join(root, "styles.css");
const htmlPath = path.join(root, "index.html");
const jsPath = path.join(root, "app.js");

let css = fs.readFileSync(cssPath, "utf8");

const v16Marker = "/* ui-v16:";
if (css.includes(v16Marker)) {
  css = css.slice(0, css.indexOf(v16Marker));
} else {
  const v15Marker = "/* ui-v15:";
  if (css.includes(v15Marker)) {
    css = css.slice(0, css.indexOf(v15Marker));
  }
}

css += `
/* ui-v16 */
body.web-mode .web-dash-hero .hero-balance-footer .hero-rates-status{color:#f1f5f9d9!important}
body.web-mode .web-dash-hero .hero-balance-footer .toolbar-text-btn{background:#ffffff24!important;border:1px solid rgb(255 255 255 / .28)!important;color:#f8fafc!important}
body.web-mode .web-dash-hero .hero-balance-footer .toolbar-text-btn:active{opacity:.88!important;background:#ffffff38!important}
body.web-mode .web-dash-hero .hero-balance-footer{margin-top:16px!important;padding-top:2px}
.web-transfer-select-shell{gap:12px!important}
.web-transfer-select{padding-left:8px!important;padding-right:28px!important}
body:not(.web-mode) .web-categories-legacy-wrap{display:flex!important;flex-direction:column!important;gap:14px!important;width:100%}
body:not(.web-mode) .tg-categories-list-shell{margin:0!important}
body:not(.web-mode) .tg-categories-list-shell .web-accounts-list-head{margin-bottom:0!important}
body:not(.web-mode) .tg-categories-list-shell .web-accounts-list-body .category-list{margin-top:0!important;gap:10px!important}
body:not(.web-mode) .tg-categories-list-shell .category-item{background:var(--card-2);border:1px solid var(--line);border-radius:10px}
`;

fs.writeFileSync(cssPath, css);

let html = fs.readFileSync(htmlPath, "utf8");

const categoriesReplacement = `                <div class="web-categories-legacy-wrap">
                  <section class="web-accounts-list-shell web-accounts-surface tg-categories-list-shell">
                    <header class="web-accounts-list-head">
                      <h2 class="web-accounts-title">Доходы</h2>
                      <span id="tgCategoriesIncomeBadge" class="web-accounts-head-badge">0</span>
                    </header>
                    <motion class="web-accounts-list-body">
                      <motion id="incomeCategoriesList" class="category-list accounts-list"></motion>
                    </motion>
                  </section>

                  <section class="web-accounts-list-shell web-accounts-surface tg-categories-list-shell">
                    <header class="web-accounts-list-head">
                      <h2 class="web-accounts-title">Расходы</h2>
                      <span id="tgCategoriesExpenseBadge" class="web-accounts-head-badge">0</span>
                    </header>
                    <motion class="web-accounts-list-body">
                      <motion id="expenseCategoriesList" class="category-list accounts-list"></motion>
                    </motion>
                  </section>
                </motion>
              </motion>`.replaceAll("motion", "div");

if (html.includes('class="category-columns"')) {
  const start = html.indexOf('<div class="web-categories-legacy-wrap">');
  const end = html.indexOf('<aside class="web-categories-panel"', start);
  if (start < 0 || end < 0) {
    throw new Error("categories block bounds not found");
  }
  html = html.slice(0, start) + categoriesReplacement + "\n\n              " + html.slice(end);
}

html = html.replace(
  /BALANCY_CLIENT_ASSET_REV = "20260517ui-v\d+"/,
  'BALANCY_CLIENT_ASSET_REV = "20260517ui-v16"'
);

fs.writeFileSync(htmlPath, html);

let js = fs.readFileSync(jsPath, "utf8");

const oldBadge =
  'const o=document.getElementById("webCategoriesIncomeBadge"),a=document.getElementById("webCategoriesExpenseBadge");o&&(o.textContent=String(n.length)),a&&(a.textContent=String(r.length))';

const newBadge =
  'const o=document.getElementById("webCategoriesIncomeBadge"),a=document.getElementById("webCategoriesExpenseBadge"),tgI=document.getElementById("tgCategoriesIncomeBadge"),tgE=document.getElementById("tgCategoriesExpenseBadge");o&&(o.textContent=String(n.length)),a&&(a.textContent=String(r.length)),tgI&&(tgI.textContent=String(n.length)),tgE&&(tgE.textContent=String(r.length))';

if (js.includes(oldBadge)) {
  js = js.replace(oldBadge, newBadge);
}

fs.writeFileSync(jsPath, js);
console.log("Patched ui-v16");
