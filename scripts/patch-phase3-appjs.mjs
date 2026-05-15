import fs from "node:fs";

const p = "public/mini-app/app.js";
let src = fs.readFileSync(p, "utf8");

if (src.includes("WEB_WORKSPACE_MODE_SEEN_KEY")) {
  console.log("app.js already patched");
  process.exit(0);
}

const inviteBoot = `
const WEB_WORKSPACE_MODE_SEEN_KEY = "balancy_web_workspace_mode_seen_v1";
const WEB_INVITE_TOKEN_SESSION_KEY = "balancy_web_invite_token";

function parseWebInviteTokenFromLocation() {
  if (!isWebMode) {
    return;
  }

  try {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("invite")?.trim();

    if (!token) {
      return;
    }

    sessionStorage.setItem(WEB_INVITE_TOKEN_SESSION_KEY, token);
    params.delete("invite");
    const nextQuery = params.toString();
    const nextUrl = nextQuery
      ? \`\${window.location.pathname}?\${nextQuery}\${window.location.hash}\`
      : \`\${window.location.pathname}?web=1\${window.location.hash}\`;
    window.history.replaceState({}, "", nextUrl);
  } catch {
    //
  }
}

parseWebInviteTokenFromLocation();
`;

src = src.replace(
  'const isWebMode = new URLSearchParams(window.location.search).get("web") === "1";',
  `const isWebMode = new URLSearchParams(window.location.search).get("web") === "1";${inviteBoot}`
);

const domRefs = `
const webModeChoiceElement = document.getElementById("webModeChoice");
const webModeChoicePersonalButton = document.getElementById("webModeChoicePersonal");
const webModeChoiceTeamButton = document.getElementById("webModeChoiceTeam");
const webModeChoiceTeamPanelElement = document.getElementById("webModeChoiceTeamPanel");
const webModeChoiceTeamNameInput = document.getElementById("webModeChoiceTeamName");
const webModeChoiceTeamSubmitButton = document.getElementById("webModeChoiceTeamSubmit");
const webModeChoiceErrorElement = document.getElementById("webModeChoiceError");
const webWorkspaceSwitcherElement = document.getElementById("webWorkspaceSwitcher");
const webWorkspaceSwitcherListElement = document.getElementById("webWorkspaceSwitcherList");
const webTeamSettingsCardElement = document.getElementById("webTeamSettingsCard");
const webTeamSettingsTitleElement = document.getElementById("webTeamSettingsTitle");
const webTeamSettingsMetaElement = document.getElementById("webTeamSettingsMeta");
const webTeamNameInputElement = document.getElementById("webTeamNameInput");
const webTeamRenameButtonElement = document.getElementById("webTeamRenameButton");
const webTeamCopyInviteButtonElement = document.getElementById("webTeamCopyInviteButton");
const webTeamInviteStatusElement = document.getElementById("webTeamInviteStatus");
const webTeamMembersListElement = document.getElementById("webTeamMembersList");
const webTeamSettingsErrorElement = document.getElementById("webTeamSettingsError");
`;

src = src.replace(
  "const webLoginGateErrorElement = document.getElementById(\"webLoginGateError\");",
  `const webLoginGateErrorElement = document.getElementById("webLoginGateError");${domRefs}`
);

src = src.replace(
  `const state = {
  user: null,
  accounts: [],`,
  `const state = {
  user: null,
  workspace: null,
  workspaces: [],
  accounts: [],`
);

