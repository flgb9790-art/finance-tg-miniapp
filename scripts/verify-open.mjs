import fs from "node:fs";
const js = fs.readFileSync("public/mini-app/app.js", "utf8");
const i = js.indexOf("function openScreen");
const end = js.indexOf("function ", i + 20);
const fn = js.slice(i, end);
console.log(fn.includes('t==="activity"||t==="transfer")') ? "openScreen has activity/transfer hook" : "MISSING hook");
console.log(fn.slice(-400));
