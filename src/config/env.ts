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
 * Railway и другие контейнеры надёжнее слушают на 0.0.0.0.
 * Локально по умолчанию :: (dual-stack, удобно с ngrok на Windows).
 */
const defaultListenHost =
  process.env.RAILWAY_ENVIRONMENT !== undefined ? "0.0.0.0" : "::";

export const env = {
  telegramBotToken: requireEnv("TELEGRAM_BOT_TOKEN"),
  supabaseUrl: requireEnv("SUPABASE_URL"),
  supabaseServiceRoleKey: requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
  appUrl: optionalEnv("APP_URL"),
  telegramWebhookSecret: optionalEnv("TELEGRAM_WEBHOOK_SECRET"),
  /** HTTP bind address (`::`, `0.0.0.0`, `127.0.0.1`). If ngrok mentions `[::1]:PORT` refused on Windows, use `127.0.0.1` and tunnel `ngrok http 127.0.0.1:PORT`. */
  host: optionalEnv("HOST") ?? defaultListenHost,
  port: Number(optionalEnv("PORT") ?? "3000"),
  reportingCurrency: optionalEnv("REPORTING_CURRENCY") ?? "USD",
  exchangeRateSyncIntervalMinutes: Number(
    optionalEnv("EXCHANGE_RATE_SYNC_INTERVAL_MINUTES") ?? "360"
  )
};
