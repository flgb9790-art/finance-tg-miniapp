import fs from "node:fs";
import path from "node:path";

const cssPath = path.join(path.resolve(import.meta.dirname, ".."), "public", "mini-app", "styles.css");
let css = fs.readFileSync(cssPath, "utf8");

const replacements = [
  [
    "body:not(.web-mode) #screen-home .web-dash-hero.hero-card{border:none;border-radius:24px",
    "body:not(.web-mode) #screen-home .web-dash-hero.hero-card{border:none;border-radius:10px",
  ],
  [
    "body:not(.web-mode) #screen-home .balancy-home-currencies-card{margin:0;padding:16px 16px 14px;border-radius:20px",
    "body:not(.web-mode) #screen-home .balancy-home-currencies-card{margin:0;padding:16px 16px 14px;border-radius:10px",
  ],
  [
    "body:not(.web-mode) #screen-home .tg-home-quick-actions{border-radius:18px",
    "body:not(.web-mode) #screen-home .tg-home-quick-actions{border-radius:10px",
  ],
  [
    "body:not(.web-mode) #screen-activity .balancy-hint-card[data-balancy-hint=activityForm]{display:flex!important;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;width:100%;max-width:100%;box-sizing:border-box;padding:12px 14px;margin:12px 0 0;border-radius:14px",
    "body:not(.web-mode) #screen-activity .balancy-hint-card[data-balancy-hint=activityForm]{display:flex!important;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;width:100%;max-width:100%;box-sizing:border-box;padding:12px 14px;margin:12px 0 0;border-radius:10px",
  ],
];

for (const [from, to] of replacements) {
  if (!css.includes(from)) {
    console.warn("Missing expected rule:", from.slice(0, 80));
  } else {
    css = css.replace(from, to);
  }
}

const tailAnchor = "body:not(.web-mode) #screen-home .card.hero-balance-card{border-radius:10px!important}";
if (css.includes(tailAnchor)) {
  css = css.slice(0, css.indexOf(tailAnchor));
}

const block = `
body:not(.web-mode) #screen-home .card.hero-balance-card{border-radius:10px!important}
body:not(.web-mode) #screen-home .web-home-col-card{border-radius:10px!important}
body:not(.web-mode) #screen-home .balancy-home-currencies-card{border-radius:10px!important}
body:not(.web-mode) #screen-home .tg-home-quick-actions.card{border-radius:10px!important}
body:not(.web-mode) #screen-categories .web-categories-legacy-wrap .category-columns{display:grid;gap:12px}
body:not(.web-mode) #screen-categories .web-categories-legacy-wrap .category-columns>div{display:flex;flex-direction:column;gap:0}
body:not(.web-mode) #screen-categories .web-categories-legacy-wrap .category-columns>div>.section-label{margin:0;padding:0 14px}
body:not(.web-mode) #screen-categories .web-categories-legacy-wrap .category-list{margin-top:0}
body:not(.web-mode) #screen-categories .web-categories-legacy-wrap .category-item{border-radius:10px}
body:not(.web-mode) #screen-activity .web-op-kind-card,
body:not(.web-mode) #screen-activity .activity-form-card,
body:not(.web-mode) #screen-activity .card.activity-form-card,
body:not(.web-mode) #screen-activity .balancy-hint-card,
body:not(.web-mode) #screen-activity .entry-photo-preview{border-radius:10px!important}
body:not(.web-mode) #screen-transfer .web-transfer-card,
body:not(.web-mode)[data-app-active-screen=transfer] .web-transfer-card.card,
body:not(.web-mode) #screen-transfer .tg-transfer-security,
body:not(.web-mode) #screen-transfer .balancy-hint-card{border-radius:10px!important}
body.web-mode #screen-activity .activity-form-card,
body.web-mode #screen-activity .web-op-kind-card,
body.web-mode #screen-transfer .web-transfer-card.card,
body.web-mode #screen-activity .web-activity-recent-card.card,
body.web-mode #screen-transfer .web-activity-recent-card.card,
body.web-mode #screen-activity .balancy-hint-card,
body.web-mode #screen-transfer .balancy-hint-card{border-radius:10px!important}
body.web-mode .web-categories-table-shell{border-radius:0 0 10px 10px!important}
`;

css += block;
fs.writeFileSync(cssPath, css);
console.log("Patched styles.css ui-v7");
