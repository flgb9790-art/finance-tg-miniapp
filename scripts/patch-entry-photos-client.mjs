import fs from "node:fs";

const appPath = new URL("../public/mini-app/app.js", import.meta.url);
let app = fs.readFileSync(appPath, "utf8");

if (app.includes("function syncEntryPhotoChrome")) {
  console.log("app.js already patched");
  process.exit(0);
}

app = app.replace(
  "  editingTransferId: null,",
  `  editingTransferId: null,
  entryPhotoPendingFile: null,
  entryPhotoRemoveOnSave: false,
  entryPhotoPreviewObjectUrl: null,
  entryPhotoExistingViewUrl: null,`
);

const photoHelpers = `
function getEntryPhotoViewUrl(entry) {
  if (!entry || typeof entry !== "object") {
    return "";
  }

  return String(entry.photoViewUrl ?? entry.photo_url ?? "").trim();
}

function revokeEntryPhotoPreviewObjectUrl() {
  if (state.entryPhotoPreviewObjectUrl) {
    try {
      URL.revokeObjectURL(state.entryPhotoPreviewObjectUrl);
    } catch {
      //
    }
    state.entryPhotoPreviewObjectUrl = null;
  }
}

function resetEntryPhotoFormState() {
  state.entryPhotoPendingFile = null;
  state.entryPhotoRemoveOnSave = false;
  state.entryPhotoExistingViewUrl = null;
  revokeEntryPhotoPreviewObjectUrl();
  syncEntryPhotoChrome();
}

function syncEntryPhotoChrome() {
  const preview = document.getElementById("entryPhotoPreview");
  const previewImg = document.getElementById("entryPhotoPreviewImg");
  const pickButton = document.getElementById("entryPhotoPickButton");
  const removeButton = document.getElementById("entryPhotoRemoveButton");
  const viewButton = document.getElementById("entryPhotoViewButton");

  const pendingUrl = state.entryPhotoPreviewObjectUrl;
  const existingUrl =
    !state.entryPhotoRemoveOnSave && !state.entryPhotoPendingFile
      ? state.entryPhotoExistingViewUrl
      : "";
  const displayUrl = pendingUrl || existingUrl || "";

  if (preview instanceof HTMLElement) {
    preview.hidden = !displayUrl;
  }

  if (previewImg instanceof HTMLImageElement) {
    previewImg.src = displayUrl || "";
  }

  const hasPhoto = Boolean(displayUrl);
  const hasPending = Boolean(state.entryPhotoPendingFile);

  if (removeButton instanceof HTMLButtonElement) {
    removeButton.hidden = !(hasPhoto || hasPending);
  }

  if (viewButton instanceof HTMLButtonElement) {
    viewButton.hidden = !hasPhoto;
  }

  if (pickButton instanceof HTMLButtonElement) {
    pickButton.textContent = hasPhoto ? "Заменить фото" : "Прикрепить фото";
  }
}

async function compressEntryPhotoFile(file) {
  if (!(file instanceof File)) {
    throw new Error("Выберите изображение");
  }

  if (!String(file.type ?? "").startsWith("image/")) {
    throw new Error("Можно прикрепить только изображение");
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Размер фото не должен превышать 5 МБ");
  }

  if (typeof createImageBitmap !== "function" || typeof document === "undefined") {
    return file;
  }

  try {
    const bitmap = await createImageBitmap(file);
    const maxSide = 1400;
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      bitmap.close?.();
      return file;
    }

    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();

    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (result) => {
          if (result) {
            resolve(result);
            return;
          }

          reject(new Error("Не удалось сжать изображение"));
        },
        "image/jpeg",
        0.86
      );
    });

    return new File([blob], (file.name || "receipt").replace(/\\.[^.]+$/, "") + ".jpg", {
      type: "image/jpeg"
    });
  } catch {
    return file;
  }
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Не удалось прочитать файл"));
    reader.readAsDataURL(file);
  });
}

async function uploadEntryPhotoForId(entryId, file) {
  const compressed = await compressEntryPhotoFile(file);
  const imageBase64 = await readFileAsDataUrl(compressed);

  return apiFetch(\`/api/entries/\${encodeURIComponent(entryId)}/photo\`, {
    method: "POST",
    body: JSON.stringify({
      imageBase64,
      contentType: compressed.type || "image/jpeg"
    })
  });
}

async function removeEntryPhotoForId(entryId) {
  return apiFetch(\`/api/entries/\${encodeURIComponent(entryId)}/photo\`, {
    method: "DELETE"
  });
}

function openEntryPhotoViewer(url) {
  const modal = document.getElementById("entryPhotoModal");
  const img = document.getElementById("entryPhotoModalImg");
  const cleanUrl = String(url ?? "").trim();

  if (!modal || !img || !cleanUrl) {
    return;
  }

  img.src = cleanUrl;
  modal.hidden = false;
}

function closeEntryPhotoViewer() {
  const modal = document.getElementById("entryPhotoModal");
  const img = document.getElementById("entryPhotoModalImg");

  if (modal) {
    modal.hidden = true;
  }

  if (img instanceof HTMLImageElement) {
    img.removeAttribute("src");
  }
}

function buildEntryPhotoChipHtml(entry, entryId) {
  const url = getEntryPhotoViewUrl(entry);

  if (!url) {
    return "";
  }

  return \`<button type="button" class="entry-photo-chip" data-entry-photo-view="\${escapeHtml(url)}" title="Открыть фото чека" aria-label="Открыть фото чека">📷</button>\`;
}

function attachEntryPhotoChrome() {
  if (window.__balancyEntryPhotoChromeAttached) {
    return;
  }

  window.__balancyEntryPhotoChromeAttached = true;

  const input = document.getElementById("entryPhotoInput");
  const pickButton = document.getElementById("entryPhotoPickButton");
  const removeButton = document.getElementById("entryPhotoRemoveButton");
  const viewButton = document.getElementById("entryPhotoViewButton");
  const modalBackdrop = document.getElementById("entryPhotoModalBackdrop");
  const modalClose = document.getElementById("entryPhotoModalClose");

  pickButton?.addEventListener("click", () => {
    input?.click();
  });

  input?.addEventListener("change", () => {
    const file = input.files?.[0] ?? null;

    if (!(file instanceof File)) {
      return;
    }

    void (async () => {
      try {
        const compressed = await compressEntryPhotoFile(file);
        revokeEntryPhotoPreviewObjectUrl();
        state.entryPhotoPendingFile = compressed;
        state.entryPhotoRemoveOnSave = false;
        state.entryPhotoPreviewObjectUrl = URL.createObjectURL(compressed);
        syncEntryPhotoChrome();
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "Не удалось обработать фото", "error");
      } finally {
        input.value = "";
      }
    })();
  });

  removeButton?.addEventListener("click", () => {
    revokeEntryPhotoPreviewObjectUrl();
    state.entryPhotoPendingFile = null;
    state.entryPhotoRemoveOnSave = Boolean(state.entryPhotoExistingViewUrl);
    syncEntryPhotoChrome();
  });

  viewButton?.addEventListener("click", () => {
    const url =
      state.entryPhotoPreviewObjectUrl ||
      (!state.entryPhotoRemoveOnSave ? state.entryPhotoExistingViewUrl : "");

    openEntryPhotoViewer(url);
  });

  modalBackdrop?.addEventListener("click", closeEntryPhotoViewer);
  modalClose?.addEventListener("click", closeEntryPhotoViewer);

  document.addEventListener("click", (event) => {
    const target = event.target;

    if (!(target instanceof Element)) {
      return;
    }

    const photoButton = target.closest("[data-entry-photo-view]");

    if (photoButton) {
      event.preventDefault();
      event.stopPropagation();
      openEntryPhotoViewer(photoButton.getAttribute("data-entry-photo-view"));
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") {
      return;
    }

    const modal = document.getElementById("entryPhotoModal");

    if (modal && !modal.hidden) {
      closeEntryPhotoViewer();
    }
  });
}

`;

