import fs from "node:fs";
import path from "node:path";

const root = path.join(path.resolve(import.meta.dirname, ".."), "public", "mini-app");
const cssPath = path.join(root, "styles.css");
const htmlPath = path.join(root, "index.html");
const jsPath = path.join(root, "app.js");

let css = fs.readFileSync(cssPath, "utf8");

css = css.replaceAll(
  "#screen-transfer.screen-active>:not(.web-transfer-layout){display:none!important}",
  "#screen-transfer.screen-active>:not(.web-transfer-layout):not(.balancy-hint-card){display:none!important}"
);

const v13Marker = "/* ui-v13:";
if (css.includes(v13Marker)) {
  css = css.slice(0, css.indexOf(v13Marker));
} else {
  const v12Marker = "/* ui-v12:";
  if (css.includes(v12Marker)) {
    css = css.slice(0, css.indexOf(v12Marker));
  }
}

css += `
/* ui-v13 */
body.web-mode .web-accounts-form-grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
body.web-mode .web-accounts-form-grid>.web-accounts-field:first-child{grid-column:1/-1}
@media (max-width:900px){
  body.web-mode .web-accounts-form-grid{grid-template-columns:1fr}
  body.web-mode .web-accounts-form-grid>.web-accounts-field:first-child{grid-column:auto}
}
.hero-balance-footer{display:flex;align-items:flex-end;justify-content:space-between;gap:10px;margin-top:14px;flex-wrap:wrap;width:100%}
.hero-balance-footer .hero-rates-status{flex:1 1 140px;min-width:0;margin:0;font-size:11px;line-height:1.35}
.hero-balance-footer .hero-rates-actions{display:flex;align-items:center;gap:8px;flex-shrink:0;margin-left:auto}
body.web-mode .hero-balance-card.web-dash-hero .hero-balance-footer{margin-top:16px;padding-top:2px}
body:not(.web-mode) .hero-balance-card .hero-balance-footer{margin-top:12px}
body.web-mode[data-app-active-screen=home] .web-home-col-card .section-footer-note{display:none!important}
`;

fs.writeFileSync(cssPath, css);

let html = fs.readFileSync(htmlPath, "utf8");

const heroInsertBefore = `                </motion>
              </motion>
            </section>

            <section class="card tg-home-quick-actions tg-only-block" aria-label="Быстрые действия">`.replaceAll(
  "motion",
  "div"
);

const heroFooter = `              <div class="hero-balance-footer" aria-label="Курсы валют">
                <p id="ratesStatusText" class="muted secondary-status hero-rates-status">
                  Курсы валют еще не синхронизированы
                </p>
                <div class="toolbar-actions-row hero-rates-actions">
                  <button
                    id="syncRatesButton"
                    class="toolbar-text-btn"
                    type="button"
                    data-sync-rates
                    title="Загрузить курсы валют"
                  >
                    Курсы
                  </button>
                  <button
                    class="toolbar-text-btn"
                    data-refresh-action="true"
                    type="button"
                    title="Обновить данные приложения"
                  >
                    Обновить
                  </button>
                </div>
              </div>
`;

if (!html.includes("hero-balance-footer")) {
  if (!html.includes(heroInsertBefore)) {
    throw new Error("hero insert anchor not found");
  }
  html = html.replace(
    heroInsertBefore,
    `                </motion>
              </motion>
${heroFooter}
            </section>

            <section class="card tg-home-quick-actions tg-only-block" aria-label="Быстрые действия">`.replaceAll("motion", "div")
  );
}

const accountsRatesFooter = `              <div class="section-footer-note">
                <div class="section-footer-actions">
                  <p id="ratesStatusText" class="muted secondary-status">
                    Курсы валют еще не синхронизированы
                  </p>
                  <div class="toolbar-actions-row">
                    <button
                      id="syncRatesButton"
                      class="toolbar-text-btn"
                      type="button"
                      title="Загрузить курсы валют"
                    >
                      Курсы
                    </button>
                    <button
                      class="toolbar-text-btn"
                      data-refresh-action="true"
                      type="button"
                      title="Обновить данные приложения"
                    >
                      Обновить
                    </button>
                  </div>
                </div>
              </div>
`;

