import fs from "node:fs";
const s = fs.readFileSync("public/mini-app/app.js", "utf8");
const i = s.indexOf("function renderAll");
console.log(s.slice(i, i + 2500));