app = app.replace("function resetEntryFormToDefaults() {", photoHelpers + "function resetEntryFormToDefaults() {");

app = app.replace(
  "  state.editingEntryId = null;\n  entryForm.reset();",
  "  state.editingEntryId = null;\n  resetEntryPhotoFormState();\n  entryForm.reset();"
);

app = app.replace(
  `  if (noteInput instanceof HTMLInputElement) {
    noteInput.value = entry.note ?? "";
  }
  syncWebEntryKindCardsFromSelect();`,
  `  if (noteInput instanceof HTMLInputElement) {
    noteInput.value = entry.note ?? "";
  }
  resetEntryPhotoFormState();
  state.entryPhotoExistingViewUrl = getEntryPhotoViewUrl(entry);
  syncEntryPhotoChrome();
  syncWebEntryKindCardsFromSelect();`
);

app = app.replace(
  '            <div class="web-ops-op-title">${opTitle}</div>',
  '            <div class="web-ops-op-title">${opTitle}${buildEntryPhotoChipHtml(e, e.id)}</div>'
);

app = app.replace(
  '            <span class="tg-ops-row-title">${escapeHtml(catName)}</span>',
  '            <span class="tg-ops-row-title">${escapeHtml(catName)}${buildEntryPhotoChipHtml(entry, entry.id)}</span>'
);

app = app.replace(
  `    const response = await apiFetch(
      isEditing
        ? \`/api/entries/\${encodeURIComponent(state.editingEntryId)}\`
        : "/api/entries",
      {
        method: isEditing ? "PATCH" : "POST",
        body: JSON.stringify(payload)
      }
    );

    resetEntryFormToDefaults();`,
  `    let response = await apiFetch(
      isEditing
        ? \`/api/entries/\${encodeURIComponent(state.editingEntryId)}\`
        : "/api/entries",
      {
        method: isEditing ? "PATCH" : "POST",
        body: JSON.stringify(payload)
      }
    );

    const savedEntryId = String(
      response?.entry?.id ?? (isEditing ? state.editingEntryId : "") ?? ""
    ).trim();

    if (savedEntryId) {
      if (state.entryPhotoRemoveOnSave) {
        response = await removeEntryPhotoForId(savedEntryId);
      } else if (state.entryPhotoPendingFile) {
        response = await uploadEntryPhotoForId(savedEntryId, state.entryPhotoPendingFile);
      }
    }

    resetEntryFormToDefaults();`
);

app = app.replace(
  "attachOperationsActionsListener();\nattachCategoryListsListener();",
  "attachOperationsActionsListener();\nattachEntryPhotoChrome();\nattachCategoryListsListener();"
);

fs.writeFileSync(appPath, app);
console.log("patched app.js for entry photos");
