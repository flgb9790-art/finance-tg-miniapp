import fs from "node:fs";
const s = fs.readFileSync("public/mini-app/styles.css", "utf8");
const h = fs.readFileSync("public/mini-app/index.html", "utf8");
console.log("rev", h.includes("20260517ui-v12"));
console.log("transfer hint", h.includes("transferFx"));
console.log("report 14 gone", !s.includes("report-web-toolbar{background:#fff;border:1px solid rgb(15 23 42 / .08);border-radius:14px"));
console.log("transfer flex", s.includes("screen-transfer.screen-active{display:flex!important"));
console.log("buttons 10", s.includes("web-transfer-submit.primary-button{width:100%;justify-content:center;min-height:50px;border-radius:10px"));
