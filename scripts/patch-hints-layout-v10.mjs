import fs from "node:fs";
import path from "node:path";

const root = path.join(path.resolve(import.meta.dirname, ".."), "public", "mini-app");
const htmlPath = path.join(root, "index.html");
const cssPath = path.join(root, "styles.css");

let html = fs.readFileSync(htmlPath, "utf8");

function extractDivBlock(source, hintAttr) {
  const marker = `data-balancy-hint="${hintAttr}"`;
  const i = source.indexOf(marker);
  if (i < 0) return null;
  const start = source.lastIndexOf('<div class="balancy-hint-card', i);
  if (start < 0) return null;
  let depth = 0;
  let pos = start;
  while (pos < source.length) {
    const open = source.indexOf("<div", pos);
    const close = source.indexOf("</div>", pos);
    if (close === -1) return null;
    if (open !== -1 && open < close) {
      depth += 1;
      pos = open + 4;
    } else {
      depth -= 1;
      pos = close + 6;
      if (depth === 0) return { start, end: pos, block: source.slice(start, pos) };
    }
  }
  return null;
}

function dedent(block, from, to) {
  return block.replace(new RegExp(`^${from}`, "gm"), to);
}

function moveHintPair(pageAnchor, layoutAnchor, hintA, hintB) {
  const a = extractDivBlock(html, hintA);
  const b = extractDivBlock(html, hintB);
  if (!a || !b) return false;
  const minStart = Math.min(a.start, b.start);
  const maxEnd = Math.max(a.end, b.end);
  const combined = html.slice(minStart, maxEnd);
  html = html.slice(0, minStart) + html.slice(maxEnd);
  const top = dedent(combined, "                ", "            ");
  const anchor = `${pageAnchor}\n${layoutAnchor}`;
  if (html.includes(anchor) && !html.includes(`${pageAnchor}\n            <motion class="balancy-hint-card`)) {
    html = html.replace(anchor, `${pageAnchor}\n${top}${layoutAnchor}`);
    return true;
  }
  return false;
}

// fix typo in moveHintPair check
function moveHintPairFixed(pageAnchor, layoutAnchor, hintA, hintB) {
  const a = extractDivBlock(html, hintA);
  const b = extractDivBlock(html, hintB);
  if (!a || !b) return false;
  const minStart = Math.min(a.start, b.start);
  const maxEnd = Math.max(a.end, b.end);
  const combined = html.slice(minStart, maxEnd);
  html = html.slice(0, minStart) + html.slice(maxEnd);
  const top = dedent(combined, "                ", "            ");
  const anchor = `${pageAnchor}\n${layoutAnchor}`;
  const insertKey = `${pageAnchor}\n            <div class="balancy-hint-card`;
  if (html.includes(anchor) && !html.includes(insertKey)) {
    html = html.replace(anchor, `${pageAnchor}\n${top}${layoutAnchor}`);
    return true;
  }
  return false;
}

if (
  moveHintPairFixed(
    '          <div class="web-accounts-page">',
    '            <div class="web-accounts-layout">',
    "accountsSwipeTg",
    "accountsSwipeWeb"
  )
) {
  console.log("Moved accounts hints");
}

if (
  moveHintPairFixed(
    '          <div class="web-categories-page">',
    '            <div class="web-categories-layout">',
    "categoriesSwipeTg",
    "categoriesSwipeWeb"
  )
) {
  console.log("Moved categories hints");
}

const activity = extractDivBlock(html, "activityForm");
if (activity && activity.start > html.indexOf("web-activity-main")) {
  html = html.slice(0, activity.start) + html.slice(activity.end);
  const top = activity.block;
  html = html.replace(
    '<section id="screen-activity" class="screen" data-screen="activity">\n          <div class="web-activity-layout">',
    `<section id="screen-activity" class="screen" data-screen="activity">\n          ${top}\n          <div class="web-activity-layout">`
  );
  console.log("Moved activity hint");
}