const workspaceFns = `
let webWorkspaceUiAttached = false;

function markWebWorkspaceModeSeen() {
  try {
    localStorage.setItem(WEB_WORKSPACE_MODE_SEEN_KEY, "1");
  } catch {
    //
  }
}

function hasSeenWebWorkspaceModeChoice() {
  try {
    return localStorage.getItem(WEB_WORKSPACE_MODE_SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

function getPendingWebInviteToken() {
  try {
    return sessionStorage.getItem(WEB_INVITE_TOKEN_SESSION_KEY)?.trim() || "";
  } catch {
    return "";
  }
}

function clearPendingWebInviteToken() {
  try {
    sessionStorage.removeItem(WEB_INVITE_TOKEN_SESSION_KEY);
  } catch {
    //
  }
}

function applyWorkspacePayload(payload) {
  if (payload?.workspace && typeof payload.workspace === "object") {
    state.workspace = payload.workspace;
  }

  if (Array.isArray(payload?.workspaces)) {
    state.workspaces = payload.workspaces;
  }

  syncWorkspaceChrome();
}

function workspaceKindLabel(kind) {
  return kind === "team" ? "Команда" : "Личное";
}

function formatWorkspaceMemberLabel(member) {
  const name = [member.firstName, member.lastName].filter(Boolean).join(" ").trim();
  if (name) {
    return name;
  }

  if (member.username) {
    return \`@\${member.username}\`;
  }

  return "Участник";
}

function shouldShowWebModeChoice() {
  if (!isWebMode || !state.user) {
    return false;
  }

  if (getPendingWebInviteToken()) {
    return false;
  }

  if (hasSeenWebWorkspaceModeChoice()) {
    return false;
  }

  return !state.workspaces.some((item) => item.kind === "team");
}

function setWebModeChoiceError(message = "") {
  if (!webModeChoiceErrorElement) {
    return;
  }

  const text = String(message ?? "").trim();
  webModeChoiceErrorElement.hidden = !text;
  webModeChoiceErrorElement.textContent = text;
}

function showWebModeChoice() {
  if (!isWebMode || !webModeChoiceElement) {
    return;
  }

  document.body.classList.add("web-mode-choice-open");
  webModeChoiceElement.hidden = false;
  setWebModeChoiceError("");
}

function hideWebModeChoice() {
  if (!webModeChoiceElement) {
    return;
  }

  document.body.classList.remove("web-mode-choice-open");
  webModeChoiceElement.hidden = true;
  setWebModeChoiceError("");

  if (webModeChoiceTeamPanelElement) {
    webModeChoiceTeamPanelElement.hidden = true;
  }
}

async function switchWebWorkspace(workspaceId) {
  const id = String(workspaceId ?? "").trim();

  if (!id || state.workspace?.id === id) {
    return;
  }

  await apiFetch("/api/workspaces/switch", {
    method: "POST",
    body: JSON.stringify({ workspaceId: id })
  });

  state.webOperationsLastPayload = null;
  await refreshAppData({
    globalBusy: true,
    busyMessage: "Переключаем пространство…",
    syncWebOperationsHistory: true
  });
}

async function createWebTeamWorkspace(name) {
  const payload = await apiFetch("/api/workspaces/team", {
    method: "POST",
    body: JSON.stringify({ name })
  });

  if (payload?.workspace) {
    state.workspace = payload.workspace;
  }

  markWebWorkspaceModeSeen();
  state.webOperationsLastPayload = null;
  await refreshAppData({
    globalBusy: true,
    busyMessage: "Создаём команду…",
    syncWebOperationsHistory: true
  });
}

async function tryAcceptPendingWebInvite() {
  const token = getPendingWebInviteToken();

  if (!token || !state.user) {
    return false;
  }

  try {
    await apiFetch(\`/api/workspaces/invites/\${encodeURIComponent(token)}/accept\`, {
      method: "POST"
    });
    clearPendingWebInviteToken();
    markWebWorkspaceModeSeen();
    state.webOperationsLastPayload = null;
    await refreshAppData({
      globalBusy: true,
      busyMessage: "Подключаем к команде…",
      syncWebOperationsHistory: true
    });
    return true;
  } catch (error) {
    clearPendingWebInviteToken();
    setStatus(error instanceof Error ? error.message : "Не удалось принять приглашение", "error");
    return false;
  }
}

function renderWebWorkspaceSwitcher() {
  if (!webWorkspaceSwitcherElement || !webWorkspaceSwitcherListElement) {
    return;
  }

  const workspaces = Array.isArray(state.workspaces) ? state.workspaces : [];
  const showSwitcher = workspaces.length > 1;

  webWorkspaceSwitcherElement.hidden = !showSwitcher;

  if (!showSwitcher) {
    webWorkspaceSwitcherListElement.replaceChildren();
    return;
  }

  webWorkspaceSwitcherListElement.replaceChildren();

  workspaces.forEach((workspace) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "web-workspace-switcher-item";
    button.dataset.workspaceId = workspace.id;

    if (workspace.id === state.workspace?.id) {
      button.classList.add("is-active");
      button.setAttribute("aria-current", "true");
    }

    const title = document.createElement("span");
    title.className = "web-workspace-switcher-item-title";
    title.textContent = workspace.name || workspaceKindLabel(workspace.kind);

    const meta = document.createElement("span");
    meta.className = "muted web-workspace-switcher-item-meta";
    meta.textContent =
      workspace.kind === "team"
        ? \`\${workspaceKindLabel(workspace.kind)} · \${workspace.memberCount ?? 1}/\${workspace.maxMembers ?? 5}\`
        : workspaceKindLabel(workspace.kind);

    button.append(title, meta);
    button.addEventListener("click", () => {
      void (async () => {
        closeWebProfileDropdown();
        try {
          await switchWebWorkspace(workspace.id);
        } catch (error) {
          setStatus(error instanceof Error ? error.message : "Не удалось переключить", "error");
        }
      })();
    });

    webWorkspaceSwitcherListElement.appendChild(button);
  });
}

function syncWebTeamSettingsCardVisibility() {
  if (!webTeamSettingsCardElement) {
    return;
  }

  const isTeam = state.workspace?.kind === "team";
  webTeamSettingsCardElement.hidden = !isTeam;
}

async function loadWebTeamSettings() {
  if (!isWebMode || state.workspace?.kind !== "team") {
    return;
  }

  if (webTeamSettingsErrorElement) {
    webTeamSettingsErrorElement.hidden = true;
    webTeamSettingsErrorElement.textContent = "";
  }

  const workspace = state.workspace;
  const title = workspace.name || "Команда";

  if (webTeamSettingsTitleElement) {
    webTeamSettingsTitleElement.textContent = title;
  }

  if (webTeamNameInputElement) {
    webTeamNameInputElement.value = title;
  }

  if (webTeamSettingsMetaElement) {
    webTeamSettingsMetaElement.textContent = \`\${workspace.memberCount ?? 1} из \${workspace.maxMembers ?? 5} участников\`;
  }

  try {
    const payload = await apiFetch("/api/workspaces/members");
    const members = Array.isArray(payload.members) ? payload.members : [];

    if (webTeamMembersListElement) {
      webTeamMembersListElement.replaceChildren();

      if (members.length === 0) {
        const empty = document.createElement("li");
        empty.className = "muted";
        empty.textContent = "Пока нет участников";
        webTeamMembersListElement.appendChild(empty);
      } else {
        members.forEach((member) => {
          const item = document.createElement("li");
          item.className = "web-team-member-item";

          const name = document.createElement("span");
          name.textContent = formatWorkspaceMemberLabel(member);

          const role = document.createElement("span");
          role.className = "muted web-team-member-role";
          role.textContent = member.role === "owner" ? "Владелец" : "Участник";

          item.append(name, role);
          webTeamMembersListElement.appendChild(item);
        });
      }
    }
  } catch (error) {
    if (webTeamSettingsErrorElement) {
      webTeamSettingsErrorElement.hidden = false;
      webTeamSettingsErrorElement.textContent =
        error instanceof Error ? error.message : "Не удалось загрузить участников";
    }
  }
}

function syncWorkspaceChrome() {
  if (!isWebMode) {
    return;
  }

  renderWebWorkspaceSwitcher();
  syncWebTeamSettingsCardVisibility();
  syncWebProfile();

  const hint = document.querySelector(".web-sidebar-user-hint");
  if (hint && state.workspace) {
    hint.textContent =
      state.workspace.kind === "team"
        ? \`Команда · \${state.workspace.name}\`
        : "Личное · Настройки";
  }
}

function attachWebWorkspaceUi() {
  if (!isWebMode || webWorkspaceUiAttached) {
    return;
  }

  webWorkspaceUiAttached = true;

  webModeChoicePersonalButton?.addEventListener("click", () => {
    void (async () => {
      setWebModeChoiceError("");
      markWebWorkspaceModeSeen();

      const personal = state.workspaces.find((item) => item.kind === "personal");

      try {
        if (personal && personal.id !== state.workspace?.id) {
          await switchWebWorkspace(personal.id);
        } else {
          hideWebModeChoice();
        }
      } catch (error) {
        setWebModeChoiceError(error instanceof Error ? error.message : "Не удалось выбрать режим");
      }
    })();
  });

  webModeChoiceTeamButton?.addEventListener("click", () => {
    if (webModeChoiceTeamPanelElement) {
      webModeChoiceTeamPanelElement.hidden = false;
    }

    webModeChoiceTeamNameInput?.focus();
    setWebModeChoiceError("");
  });

  webModeChoiceTeamSubmitButton?.addEventListener("click", () => {
    void (async () => {
      const name = webModeChoiceTeamNameInput?.value?.trim() ?? "";

      if (!name) {
        setWebModeChoiceError("Введите название команды");
        return;
      }

      setWebModeChoiceError("");

      try {
        webModeChoiceTeamSubmitButton.disabled = true;
        await createWebTeamWorkspace(name);
        hideWebModeChoice();
      } catch (error) {
        setWebModeChoiceError(error instanceof Error ? error.message : "Не удалось создать команду");
      } finally {
        if (webModeChoiceTeamSubmitButton) {
          webModeChoiceTeamSubmitButton.disabled = false;
        }
      }
    })();
  });

  webTeamRenameButtonElement?.addEventListener("click", () => {
    void (async () => {
      const name = webTeamNameInputElement?.value?.trim() ?? "";

      if (!name) {
        if (webTeamSettingsErrorElement) {
          webTeamSettingsErrorElement.hidden = false;
          webTeamSettingsErrorElement.textContent = "Введите название";
        }
        return;
      }

      if (webTeamSettingsErrorElement) {
        webTeamSettingsErrorElement.hidden = true;
        webTeamSettingsErrorElement.textContent = "";
      }

      try {
        const payload = await apiFetch("/api/workspaces/team/name", {
          method: "PATCH",
          body: JSON.stringify({ name })
        });

        if (payload?.workspace) {
          state.workspace = payload.workspace;
          const idx = state.workspaces.findIndex((item) => item.id === payload.workspace.id);
          if (idx >= 0) {
            state.workspaces[idx] = payload.workspace;
          }
        }

        syncWorkspaceChrome();
        setStatus("Название команды сохранено", "success");
      } catch (error) {
        if (webTeamSettingsErrorElement) {
          webTeamSettingsErrorElement.hidden = false;
          webTeamSettingsErrorElement.textContent =
            error instanceof Error ? error.message : "Не удалось сохранить";
        }
      }
    })();
  });

  webTeamCopyInviteButtonElement?.addEventListener("click", () => {
    void (async () => {
      if (webTeamInviteStatusElement) {
        webTeamInviteStatusElement.hidden = true;
        webTeamInviteStatusElement.textContent = "";
      }

      try {
        const payload = await apiFetch("/api/workspaces/invites", { method: "POST" });
        const token = payload?.invite?.token;

        if (!token) {
          throw new Error("Сервер не вернул токен приглашения");
        }

        const url = new URL(window.location.href);
        url.searchParams.set("web", "1");
        url.searchParams.set("invite", token);

        await navigator.clipboard.writeText(url.toString());

        if (webTeamInviteStatusElement) {
          webTeamInviteStatusElement.hidden = false;
          webTeamInviteStatusElement.textContent = "Ссылка скопирована в буфер обмена";
        }
      } catch (error) {
        if (webTeamSettingsErrorElement) {
          webTeamSettingsErrorElement.hidden = false;
          webTeamSettingsErrorElement.textContent =
            error instanceof Error ? error.message : "Не удалось создать ссылку";
        }
      }
    })();
  });
}

`;

