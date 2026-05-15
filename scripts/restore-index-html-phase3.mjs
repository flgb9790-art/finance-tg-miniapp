import { execSync } from "node:child_process";
import fs from "node:fs";

const TAG = "div";

let h = execSync("git show 4fd3385:public/mini-app/index.html", { encoding: "utf8" });

const modeBlock = `    <${TAG}
      id="webModeChoice"
      class="web-mode-choice-gate"
      hidden
      role="dialog"
      aria-modal="true"
      aria-labelledby="webModeChoiceTitle"
    >
      <${TAG} class="web-mode-choice-card">
        <header class="web-mode-choice-brand">
          <span class="web-mode-choice-wordmark brand-wordmark">Balancy</span>
        </header>
        <h1 id="webModeChoiceTitle" class="web-mode-choice-title">\u041a\u0430\u043a \u0431\u0443\u0434\u0435\u0442\u0435 \u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u044c\u0441\u044f?</h1>
        <p class="web-mode-choice-lede muted">\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u0440\u0435\u0436\u0438\u043c. \u041f\u043e\u0437\u0436\u0435 \u043c\u043e\u0436\u043d\u043e \u043f\u0435\u0440\u0435\u043a\u043b\u044e\u0447\u0438\u0442\u044c\u0441\u044f \u0432 \u043f\u0440\u043e\u0444\u0438\u043b\u0435 \u0432\u043d\u0438\u0437\u0443 \u043c\u0435\u043d\u044e.</p>
        <${TAG} class="web-mode-choice-grid">
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
        </${TAG}>
        <${TAG} id="webModeChoiceTeamPanel" class="web-mode-choice-team-panel" hidden>
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
        </${TAG}>
        <p id="webModeChoiceError" class="web-mode-choice-error inline-error" hidden></p>
      </${TAG}>
    </${TAG}>`;

const switcher = `              <${TAG} id="webWorkspaceSwitcher" class="web-workspace-switcher" hidden>
                <p class="web-workspace-switcher-label muted">\u0420\u0430\u0431\u043e\u0447\u0435\u0435 \u043f\u0440\u043e\u0441\u0442\u0440\u0430\u043d\u0441\u0442\u0432\u043e</p>
                <${TAG} id="webWorkspaceSwitcherList" class="web-workspace-switcher-list" role="list"></${TAG}>
              </${TAG}>`;

const teamCard = `          <section id="webTeamSettingsCard" class="card web-team-settings-card web-only-block" hidden>
            <${TAG} class="section-header">
              <${TAG}>
                <p class="section-label">\u041a\u043e\u043c\u0430\u043d\u0434\u0430</p>
                <h2 id="webTeamSettingsTitle">\u041a\u043e\u043c\u0430\u043d\u0434\u0430</h2>
              </${TAG}>
            </${TAG}>
            <p id="webTeamSettingsMeta" class="muted web-team-settings-meta"></p>
            <label class="web-team-field-label" for="webTeamNameInput">\u041d\u0430\u0437\u0432\u0430\u043d\u0438\u0435</label>
            <${TAG} class="web-team-name-row">
              <input id="webTeamNameInput" class="web-team-name-input" type="text" maxlength="80" />
              <button type="button" id="webTeamRenameButton" class="ghost-button">\u0421\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c</button>
            </${TAG}>
            <${TAG} class="web-team-invite-block">
              <p class="web-team-field-label">\u041f\u0440\u0438\u0433\u043b\u0430\u0448\u0435\u043d\u0438\u0435</p>
              <p class="muted web-team-invite-hint">\u0421\u0441\u044b\u043b\u043a\u0430 \u043c\u043d\u043e\u0433\u043e\u0440\u0430\u0437\u043e\u0432\u0430\u044f. \u0414\u043e 5 \u0443\u0447\u0430\u0441\u0442\u043d\u0438\u043a\u043e\u0432 \u0432\u043a\u043b\u044e\u0447\u0430\u044f \u0432\u0430\u0441.</p>
              <button type="button" id="webTeamCopyInviteButton" class="primary-button web-team-copy-invite">
                \u0421\u043a\u043e\u043f\u0438\u0440\u043e\u0432\u0430\u0442\u044c \u0441\u0441\u044b\u043b\u043a\u0443-\u043f\u0440\u0438\u0433\u043b\u0430\u0448\u0435\u043d\u0438\u0435
              </button>
              <p id="webTeamInviteStatus" class="muted web-team-invite-status" hidden></p>
            </${TAG}>
            <${TAG} class="web-team-members-block">
              <p class="web-team-field-label">\u0423\u0447\u0430\u0441\u0442\u043d\u0438\u043a\u0438</p>
              <ul id="webTeamMembersList" class="web-team-members-list"></ul>
            </${TAG}>
            <p id="webTeamSettingsError" class="inline-error web-team-settings-error" hidden></p>
          </section>`;

const topNavIdx = h.indexOf(`<${TAG} id="webTopNav"`);
if (topNavIdx < 0) {
  throw new Error("webTopNav not found in base");
}

h = `${h.slice(0, topNavIdx)}${modeBlock}\n    ${h.slice(topNavIdx)}`;

const profileRe =
  /(<p id="webProfileMeta" class="web-profile-meta muted"><\/p>\s*)<button type="button" id="webOpenSettingsButton"/;
if (!profileRe.test(h)) {
  throw new Error("profile anchor not found");
}
h = h.replace(profileRe, `$1${switcher}\n              <button type="button" id="webOpenSettingsButton"`);

const settingsRe =
  /(class="ghost-button tg-settings-back tg-only-block" data-open-screen="more">[\s\S]*?<\/button>\s*<\/section>)\s*(<\/section>\s*\r?\n\s*<section id="screen-accounts")/;
if (!settingsRe.test(h)) {
  throw new Error("settings anchor not found");
}
h = h.replace(settingsRe, `$1\n\n${teamCard}\n        $2`);

h = h.replace(
  /BALANCY_CLIENT_ASSET_REV = "[^"]+"/,
  'BALANCY_CLIENT_ASSET_REV = "20260515web-teams-phase3-v2"'
);

const out = "public/mini-app/index.html";
fs.writeFileSync(out, h, { encoding: "utf8" });

const verify = fs.readFileSync(out, "utf8");
const ok =
  verify.includes("\u0413\u043b\u0430\u0432\u043d\u0430") &&
  verify.includes("\u041a\u0430\u043a \u0431\u0443\u0434\u0435\u0442\u0435") &&
  !verify.includes("<span>????") &&
  verify.includes("webModeChoice");

console.log("restored", {
  glavnaya: verify.includes("\u0413\u043b\u0430\u0432\u043d\u0430"),
  modeChoice: verify.includes("\u041a\u0430\u043a \u0431\u0443\u0434\u0435\u0442\u0435"),
  brokenSpans: verify.includes("<span>????"),
  phase3: verify.includes("webTeamSettingsCard")
});

if (!ok) {
  process.exitCode = 1;
}
