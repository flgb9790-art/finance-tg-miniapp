const INVITE_TOKEN_RE = /^[\w-]{8,512}$/;

export function isValidWorkspaceInviteToken(token: string): boolean {
  return INVITE_TOKEN_RE.test(token.trim());
}

export function buildInviteBotStartPayload(token: string): string {
  return `inv_${token.trim()}`;
}

export function buildInviteBotDeepLink(botUsername: string, token: string): string {
  const bot = botUsername.trim().replace(/^@+/, "");
  const payload = encodeURIComponent(buildInviteBotStartPayload(token));
  return `https://t.me/${bot}?start=${payload}`;
}

/** Mini App из кнопки бота (внутри Telegram) — только invite, без web=1. */
export function buildInviteTelegramWebAppUrl(appUrl: string, token: string): string {
  const base = appUrl.trim().replace(/\/+$/, "");
  const url = new URL("/mini-app/", `${base}/`);
  url.searchParams.set("invite", token.trim());
  return url.toString();
}

/** Обычный браузер — веб-вход и экран приглашения. */
export function buildInviteWebBrowserUrl(appUrl: string, token: string): string {
  const base = appUrl.trim().replace(/\/+$/, "");
  const url = new URL("/mini-app/", `${base}/`);
  url.searchParams.set("invite", token.trim());
  url.searchParams.set("web", "1");
  return url.toString();
}

export function buildInviteLandingPageUrl(appUrl: string, token: string): string {
  const base = appUrl.trim().replace(/\/+$/, "");
  return `${base}/invite/${encodeURIComponent(token.trim())}`;
}

export function renderInviteLandingHtml(options: {
  token: string;
  appUrl: string;
  botUsername: string | null;
}): string {
  const token = options.token.trim();
  const webUrl = buildInviteWebBrowserUrl(options.appUrl, token);
  const tgMiniAppUrl = buildInviteTelegramWebAppUrl(options.appUrl, token);
  const tgStartUrl = options.botUsername
    ? buildInviteBotDeepLink(options.botUsername, token)
    : null;
  const tgWebUrl = options.botUsername
    ? `https://web.telegram.org/k/#?tgaddr=${encodeURIComponent(
        `tg://resolve?domain=${options.botUsername}&start=${buildInviteBotStartPayload(token)}`
      )}`
    : null;

  const esc = (value: string) =>
    value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");

  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Приглашение в команду — Balancy</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      font-family: system-ui, "Segoe UI", Arial, sans-serif;
      background: linear-gradient(180deg, #fafbfd 0%, #eef1f8 100%);
      color: #12122b;
    }
    .card {
      width: min(100%, 420px);
      padding: 32px 28px;
      border-radius: 24px;
      border: 1px solid rgb(18 18 43 / 0.08);
      background: #fff;
      box-shadow: 0 24px 64px rgb(18 18 43 / 0.1);
      text-align: center;
    }
    h1 { margin: 0 0 10px; font-size: 1.5rem; letter-spacing: -0.03em; }
    p { margin: 0 0 20px; font-size: 0.95rem; line-height: 1.5; color: #5c6470; }
    .actions { display: grid; gap: 10px; }
    a.btn {
      display: block;
      padding: 14px 16px;
      border-radius: 14px;
      font-weight: 650;
      text-decoration: none;
      font-size: 0.95rem;
    }
    a.btn-primary { background: linear-gradient(135deg, #1e1b4b, #4338ca); color: #fff; }
    a.btn-secondary { background: rgb(49 46 129 / 0.08); color: #312e81; }
    a.btn-ghost { background: #f8fafc; color: #475569; border: 1px solid rgb(18 18 43 / 0.1); }
    .note { margin-top: 16px; font-size: 0.8rem; color: #64748b; }
  </style>
</head>
<body>
  <main class="card">
    <h1>Приглашение в команду</h1>
    <p>Откройте Balancy в браузере или в Telegram — затем подтвердите вступление в команду.</p>
    <div class="actions">
      <a class="btn btn-primary" href="${esc(webUrl)}">Открыть в браузере</a>
      ${
        tgStartUrl
          ? `<a class="btn btn-secondary" href="${esc(tgStartUrl)}">Открыть в Telegram (чат с ботом)</a>`
          : ""
      }
      <a class="btn btn-secondary" href="${esc(tgMiniAppUrl)}">Открыть Mini App (если уже в Telegram)</a>
      ${
        tgWebUrl
          ? `<a class="btn btn-ghost" href="${esc(tgWebUrl)}">Telegram Web</a>`
          : ""
      }
    </div>
    <p class="note">На телефоне удобнее «Telegram» — откроется чат с ботом и кнопка «Открыть приглашение».</p>
  </main>
</body>
</html>`;
}
