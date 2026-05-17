import fs from "node:fs";
const s = fs.readFileSync("public/mini-app/app.js", "utf8");
const i = s.indexOf('safeRenderStep("webActivityRecent"');
console.log(s.slice(i - 300, i + 400));