src = src.replace("function showWebLoginGate(errorMessage = \"\") {", `${workspaceFns}\nfunction showWebLoginGate(errorMessage = \"\") {`);

src = src.replace(
  `  applyDashboardPayload(payload);

  if (userNameElement && user) {`,
  `  applyDashboardPayload(payload);
  applyWorkspacePayload(payload);

  if (userNameElement && user) {`
);

src = src.replace(
  `function applyRefreshPayload(payload) {
  if (Array.isArray(payload.accounts)) {
    state.accounts = payload.accounts;
  }`,
  `function applyRefreshPayload(payload) {
  applyWorkspacePayload(payload);

  if (Array.isArray(payload.accounts)) {
    state.accounts = payload.accounts;
  }`
);

src = src.replace(
  `  if (isWebMode && document.body.classList.contains("web-login-gate-open")) {
    return;
  }`,
  `  if (
    isWebMode &&
    (document.body.classList.contains("web-login-gate-open") ||
      document.body.classList.contains("web-mode-choice-open"))
  ) {
    return;
  }`
);

src = src.replace(
  `    if (isWebMode) {
      hideWebLoginGate();
    }

    afterBootstrapRender(options);
    return payload;`,
  `    if (isWebMode) {
      hideWebLoginGate();

      if (!getPendingWebInviteToken() && shouldShowWebModeChoice()) {
        showWebModeChoice();
      } else {
        hideWebModeChoice();
        if (getPendingWebInviteToken()) {
          await tryAcceptPendingWebInvite();
        }
      }
    }

    afterBootstrapRender(options);
    return payload;`
);

