import fs from "node:fs";
import path from "node:path";

const root = path.join(path.resolve(import.meta.dirname, ".."), "public", "mini-app");
const cssPath = path.join(root, "styles.css");
const jsPath = path.join(root, "app.js");

let css = fs.readFileSync(cssPath, "utf8");

css = css.replace(
  /body:not\(\.web-mode\) #screen-activity \.balancy-hint-card\[data-balancy-hint=activityForm\]\{[^}]+\}/,
  ""
);

const v14Marker = "/* ui-v14:";
if (css.includes(v14Marker)) {
  css = css.slice(0, css.indexOf(v14Marker));
} else {
  const v13Marker = "/* ui-v13:";
  if (css.includes(v13Marker)) {
    css = css.slice(0, css.indexOf(v13Marker));
  }
}

css += `
/* ui-v14 */
body:not(.web-mode) #screen-accounts .web-accounts-layout,
body:not(.web-mode) #screen-categories .web-categories-layout{display:flex;flex-direction:column}
body:not(.web-mode) #screen-accounts #webAccountsSidePanel,
body:not(.web-mode) #screen-categories #webCategoriesSidePanel{order:1}
body:not(.web-mode) #screen-accounts .web-accounts-main,
body:not(.web-mode) #screen-categories .web-categories-main{order:2}
body:not(.web-mode) .web-cat-kind-picks{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
body:not(.web-mode) .web-cat-kind-pick{display:flex;flex-direction:row;align-items:center;justify-content:space-between;gap:10px;padding:14px 16px;border-radius:10px;border:1px solid var(--line);background:#fff;text-align:left}
body:not(.web-mode) .web-cat-kind-pick-icon-ring{display:none!important}
body:not(.web-mode) .web-cat-kind-pick-copy{display:flex;flex-direction:column;gap:2px;min-width:0;flex:1 1 auto}
body:not(.web-mode) .web-cat-kind-pick-title{font-size:15px;font-weight:700;color:#0f172a}
body:not(.web-mode) .web-cat-kind-pick-desc{font-size:12px;line-height:1.35}
body:not(.web-mode) .web-cat-kind-pick-icon{flex-shrink:0;font-size:22px;font-weight:700;line-height:1}
body:not(.web-mode) .web-cat-kind-pick[data-set-category-kind=income] .web-cat-kind-pick-icon{color:#4338ca}
body:not(.web-mode) .web-cat-kind-pick[data-set-category-kind=expense] .web-cat-kind-pick-icon{color:#ef4444}
body:not(.web-mode) .web-cat-kind-pick.is-selected[data-set-category-kind=income]{border-color:#4338ca;box-shadow:0 0 0 1px #4338ca38}
body:not(.web-mode) .web-cat-kind-pick.is-selected[data-set-category-kind=expense]{border-color:#ef4444;box-shadow:0 0 0 1px #ef444438}
body:not(.web-mode) #screen-home .hero-balance-footer .hero-rates-status{color:#f1f5f9d9}
body:not(.web-mode) #screen-home .hero-balance-footer .toolbar-text-btn{background:rgb(255 255 255 / .14);border:1px solid rgb(255 255 255 / .28);color:#f8fafc}
body:not(.web-mode) #screen-home .hero-balance-footer .toolbar-text-btn:active{opacity:.88;background:rgb(255 255 255 / .22)}
body:not(.web-mode) #screen-activity .balancy-hint-card[data-balancy-hint=activityForm]{margin:0 0 var(--balancy-hint-gap-after)}
body:not(.web-mode) .tg-screen-card-head{display:flex;flex-direction:column;align-items:center;text-align:center;gap:6px;margin:0 0 16px;padding:0 2px}
body:not(.web-mode) .tg-screen-card-head .tg-screen-card-title{margin:0;font-size:18px;font-weight:700;letter-spacing:-.02em;color:#0f172a;line-height:1.2}
body:not(.web-mode) .tg-screen-card-head .tg-screen-card-sub{margin:0;font-size:13px;line-height:1.4}
body:not(.web-mode) #screen-activity .activity-form-card .section-header--telegram-only{display:none!important}
body:not(.web-mode) #screen-transfer .tg-transfer-top--outside{display:none!important}
body:not(.web-mode) #screen-transfer .web-transfer-card .tg-screen-card-head{margin-bottom:14px}
body:not(.web-mode) #screen-transfer .web-transfer-card .web-transfer-card-head{display:none!important}
`;

