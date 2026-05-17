import fs from "node:fs";
const s = fs.readFileSync("public/mini-app/app.js", "utf8");
let i = s.indexOf("function openScreen");
const end = s.indexOf("function ", i + 20);
console.log(s.slice(i, end));
