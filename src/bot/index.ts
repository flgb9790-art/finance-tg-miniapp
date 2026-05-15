import type { Express } from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import TelegramBot from "node-telegram-bot-api";
import { env } from "../config/env.js";
import { createAccount, listAccounts } from "../services/accounts.js";
import { registerTelegramUser } from "../services/users.js";
import { ensurePersonalWorkspace } from "../services/workspaces.js";
import type { AccountType } from "../shared/domain.js";

type DraftStep = "name" | "balance";

interface AccountDraft {
  step: DraftStep;
  userId: string;
  name?: string;
  type?: AccountType;
  currencyCode?: string;
}

const accountDrafts = new Map<number, AccountDraft>();

const accountTypeOptions: Array<{ key: AccountType; label: string }> = [
  { key: "cash", label: "Наличные" },
  { key: "card", label: "Карта" },
  { key: "crypto", label: "Крипта" },
  { key: "savings", label: "Накопления" },
  { key: "other", label: "Другое" }
];

const currencyOptions = ["USD", "EUR", "RUB", "GEL"];

const botModuleDir = path.dirname(fileURLToPath(import.meta.url));
const welcomeBannerPngPath = path.join(
  botModuleDir,
  "../../public/mini-app/assets/balancy-welcome-16x9.png"
);

const WELCOME_PHOTO_CAPTION_LINES = [
  "<b>Balancy</b> — личные финансы в одном месте.",
  "",
  "Следите за балансами и курсами, ведите доходы и расходы по категориям, переводите между счетами и выгружайте отчёты."
];

function welcomePhotoCaptionHtml(hasOpenAppButton: boolean): string {
  const cta = hasOpenAppButton
    ? "Нажмите <b>«Открыть приложение»</b> под этим постером."
    : "Откройте мини-приложение через меню бота (кнопка рядом с полем ввода) или задайте переменную <code>APP_URL</code> на сервере, чтобы появилась кнопка здесь.";

  return [...WELCOME_PHOTO_CAPTION_LINES, "", cta].join("\n");
}

function buildWelcomeOpenAppMarkup(): TelegramBot.InlineKeyboardMarkup {
  const base = (env.appUrl ?? "").trim().replace(/\/+$/, "");

  if (!base) {
    return { inline_keyboard: [] };
  }

  return {
    inline_keyboard: [
      [{ text: "Открыть приложение", web_app: { url: `${base}/mini-app/` } }]
    ]
  };
}

function welcomeHasOpenAppButton(): boolean {
  return Boolean((env.appUrl ?? "").trim());
}

function buildHelpHtml(): string {
  return [
    "<b>Balancy</b> — учёт финансов в мини-приложении.",
    "",
    "<b>Команды в этом чате</b>",
    "/start — приветствие с постером",
    "/add — добавить счёт по шагам",
    "/accounts — список счетов",
    "/help — эта справка"
  ].join("\n");
}

async function sendWelcomeBannerPhoto(
  bot: TelegramBot,
  chatId: number
): Promise<void> {
  if (!fs.existsSync(welcomeBannerPngPath)) {
    console.warn(
      "[telegram] Welcome banner PNG missing at %s. Run: npm run welcome:png",
      welcomeBannerPngPath
    );

    await bot.sendMessage(chatId, welcomePhotoCaptionHtml(welcomeHasOpenAppButton()), {
      parse_mode: "HTML",
      reply_markup: buildWelcomeOpenAppMarkup()
    });

    return;
  }

  await bot.sendPhoto(chatId, welcomeBannerPngPath, {
    caption: welcomePhotoCaptionHtml(welcomeHasOpenAppButton()),
    parse_mode: "HTML",
    reply_markup: buildWelcomeOpenAppMarkup()
  });
}

/** Снимает reply-клавиатуру, не добавляя длинного текста к приветствию. */
async function sendWelcomeKeyboardCleanup(
  bot: TelegramBot,
  chatId: number
): Promise<void> {
  await bot.sendMessage(chatId, "Профиль сохранён.", {
    reply_markup: { remove_keyboard: true }
  });
}

async function sendHelpMessage(bot: TelegramBot, chatId: number): Promise<void> {
  await bot.sendMessage(chatId, buildHelpHtml(), {
    parse_mode: "HTML",
    reply_markup: { remove_keyboard: true }
  });
}

