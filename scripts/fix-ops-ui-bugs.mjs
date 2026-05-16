import fs from "node:fs";

const appPath = new URL("../public/mini-app/app.js", import.meta.url);
let app = fs.readFileSync(appPath, "utf8");

if (!app.includes("${noteHtml}")) {
  app = app.replace(
    '            <div class="web-ops-op-sub">${opSub}</motion>\n          </div>',
    '            <div class="web-ops-op-sub">${opSub}</div>\n            ${noteHtml}\n          </div>'
  );
}

app = app.replaceAll("<motion ", "<div ");
app = app.replaceAll("</motion>", "</div>");

if (!app.includes('formatEntryNoteLineHtml(entry.note, "tg-ops-row-note")')) {
  app = app.replace(
    `            )}</span>
          </div>
          <div class="tg-ops-amount-stack">`,
    `            )}</span>
            \${formatEntryNoteLineHtml(entry.note, "tg-ops-row-note")}
          </div>
          <div class="tg-ops-amount-stack">`
  );
}

if (!app.includes("ops-entry-note")) {
  app = app.replace(
    `                  <div class="account-name">\${escapeHtml(entry.category?.name ?? "Без категории")}</div>
                  <div class="account-meta">
                    \${escapeHtml(entry.account?.name ?? "Счет")} · \${escapeHtml(
                      formatOperationAuthorMeta(item.createdBy, entry.occurred_at)
                    )}
                  </div>
                </div>
              </div>
              \${formatEntryAmountStackHtml(amountPrefix, entry.amount, entry.currency_code, amountClass)}`,
    `                  <div class="account-name">\${escapeHtml(entry.category?.name ?? "Без категории")}\${buildEntryPhotoChipHtml(entry, entry.id)}</div>
                  <div class="account-meta">
                    \${escapeHtml(entry.account?.name ?? "Счет")} · \${escapeHtml(
                      formatOperationAuthorMeta(item.createdBy, entry.occurred_at)
                    )}
                  </div>
                  \${entry.note ? \`<motion class="account-meta ops-entry-note">\${escapeHtml(entry.note)}</div>\` : ""}
                </div>
              </div>
              \${formatEntryAmountStackHtml(amountPrefix, entry.amount, entry.currency_code, amountClass)}`
  );
}

app = app.replaceAll("<motion ", "<div ");
app = app.replaceAll("</motion>", "</motion>");

if (!app.includes("async function refreshTgOperationsBoard(options = {})")) {
  app = app.replace(
    `async function refreshTgOperationsBoard() {
  if (useWebLoginFlow()) {
    return;
  }
  if (document.body.dataset.appActiveScreen === "transfer") {
    return;
  }
  const root = document.getElementById("tgActivityCombinedList");
  if (!root) {
    return;
  }
  if (document.body.dataset.appActiveScreen !== "ledger") {
    return;
  }
  if (!tgOpsFilterSnapshotInitialized) {
    return;
  }`,
    `async function refreshTgOperationsBoard(options = {}) {
  if (useWebLoginFlow()) {
    return;
  }
  if (document.body.dataset.appActiveScreen === "transfer") {
    return;
  }
  const root = document.getElementById("tgActivityCombinedList");
  if (!root) {
    return;
  }
  if (!options.force && document.body.dataset.appActiveScreen !== "ledger") {
    return;
  }
  if (options.force) {
    ensureTgOpsFiltersReady();
  } else if (!tgOpsFilterSnapshotInitialized) {
    return;
  }`
  );
}

if (!app.includes("if (response.entry || response.transfer)")) {
  app = app.replace(
    `  if (response.transfer) {
    mergeRecentTransfer(response.transfer);
  }

  afterBootstrapRender({`,
    `  if (response.transfer) {
    mergeRecentTransfer(response.transfer);
  }

  if (response.entry || response.transfer) {
    syncOperationsHistoryAfterMutation();
  }

  afterBootstrapRender({`
  );
}

if (!app.includes("options.syncWebOperationsHistory) {\n    syncOperationsHistoryAfterMutation();")) {
  app = app.replace(
    `  if (activeScreen === "history") {
    populateWebOperationsFilterSelects();
    if (options.syncWebOperationsHistory) {
      void refreshWebOperationsBoard();
    }
  }`,
    `  if (activeScreen === "history") {
    populateWebOperationsFilterSelects();
  }

  if (options.syncWebOperationsHistory) {
    syncOperationsHistoryAfterMutation();
  }`
  );
}

if (!app.includes("let photoWarning = \"\"")) {
  app = app.replace(
    `    if (savedEntryId) {
      if (state.entryPhotoRemoveOnSave) {
        response = await removeEntryPhotoForId(savedEntryId);
      } else if (state.entryPhotoPendingFile) {
        response = await uploadEntryPhotoForId(savedEntryId, state.entryPhotoPendingFile);
      }
    }

    resetEntryFormToDefaults();
    setStatus(isEditing ? "Операция обновлена." : "Операция сохранена.", "success");`,
    `    let photoWarning = "";

    if (savedEntryId) {
      try {
        if (state.entryPhotoRemoveOnSave) {
          response = await removeEntryPhotoForId(savedEntryId);
        } else if (state.entryPhotoPendingFile) {
          response = await uploadEntryPhotoForId(savedEntryId, state.entryPhotoPendingFile);
        }
      } catch (photoError) {
        console.error(photoError);
        photoWarning =
          photoError instanceof Error ? photoError.message : "Не удалось обновить фото";
      }
    }

    resetEntryFormToDefaults();
    setStatus(
      photoWarning
        ? \`Операция сохранена. \${photoWarning}\`
        : isEditing
          ? "Операция обновлена."
          : "Операция сохранена.",
      photoWarning ? "error" : "success"
    );`
  );
}

if (!app.includes('buildEntryPhotoChipHtml(entry, entry.id)}</strong>')) {
  app = app.replace(
    '<strong>${escapeHtml(entry.category?.name ?? "Без категории")}</strong>',
    '<strong>${escapeHtml(entry.category?.name ?? "Без категории")}${buildEntryPhotoChipHtml(entry, entry.id)}</strong>'
  );
}

app = app.replaceAll("<motion ", "<div ");
app = app.replaceAll("</motion>", "</div>");

fs.writeFileSync(appPath, app);
console.log("fixed ops ui bugs");