src = src.replace(
  `      await refreshAppData(options);
      hideWebLoginGate();
      setStatus(
        "Все готово. Интерфейс разбит по вкладкам и стал проще для ежедневного использования.",
        "success"
      );
      await dismissAppSplashAfterSuccess();`,
  `      await refreshAppData(options);
      if (!document.body.classList.contains("web-mode-choice-open")) {
        setStatus(
          "Все готово. Интерфейс разбит по вкладкам и стал проще для ежедневного использования.",
          "success"
        );
      }
      await dismissAppSplashAfterSuccess();`
);

src = src.replace(
  `  if (isWebMode && nextScreen === "home") {
    window.requestAnimationFrame(() => syncWebDashSparkCharts());
  }

  applyBalancyHintsFromState();
}`,
  `  if (isWebMode && nextScreen === "home") {
    window.requestAnimationFrame(() => syncWebDashSparkCharts());
  }

  if (isWebMode && nextScreen === "settings" && state.workspace?.kind === "team") {
    void loadWebTeamSettings();
  }

  applyBalancyHintsFromState();
}`
);

src = src.replace(
  `  } finally {
    state.user = null;
    showWebLoginGate();
  }
}`,
  `  } finally {
    state.user = null;
    state.workspace = null;
    state.workspaces = [];
    hideWebModeChoice();
    showWebLoginGate();
  }
}`
);

src = src.replace(
  `  attachTelegramPullToRefresh();
  attachTelegramEdgeSwipeBack();

  void loadApp();`,
  `  attachTelegramPullToRefresh();
  attachTelegramEdgeSwipeBack();
  attachWebWorkspaceUi();

  void loadApp();`
);

fs.writeFileSync(p, src, "utf8");
console.log("patched app.js", src.includes("WEB_WORKSPACE_MODE_SEEN_KEY"));