fs.writeFileSync(cssPath, css);

let js = fs.readFileSync(jsPath, "utf8");

if (!js.includes("syncRatesInFlight")) {
  const handleStart = js.indexOf("function setSyncRatesButtonsDisabled");
  const handleEnd = js.indexOf("function resetReportFiltersToDefaults()");
  if (handleStart < 0 || handleEnd < 0) {
    throw new Error("handleSyncRates helpers not found");
  }

  const newHandleBlock = `let syncRatesInFlight=!1;function setSyncRatesButtonsDisabled(e){document.querySelectorAll("[data-sync-rates]").forEach(u=>{u instanceof HTMLButtonElement&&(u.disabled=e)})}async function handleSyncRates(){if(syncRatesInFlight)return;syncRatesInFlight=!0,setSyncRatesButtonsDisabled(!0),setStatus("\\u041E\\u0431\\u043D\\u043E\\u0432\\u043B\\u044F\\u0435\\u043C \\u043A\\u0443\\u0440\\u0441\\u044B \\u0432\\u0430\\u043B\\u044E\\u0442..."),beginGlobalBusy("\\u0421\\u0438\\u043D\\u0445\\u0440\\u043E\\u043D\\u0438\\u0437\\u0438\\u0440\\u0443\\u0435\\u043C \\u043A\\u0443\\u0440\\u0441\\u044B\\u2026");try{const e=await apiFetch("/api/exchange-rates/sync",{method:"POST",body:JSON.stringify({})}),u=e?.ratesUpdatedAt??e?.updatedAt??null;u&&(state.summary={...state.summary??{},ratesUpdatedAt:u},renderSummary(state.summary)),setStatus("\\u041A\\u0443\\u0440\\u0441\\u044B \\u0432\\u0430\\u043B\\u044E\\u0442 \\u043E\\u0431\\u043D\\u043E\\u0432\\u043B\\u0435\\u043D\\u044B.","success"),await refreshAppData({backgroundRefresh:!0,light:!0})}catch(u){console.error(u),setStatus(u instanceof Error?u.message:"\\u041D\\u0435 \\u0443\\u0434\\u0430\\u043B\\u043E\\u0441\\u044C \\u043E\\u0431\\u043D\\u043E\\u0432\\u0438\\u0442\\u044C \\u043A\\u0443\\u0440\\u0441\\u044B","error")}finally{endGlobalBusy(),syncRatesInFlight=!1,setSyncRatesButtonsDisabled(!1)}}`;

  js = js.slice(0, handleStart) + newHandleBlock + js.slice(handleEnd);
}

const oldListener =
  'document.addEventListener("click",e=>{const u=e.target instanceof Element?e.target.closest("[data-sync-rates]"):null;u&&!u.disabled&&handleSyncRates()})';

const newListener =
  'document.addEventListener("click",e=>{const u=e.target instanceof Element?e.target.closest("[data-sync-rates]"):null;if(!u||u.disabled||syncRatesInFlight)return;e.preventDefault(),e.stopPropagation(),void handleSyncRates()})';

if (js.includes(oldListener)) {
  js = js.replace(oldListener, newListener);
} else if (!js.includes("syncRatesInFlight)return;e.preventDefault")) {
  throw new Error("sync rates listener anchor not found");
}

fs.writeFileSync(jsPath, js);
console.log("Patched ui-v14");
