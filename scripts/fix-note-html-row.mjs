import fs from "node:fs";

const appPath = new URL("../public/mini-app/app.js", import.meta.url);
let app = fs.readFileSync(appPath, "utf8");

if (!app.includes("${noteHtml}\n          </div>")) {
  const webFrom = [
    '            <motion class="web-ops-op-sub">${opSub}</motion>',
    "          </motion>",
    "        </motion>",
    "      </td>",
    "      <td>${acc}</td>"
  ].join("\n");

  const webTo = [
    '            <motion class="web-ops-op-sub">${opSub}</motion>',
    "            ${noteHtml}",
    "          </motion>",
    "        </motion>",
    "      </td>",
    "      <td>${acc}</td>"
  ].join("\n");

  const from = webFrom.replaceAll("<motion ", "<div ").replaceAll("</motion>", "</div>");
  const to = webTo.replaceAll("<motion ", "<div ").replaceAll("</motion>", "</div>");

  if (app.includes(from)) {
    app = app.replace(from, to);
    console.log("fixed web row");
  } else {
    console.log("web row pattern missing");
  }
}

if (!app.includes("ops-entry-note")) {
  const recentFrom = [
    '                  <motion class="account-name">${escapeHtml(entry.category?.name ?? "Без категории")}</motion>',
    '                  <motion class="account-meta">',
    '                    ${escapeHtml(entry.account?.name ?? "Счет")} · ${escapeHtml(',
    "                      formatOperationAuthorMeta(item.createdBy, entry.occurred_at)",
    "                    )}",
    "                  </motion>",
    "                </motion>",
    "              </motion>",
    "              ${formatEntryAmountStackHtml(amountPrefix, entry.amount, entry.currency_code, amountClass)}"
  ].join("\n");

  const recentTo = [
    '                  <motion class="account-name">${escapeHtml(entry.category?.name ?? "Без категории")}${buildEntryPhotoChipHtml(entry, entry.id)}</motion>',
    '                  <motion class="account-meta">',
    '                    ${escapeHtml(entry.account?.name ?? "Счет")} · ${escapeHtml(',
    "                      formatOperationAuthorMeta(item.createdBy, entry.occurred_at)",
    "                    )}",
    "                  </motion>",
    '                  ${entry.note ? `<motion class="account-meta ops-entry-note">${escapeHtml(entry.note)}</motion>` : ""}',
    "                </motion>",
    "              </motion>",
    "              ${formatEntryAmountStackHtml(amountPrefix, entry.amount, entry.currency_code, amountClass)}"
  ].join("\n");

  const from = recentFrom.replaceAll("<motion ", "<motion ").replaceAll("</motion>", "</div>");
  const to = recentTo.replaceAll("<motion ", "<div ").replaceAll("</motion>", "</motion>");

  if (app.includes(from)) {
    app = app.replace(from, to.replaceAll("</motion>", "</motion>"));
    console.log("fixed recent activity");
  } else {
    console.log("recent activity pattern missing");
  }
}

app = app.replaceAll("<motion ", "<div ");
app = app.replaceAll("</motion>", "</div>");

fs.writeFileSync(appPath, app);
