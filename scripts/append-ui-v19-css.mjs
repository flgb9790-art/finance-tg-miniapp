import fs from "node:fs";
import path from "node:path";

const stylesPath = path.join(path.resolve(import.meta.dirname, ".."), "public/mini-app/styles.css");
const v19 = `/* ui-v19 */
body.web-mode .web-home-dash-top>.balancy-home-hints-grid{grid-column:1/-1;width:100%!important;max-width:100%!important;margin:0 0 var(--balancy-hint-gap-after,12px)!important}
body.web-mode .balancy-home-hints-grid:not([hidden]){display:grid!important}
body.web-mode .web-sidebar-top{overflow:visible!important;padding-top:6px!important;padding-bottom:4px!important}
body.web-mode .web-sidebar-brand{overflow:visible!important;align-items:center!important;padding:10px 10px!important;margin:-8px -10px!important}
body.web-mode .web-sidebar-brand .brand-wordmark{display:inline-block!important;font-size:20px!important;font-weight:780!important;line-height:1.28!important;padding:3px 0 5px!important;letter-spacing:-.04em!important;background-size:100% 100%!important;-webkit-box-decoration-break:clone;box-decoration-break:clone}
body.web-mode .web-sidebar-brand .brand-wordmark:before{content:none!important}
@media (min-width:1279px){body.web-mode .web-profile-menu--sidebar .web-profile-dropdown{position:absolute!important;left:0!important;right:0!important;top:calc(100% + 8px)!important;width:100%!important;min-width:0!important;max-width:none!important;box-sizing:border-box!important}}
`;

let styles = fs.readFileSync(stylesPath, "utf8");
if (styles.includes("/* ui-v19 */")) {
  styles = styles.replace(/\/\* ui-v19 \*\/[\s\S]*$/, v19.trimEnd());
} else {
  styles += v19;
}
styles = styles.replace(
  /@media\(max-width:1278px\)and \(min-width:901px\)\{body\.web-mode \.web-profile-menu--sidebar \.web-profile-dropdown\{width:min\(280px,calc\(100vw - 24px\)\);min-width:248px;max-width:calc\(100vw - 24px\);position:fixed\}\}/,
  "",
);
fs.writeFileSync(stylesPath, styles);
console.log("ui-v19 css appended");
