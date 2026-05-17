import fs from "node:fs";
const s = fs.readFileSync("public/mini-app/app.js", "utf8");
const i = s.indexOf("function openScreen");
console.log(s.slice(i, i + 1200));