if (html.includes(accountsRatesFooter)) {
  html = html.replace(accountsRatesFooter, "");
}

html = html.replace(
  `Если валюты счетов разные, сумма зачисления рассчитывается по актуальному курсу из приложения (курсы
                синхронизируются на главной, кнопка «Курсы»). Нужна точная сумма зачисления — укажите её вручную в поле
                «Сумма зачисления».`,
  `Если валюты счетов разные, сумма зачисления рассчитывается по актуальному курсу из приложения (кнопка
                «Курсы» в блоке «Общий баланс» на главной). Нужна точная сумма зачисления — укажите её вручную в поле
                «Сумма зачисления».`
);

html = html.replace(
  /BALANCY_CLIENT_ASSET_REV = "20260517ui-v\d+"/,
  'BALANCY_CLIENT_ASSET_REV = "20260517ui-v13"'
);

fs.writeFileSync(htmlPath, html);

let js = fs.readFileSync(jsPath, "utf8");

if (!js.includes("function setSyncRatesButtonsDisabled")) {
  const handleStart = js.indexOf("async function handleSyncRates()");
  const handleEnd = js.indexOf("function resetReportFiltersToDefaults()");
  if (handleStart < 0 || handleEnd < 0) {
    throw new Error("handleSyncRates block not found");
  }
  const newHandle =
    'function setSyncRatesButtonsDisabled(e){document.querySelectorAll("[data-sync-rates]").forEach(u=>{u instanceof HTMLButtonElement&&(u.disabled=e)})}async function handleSyncRates(){setSyncRatesButtonsDisabled(!0),setStatus("\\u041E\\u0431\\u043D\\u043E\\u0432\\u043B\\u044F\\u0435\\u043C \\u043A\\u0443\\u0440\\u0441\\u044B \\u0432\\u0430\\u043B\\u044E\\u0442..."),beginGlobalBusy("\\u0421\\u0438\\u043D\\u0445\\u0440\\u043E\\u043D\\u0438\\u0437\\u0438\\u0440\\u0443\\u0435\\u043C \\u043A\\u0443\\u0440\\u0441\\u044B\\u2026");try{const e=await apiFetch("/api/exchange-rates/sync",{method:"POST",body:JSON.stringify({})}),u=e?.ratesUpdatedAt??null;u&&(state.summary={...state.summary??{},ratesUpdatedAt:u},renderSummary(state.summary)),setStatus("\\u041A\\u0443\\u0440\\u0441\\u044B \\u0432\\u0430\\u043B\\u044E\\u0442 \\u043E\\u0431\\u043D\\u043E\\u0432\\u043B\\u0435\\u043D\\u044B.","success"),await refreshAppData({backgroundRefresh:!0,light:!0})}catch(u){console.error(u),setStatus(u instanceof Error?u.message:"\\u041D\\u0435 \\u0443\\u0434\\u0430\\u043B\\u043E\\u0441\\u044C \\u043E\\u0431\\u043D\\u043E\\u0432\\u0438\\u0442\\u044C \\u043A\\u0443\\u0440\\u0441\\u044B","error")}finally{endGlobalBusy(),setSyncRatesButtonsDisabled(!1)}}';
  js = js.slice(0, handleStart) + newHandle + js.slice(handleEnd);
}

const oldListener =
  'syncRatesButton&&syncRatesButton.addEventListener("click",()=>{handleSyncRates()})';

const newListener =
  'document.addEventListener("click",e=>{const u=e.target instanceof Element?e.target.closest("[data-sync-rates]"):null;u&&!u.disabled&&handleSyncRates()})';

if (js.includes(oldListener)) {
  js = js.replace(oldListener, newListener);
} else if (!js.includes('closest("[data-sync-rates]")')) {
  throw new Error("sync rates listener anchor not found");
}

fs.writeFileSync(jsPath, js);
console.log("Patched ui-v13");
