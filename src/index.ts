import { attachTelegramBotRoutes, syncTelegramWebhook } from "./bot/index.js";
import { env } from "./config/env.js";
import { createHttpApp } from "./server/app.js";
import { syncExchangeRates } from "./services/exchange-rates.js";

async function syncRatesOnce(): Promise<void> {
  try {
    const result = await syncExchangeRates();
    console.log(
      `Exchange rates synced. Pairs: ${result.syncedPairs}. Updated at: ${result.updatedAt}`
    );
  } catch (error) {
    console.error("Failed to sync exchange rates", error);
  }
}

function startExchangeRateSyncLoop(): void {
  void syncRatesOnce();

  const intervalMs = env.exchangeRateSyncIntervalMinutes * 60 * 1000;

  setInterval(() => {
    void syncRatesOnce();
  }, intervalMs);
}

function main(): void {
  const useWebhook = Boolean((env.appUrl ?? "").trim());

  console.log("Finance Telegram Mini App MVP");
  console.log(`Starting HTTP server on ${env.host}:${env.port}...`);

  const httpApp = createHttpApp();
  const telegramBot = attachTelegramBotRoutes(httpApp);

  const server = httpApp.listen(env.port, env.host, () => {
    console.log(`HTTP server is running on ${env.host}:${env.port}.`);

    void (async () => {
      try {
        await syncTelegramWebhook(telegramBot);
      } catch (error) {
        console.error("Не удалось настроить webhook Telegram:", error);
      }
    })();

    console.log(
      useWebhook
        ? "Telegram: после старта будет webhook (без long polling)."
        : "Telegram: long polling. Оставьте одну копию процесса или задайте APP_URL."
    );
    console.log("Bot is ready. Use /start in Telegram.");
    startExchangeRateSyncLoop();
  });

  server.on("error", (error: NodeJS.ErrnoException) => {
    console.error("HTTP server failed to start:", error);
    process.exitCode = 1;
  });
}

main();