fs.writeFileSync(htmlPath, html);

let css = fs.readFileSync(cssPath, "utf8");
const cssReplacements = [
  ["gap:22px 24px;align-items:start}.web-accounts-main", "gap:20px;align-items:start}.web-accounts-main"],
  ["gap:22px 24px;align-items:start}body.web-mode .web-categories-main", "gap:20px;align-items:start}body.web-mode .web-categories-main"],
  ["grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:16px;align-items:start;width:100%}", "grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:20px;align-items:start;width:100%}"],
  [".web-accounts-surface{box-sizing:border-box;width:100%;min-width:0;border-radius:18px;border", ".web-accounts-surface{box-sizing:border-box;width:100%;min-width:0;border-radius:10px;border"],
  ["display:grid!important;gap:16px!important;width:100%}", "display:grid!important;gap:20px!important;width:100%}"],
];
for (const [a, b] of cssReplacements) {
  if (css.includes(a)) css = css.replaceAll(a, b);
}

const v10Marker = "/* ui-v10";
if (css.includes(v10Marker)) css = css.slice(0, css.indexOf(v10Marker));
else {
  const anchor = "body.web-mode .web-categories-table-shell{border-radius:0 0 10px 10px!important}";
  const i = css.lastIndexOf(anchor);
  if (i >= 0) css = css.slice(0, i + anchor.length);
}

css += `
/* ui-v10 */
:root{--balancy-web-layout-gap:20px;--balancy-hint-gap-after:12px}
body.web-mode .web-accounts-layout,body.web-mode .web-categories-layout,body.web-mode .web-activity-layout,body.web-mode .web-transfer-layout{gap:var(--balancy-web-layout-gap)!important;column-gap:var(--balancy-web-layout-gap)!important;row-gap:var(--balancy-web-layout-gap)!important}
body.web-mode .web-accounts-page,body.web-mode .web-categories-page{display:flex;flex-direction:column;gap:var(--balancy-hint-gap-after);width:100%;min-width:0}
body.web-mode .web-accounts-page>.balancy-hint-card,body.web-mode .web-categories-page>.balancy-hint-card,body.web-mode #screen-activity>.balancy-hint-card,body.web-mode #screen-home>.balancy-hint-card{width:100%!important;max-width:100%!important;box-sizing:border-box!important;margin:0!important}
body:not(.web-mode) .web-accounts-page>.balancy-hint-card,body:not(.web-mode) .web-categories-page>.balancy-hint-card,body:not(.web-mode) #screen-activity>.balancy-hint-card{width:100%;max-width:100%;box-sizing:border-box;margin:0 0 var(--balancy-hint-gap-after)}
body.web-mode .web-accounts-main>.balancy-hint-card,body.web-mode .web-categories-main>.balancy-hint-card,body.web-mode .web-activity-main>.balancy-hint-card{display:none!important}
body:not(.web-mode) #screen-activity .balancy-hint-card[data-balancy-hint=activityForm]{margin:0 0 var(--balancy-hint-gap-after)!important;width:100%;max-width:100%;box-sizing:border-box}
#screen-home>.balancy-hint-card,#tgActivityOpsTip.balancy-hint-card{margin:0 0 var(--balancy-hint-gap-after)!important;width:100%;max-width:100%;box-sizing:border-box}
body:not(.web-mode) #screen-accounts .web-accounts-list-shell.web-accounts-surface,body:not(.web-mode) #screen-accounts #tgAccountsSummaryCard.tg-accounts-summary.web-accounts-surface{border-radius:10px!important}
body:not(.web-mode) #screen-accounts .web-accounts-list-head{border-radius:10px 10px 0 0!important}
body:not(.web-mode) #screen-accounts .web-accounts-list-body{border-radius:0 0 10px 10px!important}
`;

fs.writeFileSync(cssPath, css);
console.log("Patched styles.css ui-v10");
