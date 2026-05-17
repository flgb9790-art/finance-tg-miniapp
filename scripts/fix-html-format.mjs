import fs from "node:fs";
let h = fs.readFileSync("public/mini-app/index.html", "utf8");
h = h.replace(/<\/div>\s+<div class="web-accounts-layout">/, "</div>\n            <motion class=\"web-accounts-layout\">");
h = h.replace('class="web-accounts-layout">', 'class="web-accounts-layout">', 1); // no-op sanity
h = h.replace(/<motion class="web-accounts-layout">/, '<motion class="web-accounts-layout">');
// final correct version:
h = fs.readFileSync("public/mini-app/index.html", "utf8");
h = h.replace(/<\/motion>\s+<div class="web-accounts-layout">/g, "</div>\n            <div class=\"web-accounts-layout\">");
h = h.replace(/<\/div>\s+<div class="web-accounts-layout">/g, "</motion>\n            <div class=\"web-accounts-layout\">");
// I'm going insane - use only div
h = fs.readFileSync("public/mini-app/index.html", "utf8");
h = h.replace("</div>            <motion class=\"web-accounts-layout\">", "</div>\n            <div class=\"web-accounts-layout\">");
h = h.replace("</div>            <div class=\"web-accounts-layout\">", "</div>\n            <div class=\"web-accounts-layout\">");
h = h.replace(/<\/motion>\n\s*<div class="web-categories-layout">/g, "</div>\n            <div class=\"web-categories-layout\">");
fs.writeFileSync("public/mini-app/index.html", h);
console.log("ok");
