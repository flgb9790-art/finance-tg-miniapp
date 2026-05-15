import fs from "node:fs";
import path from "node:path";

const p = path.join("public", "mini-app", "index.html");
let h = fs.readFileSync(p, "utf8");
const t = "div";

const modeBlock = `    <${t}
      id="webModeChoice"
      class="web-mode-choice-gate"
      hidden
      role="dialog"
      aria-modal="true"
      aria-labelledby="webModeChoiceTitle"
    >
      <${t} class="web-mode-choice-card">
        <header class="web-mode-choice-brand">
          <span class="web-mode-choice-wordmark brand-wordmark">Balancy</span>
        </header>
        <h1 id="webModeChoiceTitle" class="web-mode-choice-title">Как будете пользоваться?</h1>
        <p class="web-mode-choice-lede muted">Выберите режим. Позже можно переключиться в профиле внизу меню.</p>
        <${t} class="web-mode-choice-grid">
          <button type="button" id="webModeChoicePersonal" class="web-mode-choice-option">
            <span class="web-mode-choice-option-icon" aria-hidden="true">👤</span>
            <strong>Для себя</strong>
            <span class="muted">Личные счета и операции</span>
          </button>
          <button type="button" id="webModeChoiceTeam" class="web-mode-choice-option">
            <span class="web-mode-choice-option-icon" aria-hidden="true">👥</span>
            <strong>Команда</strong>
            <span class="muted">До 5 человек, одна общая книга</span>
          </button>
        </${t}>
        <${t} id="webModeChoiceTeamPanel" class="web-mode-choice-team-panel" hidden>
          <label class="web-mode-choice-team-label" for="webModeChoiceTeamName">Название команды</label>
          <input
            id="webModeChoiceTeamName"
            class="web-mode-choice-team-input"
            type="text"
            maxlength="80"
            placeholder="Например: Семья"
            autocomplete="organization"
          />
          <button type="button" id="webModeChoiceTeamSubmit" class="primary-button web-mode-choice-team-submit">
            Создать команду и войти
          </button>
        </${t}>
        <p id="webModeChoiceError" class="web-mode-choice-error inline-error" hidden></p>
      </${t}>
    </${t}>`;

const switcher = `              <${t} id="webWorkspaceSwitcher" class="web-workspace-switcher" hidden>
                <p class="web-workspace-switcher-label muted">Рабочее пространство</p>
                <${t} id="webWorkspaceSwitcherList" class="web-workspace-switcher-list" role="list"></${t}>
              </${t}>`;

const teamCard = `          <section id="webTeamSettingsCard" class="card web-team-settings-card web-only-block" hidden>
            <${t} class="section-header">
              <${t}>
                <p class="section-label">Команда</p>
                <h2 id="webTeamSettingsTitle">Команда</h2>
              </${t}>
            </${t}>
            <p id="webTeamSettingsMeta" class="muted web-team-settings-meta"></p>
            <label class="web-team-field-label" for="webTeamNameInput">Название</label>
            <${t} class="web-team-name-row">
              <input id="webTeamNameInput" class="web-team-name-input" type="text" maxlength="80" />
              <button type="button" id="webTeamRenameButton" class="ghost-button">Сохранить</button>
            </${t}>
            <${t} class="web-team-invite-block">
              <p class="web-team-field-label">Приглашение</p>
              <p class="muted web-team-invite-hint">Ссылка многоразовая. До 5 участников включая вас.</p>
              <button type="button" id="webTeamCopyInviteButton" class="primary-button web-team-copy-invite">
                Скопировать ссылку-приглашение
              </button>
              <p id="webTeamInviteStatus" class="muted web-team-invite-status" hidden></p>
            </${t}>
            <${t} class="web-team-members-block">
              <p class="web-team-field-label">Участники</p>
              <ul id="webTeamMembersList" class="web-team-members-list"></ul>
            </${t}>
            <p id="webTeamSettingsError" class="inline-error web-team-settings-error" hidden></p>
          </section>`;

if (!h.includes('id="webModeChoice"')) {
  const topNavIdx = h.indexOf(`<${t} id="webTopNav"`);
  if (topNavIdx < 0) {
    throw new Error("webTopNav not found");
  }
  const modeCr = modeBlock.replace(/\n/g, "\r\n");
  h = `${h.slice(0, topNavIdx)}${modeCr}\r\n    ${h.slice(topNavIdx)}`;
}

if (!h.includes("webWorkspaceSwitcher")) {
  const profileRe =
    /(<p id="webProfileMeta" class="web-profile-meta muted"><\/p>\s*)<button type="button" id="webOpenSettingsButton"/;
  if (!profileRe.test(h)) {
    throw new Error("profile anchor not found");
  }
  h = h.replace(
    profileRe,
    `$1${switcher.replace(/\n/g, "\r\n")}\r\n              <button type="button" id="webOpenSettingsButton"`
  );
}

if (!h.includes("webTeamSettingsCard")) {
  const replaced = h.replace(
    /(class="ghost-button tg-settings-back tg-only-block"[\s\S]*?<\/button>\s*<\/section>)\s*(<\/section>\s*\r?\n\s*<section id="screen-accounts")/,
    `$1\n\n${teamCard}\n        $2`
  );
  if (replaced === h) {
    throw new Error("settings anchor not found");
  }
  h = replaced;
}

h = h.replace(
  /BALANCY_CLIENT_ASSET_REV = "[^"]+"/,
  'BALANCY_CLIENT_ASSET_REV = "20260515web-teams-phase3-v1"'
);

fs.writeFileSync(p, h, "utf8");
console.log("ok", {
  mode: h.includes("Как будете пользоваться?"),
  switcher: h.includes("webWorkspaceSwitcher"),
  team: h.includes("webTeamSettingsCard")
});