function scheduleBotCommandMenu(bot: TelegramBot): void {
  void bot
    .setMyCommands([
      { command: "start", description: "Приветствие" },
      { command: "add", description: "Добавить счёт (мастер в чате)" },
      { command: "accounts", description: "Список счетов" },
      { command: "help", description: "Возможности Balancy" }
    ])
    .catch((error) => {
      console.warn("[telegram] setMyCommands failed:", error);
    });
}

function scheduleBotProfile(bot: TelegramBot): void {
  const shortDescription =
    "Balancy — балансы, операции, категории и отчёты. Откройте приложение кнопкой под постером после /start.";

  const description = [
    "Balancy помогает вести личные финансы: счета и балансы, доходы и расходы по категориям, переводы, курсы валют и отчёты.",
    "",
    "Отправьте /start — пришлём постер и кнопку «Открыть приложение».",
    "В чате также: /add — новый счёт, /accounts — список счетов, /help — краткая справка."
  ].join("\n");

  void bot
    .setMyShortDescription({ short_description: shortDescription, language_code: "ru" })
    .catch((error) => {
      console.warn("[telegram] setMyShortDescription failed:", error);
    });

  void bot
    .setMyDescription({ description, language_code: "ru" })
    .catch((error) => {
      console.warn("[telegram] setMyDescription failed:", error);
    });
}

function createTypeKeyboard(): TelegramBot.InlineKeyboardMarkup {
  return {
    inline_keyboard: accountTypeOptions.map((option) => [
      {
        text: option.label,
        callback_data: `account_type:${option.key}`
      }
    ])
  };
}

function createCurrencyKeyboard(): TelegramBot.InlineKeyboardMarkup {
  return {
    inline_keyboard: currencyOptions.map((code) => [
      {
        text: code,
        callback_data: `account_currency:${code}`
      }
    ])
  };
}

function formatAccountsMessage(
  accounts: Array<{
    name: string;
    type: string;
    currency_code: string;
    balance: string;
  }>
): string {
  if (accounts.length === 0) {
    return [
      "У вас пока нет счетов.",
      "",
      "Отправьте /add или напишите в чат: Добавить счет — чтобы создать первый счет."
    ].join("\n");
  }

  const lines = accounts.map((account, index) => {
    const typeLabel =
      accountTypeOptions.find((item) => item.key === account.type)?.label ??
      account.type;

    return `${index + 1}. ${account.name} | ${typeLabel} | ${account.balance} ${account.currency_code}`;
  });

  return ["Ваши счета:", "", ...lines].join("\n");
}

async function resolveBotWorkspaceId(userId: string): Promise<string> {
  const workspace = await ensurePersonalWorkspace(userId);
  return workspace.id;
}

async function showAccounts(bot: TelegramBot, chatId: number, userId: string) {
  const workspaceId = await resolveBotWorkspaceId(userId);
  const accounts = await listAccounts(workspaceId);

  await bot.sendMessage(chatId, formatAccountsMessage(accounts), {
    reply_markup: { remove_keyboard: true }
  });
}

async function startAccountCreation(
  bot: TelegramBot,
  chatId: number,
  userId: string
) {
  accountDrafts.set(chatId, {
    step: "name",
    userId
  });

  await bot.sendMessage(chatId, "Введите название счета. Например: TBC card", {
    reply_markup: { remove_keyboard: true }
  });
}

export const TELEGRAM_WEBHOOK_PATH = "/api/telegram/webhook";

