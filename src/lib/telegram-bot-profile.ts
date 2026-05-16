import { env } from "../config/env.js";

let cachedUsername: string | null = null;
let cacheExpiresAt = 0;

const CACHE_TTL_MS = 60 * 60 * 1000;

interface TelegramGetMeResponse {
  ok?: boolean;
  result?: { username?: string };
}

/** Username бота из getMe (как в Telegram), с fallback на TELEGRAM_BOT_USERNAME. */
export async function resolveTelegramBotUsername(): Promise<string | null> {
  if (cachedUsername && Date.now() < cacheExpiresAt) {
    return cachedUsername;
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${env.telegramBotToken}/getMe`
    );
    const payload = (await response.json()) as TelegramGetMeResponse;

    if (payload.ok && typeof payload.result?.username === "string") {
      const username = payload.result.username.trim().replace(/^@+/, "");

      if (username) {
        cachedUsername = username;
        cacheExpiresAt = Date.now() + CACHE_TTL_MS;
        return username;
      }
    }
  } catch (error) {
    console.warn("[telegram] getMe failed while resolving bot username", error);
  }

  const fromEnv = env.telegramBotUsername?.trim().replace(/^@+/, "");
  return fromEnv || null;
}
