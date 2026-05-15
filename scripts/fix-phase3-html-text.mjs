import fs from "node:fs";

const p = "public/mini-app/index.html";
let h = fs.readFileSync(p, "utf8");
const t = "div";

const block = `        <h1 id="webModeChoiceTitle" class="web-mode-choice-title">\u041a\u0430\u043a \u0431\u0443\u0434\u0435\u0442\u0435 \u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u044c\u0441\u044f?</h1>
        <p class="web-mode-choice-lede muted">\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u0440\u0435\u0436\u0438\u043c. \u041f\u043e\u0437\u0436\u0435 \u043c\u043e\u0436\u043d\u043e \u043f\u0435\u0440\u0435\u043a\u043b\u044e\u0447\u0438\u0442\u044c\u0441\u044f \u0432 \u043f\u0440\u043e\u0444\u0438\u043b\u0435 \u0432\u043d\u0438\u0437\u0443 \u043c\u0435\u043d\u044e.</p>
        <${t} class="web-mode-choice-grid">
          <button type="button" id="webModeChoicePersonal" class="web-mode-choice-option">
            <span class="web-mode-choice-option-icon" aria-hidden="true">\ud83d\udc64</span>
            <strong>\u0414\u043b\u044f \u0441\u0435\u0431\u044f</strong>
            <span class="muted">\u041b\u0438\u0447\u043d\u044b\u0435 \u0441\u0447\u0435\u0442\u0430 \u0438 \u043e\u043f\u0435\u0440\u0430\u0446\u0438\u0438</span>
          </button>
          <button type="button" id="webModeChoiceTeam" class="web-mode-choice-option">
            <span class="web-mode-choice-option-icon" aria-hidden="true">\ud83d\udc65</span>
            <strong>\u041a\u043e\u043c\u0430\u043d\u0434\u0430</strong>
            <span class="muted">\u0414\u043e 5 \u0447\u0435\u043b\u043e\u0432\u0435\u043a, \u043e\u0434\u043d\u0430 \u043e\u0431\u0449\u0430\u044f \u043a\u043d\u0438\u0433\u0430</span>
          </button>
        </${t}>
        <${t} id="webModeChoiceTeamPanel" class="web-mode-choice-team-panel" hidden>
          <label class="web-mode-choice-team-label" for="webModeChoiceTeamName">\u041d\u0430\u0437\u0432\u0430\u043d\u0438\u0435 \u043a\u043e\u043c\u0430\u043d\u0434\u044b</label>
          <input
            id="webModeChoiceTeamName"
            class="web-mode-choice-team-input"
            type="text"
            maxlength="80"
            placeholder="\u041d\u0430\u043f\u0440\u0438\u043c\u0435\u0440: \u0421\u0435\u043c\u044c\u044f"
            autocomplete="organization"
          />
          <button type="button" id="webModeChoiceTeamSubmit" class="primary-button web-mode-choice-team-submit">
            \u0421\u043e\u0437\u0434\u0430\u0442\u044c \u043a\u043e\u043c\u0430\u043d\u0434\u0443 \u0438 \u0432\u043e\u0439\u0442\u0438
          </button>
        </${t}>`;

const re =
  /<h1 id="webModeChoiceTitle"[\s\S]*?<button type="button" id="webModeChoiceTeamSubmit"[\s\S]*?<\/button>\s*<\/div>/;

if (!re.test(h)) {
  throw new Error("mode choice block not found");
}

h = h.replace(re, block.trim());

const switcher = `              <${t} id="webWorkspaceSwitcher" class="web-workspace-switcher" hidden>
                <p class="web-workspace-switcher-label muted">\u0420\u0430\u0431\u043e\u0447\u0435\u0435 \u043f\u0440\u043e\u0441\u0442\u0440\u0430\u043d\u0441\u0442\u0432\u043e</p>
                <${t} id="webWorkspaceSwitcherList" class="web-workspace-switcher-list" role="list"></${t}>
              </${t}>`;

if (h.includes("webWorkspaceSwitcher")) {
  h = h.replace(/<div id="webWorkspaceSwitcher"[\s\S]*?<\/motion>\s*\r?\n\s*<\/div>/, switcher);
  h = h.replace(
    new RegExp(`<${t} id="webWorkspaceSwitcher"[\\s\\S]*?</${t}>\\s*\\r?\\n\\s*</${t}>`),
    switcher
  );
}

fs.writeFileSync(p, h, "utf8");
console.log("fixed", h.includes("\u041a\u0430\u043a \u0431\u0443\u0434\u0435\u0442\u0435"));
