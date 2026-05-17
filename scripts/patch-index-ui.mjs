import fs from "node:fs";
import path from "node:path";

const htmlPath = path.join(path.resolve(import.meta.dirname, ".."), "public", "mini-app", "index.html");
let html = fs.readFileSync(htmlPath, "utf8");

function replaceSlice(startNeedle, endNeedle, replacement) {
  const start = html.indexOf(startNeedle);
  if (start < 0) {
    return false;
  }
  const end = html.indexOf(endNeedle, start);
  if (end < 0 || end <= start) {
    return false;
  }
  html = html.slice(0, start) + replacement + html.slice(end);
  return true;
}

replaceSlice(
  `              <label class="web-op-field-span-2">
                <span>Комментарий</span>
                <input
                  id="entryNoteInput"
                  name="note"
                  placeholder="Добавьте комментарий (необязательно)"
                  type="text"
                />
              </label>

              <motion class="entry-photo-field web-op-field-span-2" hidden aria-hidden="true">`.replace(
    "<motion",
    "<motion"
  ),
  `              <div class="web-op-form-actions">`,
  `              <label class="web-op-field-span-2 web-op-comment-with-attach">
                <span>Комментарий</span>
                <motion class="web-op-comment-attach-row">
                  <input
                    id="entryNoteInput"
                    name="note"
                    placeholder="Добавьте комментарий (необязательно)"
                    type="text"
                  />
                  <input
                    id="entryPhotoInput"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/*"
                    capture="environment"
                    hidden
                  />
                  <button
                    type="button"
                    id="entryPhotoPickButton"
                    class="balancy-attach-btn"
                    aria-label="Прикрепить фото"
                    title="Прикрепить фото"
                  ></button>
                </motion>
                <div class="entry-photo-actions entry-photo-actions--secondary">
                  <button type="button" id="entryPhotoRemoveButton" class="ghost-button" hidden>
                    Убрать фото
                  </button>
                  <button type="button" id="entryPhotoViewButton" class="ghost-button" hidden>
                    Открыть
                  </button>
                </div>
                <div id="entryPhotoPreview" class="entry-photo-preview" hidden>
                  <img id="entryPhotoPreviewImg" alt="Превью чека" />
                </div>
              </label>

              <motion class="web-op-form-actions">`.replaceAll("<motion", "<div").replaceAll("</motion>", "</motion>")
);

// Fallback if legacy hidden block still present
if (html.includes("entryPhotoInput-legacy")) {
  replaceSlice(
    `              <label class="web-op-field-span-2">
                <span>Комментарий</span>`,
    `              <motion class="web-op-form-actions">`.replace("<motion", "<div"),
    `              <label class="web-op-field-span-2 web-op-comment-with-attach">
                <span>Комментарий</span>
                <div class="web-op-comment-attach-row">
                  <input
                    id="entryNoteInput"
                    name="note"
                    placeholder="Добавьте комментарий (необязательно)"
                    type="text"
                  />
                  <input
                    id="entryPhotoInput"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/*"
                    capture="environment"
                    hidden
                  />
                  <button
                    type="button"
                    id="entryPhotoPickButton"
                    class="balancy-attach-btn"
                    aria-label="Прикрепить фото"
                    title="Прикрепить фото"
                  ></button>
                </div>
                <div class="entry-photo-actions entry-photo-actions--secondary">
                  <button type="button" id="entryPhotoRemoveButton" class="ghost-button" hidden>
                    Убрать фото
                  </button>
                  <button type="button" id="entryPhotoViewButton" class="ghost-button" hidden>
                    Открыть
                  </button>
                </motion>
                <div id="entryPhotoPreview" class="entry-photo-preview" hidden>
                  <img id="entryPhotoPreviewImg" alt="Превью чека" />
                </div>
              </label>

              <div class="web-op-form-actions">`.replaceAll("<motion", "<div").replaceAll("</motion>", "</motion>")
  );
}

if (!html.includes("web-transfer-amounts-grid")) {
  replaceSlice(
    `                <label class="web-transfer-field web-transfer-field--amount">`,
    `                <label class="web-transfer-field">
                  <span>Дата и время`,
    `                <div class="web-transfer-amounts-grid">
                  <label class="web-transfer-field web-transfer-field--amount">
                    <span>Сумма перевода <span class="web-op-req" aria-hidden="true">*</span></span>
                    <motion class="web-transfer-amount-row">
                      <input
                        id="transferFromAmountInput"
                        min="0.01"
                        name="fromAmount"
                        placeholder="0.00"
                        required
                        step="0.01"
                        type="number"
                        class="web-transfer-amount-input"
                      />
                      <span id="webTransferAmountCurrencyBadge" class="web-transfer-currency-badge">USD</span>
                    </motion>
                    <p id="transferFromMinHint" class="tg-transfer-min-hint muted"></p>
                  </label>

                  <label class="web-transfer-secondary-amount">
                    <span>Сумма зачисления</span>
                    <div class="web-transfer-amount-row web-transfer-amount-row--to">
                      <input
                        id="transferToAmountInput"
                        min="0.01"
                        name="toAmount"
                        placeholder="Оставьте пустым для автоконвертации"
                        step="0.01"
                        type="number"
                        class="web-transfer-amount-input"
                      />
                      <span id="webTransferToAmountCurrencyBadge" class="web-transfer-currency-badge">USD</span>
                    </div>
                    <p id="transferRateHint" class="tg-transfer-rate-hint muted" hidden>
                      <span id="transferRateHintText"></span>
                    </p>
                  </label>
                </div>

                <label class="web-transfer-field">
                  <span>Дата и время`.replaceAll("<motion", "<motion").replaceAll("</motion>", "</motion>")
  );
}

replaceSlice(
  `                <label class="web-transfer-field">
                  <span>Комментарий</span>
                  <input id="transferNoteInput" name="note" placeholder="Необязательно" type="text" />
                </label>

                <div class="entry-photo-field web-transfer-photo-field">`,
  `                <div class="tg-transfer-security tg-only-block" role="status">`,
  `                <label class="web-transfer-field web-transfer-field--comment">
                  <span>Комментарий</span>
                  <div class="web-op-comment-attach-row">
                    <input id="transferNoteInput" name="note" placeholder="Необязательно" type="text" />
                    <input
                      id="transferPhotoInput"
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/*"
                      capture="environment"
                      hidden
                    />
                    <button
                      type="button"
                      id="transferPhotoPickButton"
                      class="balancy-attach-btn"
                      aria-label="Прикрепить фото"
                      title="Прикрепить фото"
                    ></button>
                  </div>
                  <div class="entry-photo-actions entry-photo-actions--secondary">
                    <button type="button" id="transferPhotoRemoveButton" class="ghost-button" hidden>
                      Убрать фото
                    </button>
                    <button type="button" id="transferPhotoViewButton" class="ghost-button" hidden>
                      Открыть
                    </button>
                  </div>
                  <div id="transferPhotoPreview" class="entry-photo-preview" hidden>
                    <img id="transferPhotoPreviewImg" alt="Превью вложения" />
                  </div>
                </label>

                <div class="tg-transfer-security tg-only-block" role="status">`
);

fs.writeFileSync(htmlPath, html);
console.log("Patched index.html");