function registerTelegramHandlers(bot: TelegramBot): void {
  // /start, /start@bot, /start payload (deep links) — иначе приветствие не срабатывает
  bot.onText(/^\/start(?:@\S+)?(?:\s+[\s\S]*)?$/, async (message) => {
    if (!message.from || !message.chat.id) {
      return;
    }

    try {
      await registerTelegramUser(message.from);

      await sendWelcomeBannerPhoto(bot, message.chat.id);
      await sendWelcomeKeyboardCleanup(bot, message.chat.id);
    } catch (error) {
      console.error("Failed to register Telegram user (/start)", error);

      await bot.sendMessage(
        message.chat.id,
        [
          "Не удалось сохранить профиль в базе (ошибка на сервере).",
          "",
          "Частые причины: в Railway указан не тот ключ Supabase (нужен service_role, не anon), неверный SUPABASE_URL, или не применены миграции (нет таблицы app_users).",
          "Откройте Deploy Logs в Railway — там будет строка [app_users] с кодом ошибки."
        ].join("\n")
      );
    }
  });

  bot.onText(/^\/help(?:@\S+)?$/, async (message) => {
    if (!message.chat.id) {
      return;
    }

    try {
      if (message.from) {
        await registerTelegramUser(message.from);
      }

      await sendHelpMessage(bot, message.chat.id);
    } catch (error) {
      console.error("Failed to send help", error);
      await bot.sendMessage(message.chat.id, "Не удалось показать справку.");
    }
  });

  bot.onText(/^\/accounts(?:@\S+)?$/, async (message) => {
    if (!message.from) {
      return;
    }

    try {
      const user = await registerTelegramUser(message.from);
      await showAccounts(bot, message.chat.id, user.id);
    } catch (error) {
      console.error("Failed to load accounts", error);
      await bot.sendMessage(
        message.chat.id,
        "Не удалось получить список счетов."
      );
    }
  });

  bot.onText(/^\/add(?:@\S+)?$/, async (message) => {
    if (!message.from || !message.chat.id) {
      return;
    }

    try {
      const user = await registerTelegramUser(message.from);
      await startAccountCreation(bot, message.chat.id, user.id);
    } catch (error) {
      console.error("Failed to start account creation", error);
      await bot.sendMessage(
        message.chat.id,
        "Не удалось начать создание счета. Попробуйте ещё раз."
      );
    }
  });

  bot.on("message", async (message) => {
    if (!message.text || !message.from) {
      return;
    }

    if (message.text.startsWith("/")) {
      return;
    }

    try {
      const user = await registerTelegramUser(message.from);

      if (message.text === "Добавить счет") {
        await startAccountCreation(bot, message.chat.id, user.id);
        return;
      }

      if (message.text === "Мои счета") {
        await showAccounts(bot, message.chat.id, user.id);
        return;
      }

      if (message.text === "Помощь") {
        await sendHelpMessage(bot, message.chat.id);
        return;
      }

      const draft = accountDrafts.get(message.chat.id);

      if (!draft) {
        return;
      }

      if (draft.step === "name") {
        draft.name = message.text.trim();

        if (!draft.name) {
          await bot.sendMessage(message.chat.id, "Название счета не может быть пустым.");
          return;
        }

        draft.step = "balance";
        accountDrafts.set(message.chat.id, draft);

        await bot.sendMessage(message.chat.id, "Теперь выберите тип счета.", {
          reply_markup: createTypeKeyboard()
        });

        return;
      }

      if (draft.step === "balance") {
        const parsedBalance = Number(message.text.replace(",", "."));

        if (Number.isNaN(parsedBalance)) {
          await bot.sendMessage(
            message.chat.id,
            "Введите число. Например: 1200 или 1200.50"
          );
          return;
        }

        if (!draft.name || !draft.type || !draft.currencyCode) {
          await bot.sendMessage(
            message.chat.id,
            "Черновик счета заполнен не полностью. Давайте начнем заново."
          );
          accountDrafts.delete(message.chat.id);
          return;
        }

        const workspaceId = await resolveBotWorkspaceId(draft.userId);
        const account = await createAccount({
          workspaceId,
          createdByUserId: draft.userId,
          name: draft.name,
          type: draft.type,
          currencyCode: draft.currencyCode,
          balance: parsedBalance
        });

        accountDrafts.delete(message.chat.id);

        await bot.sendMessage(
          message.chat.id,
          [
            "Счет создан.",
            "",
            `Название: ${account.name}`,
            `Валюта: ${account.currency_code}`,
            `Баланс: ${account.balance}`
          ].join("\n"),
          {
            reply_markup: { remove_keyboard: true }
          }
        );

        await showAccounts(bot, message.chat.id, draft.userId);
      }
    } catch (error) {
      console.error("Failed to handle message", error);
      await bot.sendMessage(
        message.chat.id,
        "Произошла ошибка при обработке сообщения."
      );
    }
  });

  bot.on("callback_query", async (query) => {
    const message = query.message;

    if (!message || !query.data || !query.from) {
      return;
    }

    const draft = accountDrafts.get(message.chat.id);

    if (!draft) {
      await bot.answerCallbackQuery(query.id, {
        text: "Черновик счета не найден. Начните заново."
      });
      return;
    }

    try {
      if (query.data.startsWith("account_type:")) {
        const type = query.data.replace("account_type:", "") as AccountType;
        draft.type = type;
        accountDrafts.set(message.chat.id, draft);

        await bot.answerCallbackQuery(query.id);
        await bot.sendMessage(message.chat.id, "Теперь выберите валюту счета.", {
          reply_markup: createCurrencyKeyboard()
        });
        return;
      }

      if (query.data.startsWith("account_currency:")) {
        const currencyCode = query.data.replace("account_currency:", "");
        draft.currencyCode = currencyCode;
        accountDrafts.set(message.chat.id, draft);

        await bot.answerCallbackQuery(query.id);
        await bot.sendMessage(
          message.chat.id,
          "Введите начальный баланс. Например: 0, 150, 99.90"
        );
      }
    } catch (error) {
      console.error("Failed to handle callback query", error);

      await bot.answerCallbackQuery(query.id, {
        text: "Не удалось обработать выбор."
      });
    }
  });
}

