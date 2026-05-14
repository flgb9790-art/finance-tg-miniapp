import { config } from "dotenv";

config();

function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function optionalEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() ? value : undefined;
}

/**
 * PaaS (Railway, Render, Fly) задаёт PORT. Healthcheck и прокси часто ходят по IPv4;
 * при `HOST=::` в Variables деплой «зеленеет» не всегда — принудительно слушаем 0.0.0.0.
 * Локально без PORT — :: (dual-stack, удобно с ngrok на Windows).
 */
function resolveListenHost(): string {
  const explicit = optionalEnv("HOST")?.trim();
  const onPaaS =
    process.env.PORT !== undefined && String(process.env.PORT).trim() !== "";

  if (onPaaS) {
    if (!explicit || explicit === "::") {
      return "0.0.0.0";
    }

    return explicit;
  }

  return explicit ?? "::";
}

export const env = {
  telegramBotToken: requireEnv("TELEGRAM_BOT_TOKEN"),
  telegramBotUsername: optionalEnv("TELEGRAM_BOT_USERNAME"),
  supabaseUrl: requireEnv("SUPABASE_URL"),
  supabaseServiceRoleKey: requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
  appUrl: optionalEnv("APP_URL"),
  telegramWebhookSecret: optionalEnv("TELEGRAM_WEBHOOK_SECRET"),
  /** HTTP bind address (`::`, `0.0.0.0`, `127.0.0.1`). If ngrok mentions `[::1]:PORT` refused on Windows, use `127.0.0.1` and tunnel `ngrok http 127.0.0.1:PORT`. */
  host: resolveListenHost(),
  port: Number(optionalEnv("PORT") ?? "3000"),
  reportingCurrency: optionalEnv("REPORTING_CURRENCY") ?? "USD",
  exchangeRateSyncIntervalMinutes: Number(
    optionalEnv("EXCHANGE_RATE_SYNC_INTERVAL_MINUTES") ?? "360"
  )
};
