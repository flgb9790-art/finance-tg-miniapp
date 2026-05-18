import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "public/mini-app/app.js"
);

const helpers = `function resolveDisplayCurrencyCode(e,u){const t=String(e??"").trim().toUpperCase(),n=String(u??"").trim();return n==="crypto"&&(t==="USD"||!t)?"USDT":t||"USD"}function resolveAccountDisplayCurrency(e){return e?resolveDisplayCurrencyCode(e.currency_code,e.type):"USD"}function resolveEntryDisplayCurrency(e){if(!e)return"USD";const u=e.account,t=u?.type??state.accounts?.find(n=>n.id===e.account_id)?.type??"";return resolveDisplayCurrencyCode(e.currency_code??u?.currency_code,t)}function readAccountFormCurrencyCode(e){const u=String(e.get("type")??"cash");if(u==="crypto")return"USDT";const t=currencyInput instanceof HTMLSelectElement?currencyInput.value.trim().toUpperCase():"";return t||String(e.get("currencyCode")??"").trim().toUpperCase()||"USD"}`;

let appJs = fs.readFileSync(appPath, "utf8");

if (!appJs.includes("resolveDisplayCurrencyCode")) {
  appJs = appJs.replace(
    'function formatMoney(e,u=""){const t=formatMoneyAmount(e);return u?`${t} ${u}`:t}',
    `function formatMoney(e,u=""){const t=formatMoneyAmount(e);return u?\`\${t} \${u}\`:t}${helpers}`
  );
}

appJs = appJs.replace(
  'currencyCode:String(u.get("currencyCode")??"USD")',
  "currencyCode:readAccountFormCurrencyCode(u)"
);

const accountReplacements = [
  ["formatCurrencyLineFromCode(n.currency_code)", "formatCurrencyLineFromCode(resolveAccountDisplayCurrency(n))"],
  ["formatMoney(n.balance,n.currency_code)", "formatMoney(n.balance,resolveAccountDisplayCurrency(n))"],
  ['escapeHtml(n.name)} \xB7 ${escapeHtml(n.currency_code)}', 'escapeHtml(n.name)} \xB7 ${escapeHtml(resolveAccountDisplayCurrency(n))}'],
  ['account-balance-currency">${escapeHtml(n.currency_code)}', 'account-balance-currency">${escapeHtml(resolveAccountDisplayCurrency(n))}'],
  ['data-currency="${escapeHtml(n.currency_code)}"', 'data-currency="${escapeHtml(resolveAccountDisplayCurrency(n))}"'],
  ['escapeHtml(o.name)} \xB7 ${escapeHtml(o.currency_code)}</option>', 'escapeHtml(o.name)} \xB7 ${escapeHtml(resolveAccountDisplayCurrency(o))}</option>']
];

for (const [from, to] of accountReplacements) {
  if (appJs.includes(from)) {
    appJs = appJs.split(from).join(to);
  } else {
    console.warn("skip (not found):", from.slice(0, 80));
  }
}

const entryReplacements = [
  ["formatEntryAmountStackHtml(t,e.amount,e.currency_code,n)", "formatEntryAmountStackHtml(t,e.amount,resolveEntryDisplayCurrency(e),n)"],
  ["p=escapeHtml(i.currency_code||\"\")", "p=escapeHtml(resolveEntryDisplayCurrency(i)||\"\")"],
  ["y=escapeHtml(s.currency_code??\"\")", "y=escapeHtml(resolveEntryDisplayCurrency(s)??\"\")"],
  ['n=String(t.currency_code??"").trim()', "n=resolveEntryDisplayCurrency(t)"]
];

for (const [from, to] of entryReplacements) {
  if (appJs.includes(from)) {
    appJs = appJs.split(from).join(to);
  } else {
    console.warn("skip (not found):", from.slice(0, 80));
  }
}

fs.writeFileSync(appPath, appJs);
console.log("patch-usdt-display applied");