/**
 * Если задан APP_URL — бот работает через webhook (без getUpdates),
 * чтобы не конфликтовать с другой копией процесса (ошибка 409).
 */
export function attachTelegramBotRoutes(app: Express): TelegramBot {
  const publicBase = (env.appUrl ?? "").trim().replace(/\/+$/, "");
  const useWebhook = publicBase.length > 0;

  const bot = new TelegramBot(env.telegramBotToken, {
    polling: !useWebhook
  });

  registerTelegramHandlers(bot);
  scheduleBotCommandMenu(bot);
  scheduleBotProfile(bot);

  if (useWebhook) {
    app.post(TELEGRAM_WEBHOOK_PATH, (req, res) => {
      const secret = env.telegramWebhookSecret?.trim();

      if (secret) {
        const header =
          req.header("X-Telegram-Bot-Api-Secret-Token") ??
          req.header("x-telegram-bot-api-secret-token");

        if (header !== secret) {
          res.sendStatus(403);
          return;
        }
      }

      const body = req.body;

      if (!body || typeof body !== "object") {
        res.sendStatus(400);
        return;
      }

      bot.processUpdate(body as TelegramBot.Update);
      res.sendStatus(200);
    });
  } else {
    bot.on("polling_error", (err: Error) => {
      const msg = err.message;

      if (msg.includes("409") || msg.toLowerCase().includes("conflict")) {
        console.error(
          "[telegram] 409 Conflict: уже идёт getUpdates этим же токеном. Закройте вторую копию node/tsx или укажите APP_URL для webhook."
        );
        return;
      }

      console.error("[telegram] polling:", msg);
    });
  }

  return bot;
}

function logWebhookDeliveryHint(info: TelegramBot.WebhookInfo): void {
  const lastError =
    typeof info.last_error_message === "string"
      ? info.last_error_message
      : null;

  if (lastError) {
    console.warn(
      "[telegram] Telegram при доставке на webhook сообщает ошибку (проверьте, что процесс запущен, туннель жив и APP_URL совпадает с ним):\n%s",
      lastError
    );
  }
}

/**
 * При пустом APP_URL обязательно снимает webhook у Bot API. Иначе Telegram
 * продолжит слать обновления на старый URL (напр. мёртвый ngrok), а здесь уже
 * включён long polling — чат будет «немым» до следующего deleteWebhook вручную.
 */
export async function syncTelegramWebhook(bot: TelegramBot): Promise<void> {
  const baseUrl = (env.appUrl ?? "").trim().replace(/\/+$/, "");

  if (!baseUrl) {
    await bot.deleteWebHook();

    console.log(
      "[telegram] APP_URL не задан: webhook на стороне Telegram снят, используется long polling."
    );

    try {
      const info = await bot.getWebHookInfo();
      logWebhookDeliveryHint(info);
    } catch (error) {
      console.warn(
        "[telegram] Не удалось прочитать getWebhookInfo после снятия webhook:",
        error
      );
    }

    return;
  }

  const hookUrl = `${baseUrl}${TELEGRAM_WEBHOOK_PATH}`;

  await bot.deleteWebHook();

  const options: TelegramBot.SetWebHookOptions = {};

  if (env.telegramWebhookSecret?.trim()) {
    options.secret_token = env.telegramWebhookSecret.trim();
  }

  await bot.setWebHook(hookUrl, options);
  console.log(`[telegram] Webhook установлен: ${hookUrl}`);

  try {
    const info = await bot.getWebHookInfo();
    logWebhookDeliveryHint(info);
  } catch (error) {
    console.warn("[telegram] Не удалось прочитать getWebhookInfo:", error);
  }
}
