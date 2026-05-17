import fs from "node:fs";
const s = fs.readFileSync("public/mini-app/styles.css", "utf8");
const checks = [
  ["accounts 20px gone", !s.includes("web-accounts-title{font-size:20px")],
  ["block title var", s.includes("--balancy-block-title-size:15px")],
  ["activity flex gap", s.includes("screen-activity.screen-active{display:flex!important;flex-direction:column!important;gap:var(--balancy-hint-gap-after)")],
  ["kind 1px important", s.includes("body.web-mode .web-op-kind-card{border-width:1px!important")],
];
for (const [n, ok] of checks) console.log(ok ? "OK" : "FAIL", n);
const i = s.indexOf("body.web-mode .web-op-kind-card{display:flex");
console.log(s.slice(i, i + 220));
