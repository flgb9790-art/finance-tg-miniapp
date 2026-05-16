import fs from "node:fs";

const appPath = new URL("../public/mini-app/app.js", import.meta.url);
let app = fs.readFileSync(appPath, "utf8");

if (app.includes("account-meta ops-entry-note")) {
  console.log("already fixed");
  process.exit(0);
}

const old = `                  <div class="account-name">\${escapeHtml(entry.category?.name ?? "Без категории")}</div>
                  <div class="account-meta">
                    \${escapeHtml(entry.account?.name ?? "Счет")} · \${escapeHtml(
                      formatOperationAuthorMeta(item.createdBy, entry.occurred_at)
                    )}
                  </div>
                </div>
              </div>
              \${formatEntryAmountStackHtml(amountPrefix, entry.amount, entry.currency_code, amountClass)}`;

const neu = `                  <motion class="account-name">\${escapeHtml(entry.category?.name ?? "Без категории")}\${buildEntryPhotoChipHtml(entry, entry.id)}</div>
                  <div class="account-meta">
                    \${escapeHtml(entry.account?.name ?? "Счет")} · \${escapeHtml(
                      formatOperationAuthorMeta(item.createdBy, entry.occurred_at)
                    )}
                  </div>
                  \${entry.note ? \`<div class="account-meta ops-entry-note">\${escapeHtml(entry.note)}</div>\` : ""}
                </div>
              </div>
              \${formatEntryAmountStackHtml(amountPrefix, entry.amount, entry.currency_code, amountClass)}`;

const fixed = neu.replaceAll("<motion ", "<div ").replaceAll("</motion>", "</div>");

if (!app.includes(old)) {
  console.log("pattern not found");
  process.exit(1);
}

app = app.replace(old, fixed);
fs.writeFileSync(appPath, app);
console.log("fixed recent activity list");
