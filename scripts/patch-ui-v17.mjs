import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const indexPath = path.join(root, "public/mini-app/index.html");
const stylesPath = path.join(root, "public/mini-app/styles.css");
const REV = "20260517ui-v17";

const V17_CSS = `/* ui-v17 */
body:not(.web-mode) .web-categories-page{display:flex!important;flex-direction:column!important;gap:var(--balancy-hint-gap-after,12px)!important;width:100%;min-width:0}
body:not(.web-mode) .tg-categories-list-shell .web-accounts-list-head{margin-bottom:0!important;padding:12px 16px 18px!important}
body:not(.web-mode) .tg-categories-list-shell .web-accounts-list-body .category-list{margin-top:0!important;padding-top:4px!important}
body.web-mode .balancy-home-hints-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:var(--balancy-hint-gap-after,12px);width:100%;max-width:100%;box-sizing:border-box}
body.web-mode .balancy-home-hints-grid:not(:has(>.balancy-hint-card:not([hidden]))){display:none}
body.web-mode .balancy-home-hints-grid>.balancy-hint-card{margin:0!important;width:100%!important;max-width:100%!important;box-sizing:border-box!important;height:100%;align-self:stretch}
@media (max-width:960px){body.web-mode .balancy-home-hints-grid{grid-template-columns:1fr}}
body.web-mode .web-dash-hero .hero-balance-top{align-items:flex-start!important}
body.web-mode .web-dash-hero .hero-balance-top>div:first-child,body.web-mode .web-dash-hero .hero-currency-field{margin-top:0!important;padding-top:0!important}
body.web-mode .web-dash-hero .section-label,body.web-mode .web-dash-hero .hero-currency-label{margin:0 0 4px!important;padding:0!important;line-height:1.25!important;font-size:10px!important;font-weight:700!important;letter-spacing:.1em!important;text-transform:uppercase!important}
`;

let index = fs.readFileSync(indexPath, "utf8");
let styles = fs.readFileSync(stylesPath, "utf8");

index = index.replaceAll("20260517ui-v16", REV);

if (!index.includes('class="balancy-home-hints-grid"')) {
  index = index.replace(
    `          </header>

          <motion
            class="balancy-hint-card"
            data-balancy-hint="homeStart"`.replaceAll("motion", "motion"),
    `          </header>

          <div class="balancy-home-hints-grid">
          <div
            class="balancy-hint-card"
            data-balancy-hint="homeStart"`,
  );
  const closeHomeHints = `              ×
            </button>
          </div>

          <div class="web-home-dash-top">`;
  const closeHomeHintsWrapped = `              ×
            </button>
          </div>
          </div>

          <div class="web-home-dash-top">`;
  if (!index.includes(closeHomeHintsWrapped)) {
    const idx = index.indexOf('data-balancy-hint-close="homeHintsSettings"');
    if (idx < 0) throw new Error("homeHintsSettings hint not found");
    const slice = index.slice(idx, idx + 800);
    if (!slice.includes(closeHomeHints.split("\n")[0])) {
      throw new Error("home hints close anchor not found");
    }
    index = index.replace(closeHomeHints, closeHomeHintsWrapped);
  }
}

index = index.replaceAll("<motion", "<div").replaceAll("</motion>", "</motion>");

if (styles.includes("/* ui-v17 */")) {
  styles = styles.replace(/\/\* ui-v17 \*\/[\s\S]*$/, V17_CSS.trimEnd());
} else {
  styles += V17_CSS;
}

fs.writeFileSync(indexPath, index);
fs.writeFileSync(stylesPath, styles);
console.log("patch-ui-v17 applied, rev:", REV);
