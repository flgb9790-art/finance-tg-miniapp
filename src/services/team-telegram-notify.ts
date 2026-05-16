import type TelegramBot from "node-telegram-bot-api";
import { env } from "../config/env.js";
import { getAppUserById, type TelegramAppUserRow } from "./users.js";

let botRef: TelegramBot | null = null;

export function setTeamNotifyTelegramBot(bot: TelegramBot): void {
  botRef = bot;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatMemberName(user: TelegramAppUserRow): string {
  const name = [user.first_name, user.last_name].filter(Boolean).join(" ").trim();

  if (name) {
    return name;
  }

  if (user.username) {
    return `@${user.username}`;
  }

  return "Новый участник";
}

function buildOpenAppMarkup(): TelegramBot.InlineKeyboardMarkup | undefined {
  const base = (env.appUrl ?? "").trim().replace(/\/+$/, "");

  if (!base) {
    return undefined;
  }

  return {
    inline_keyboard: [[{ text: "Открыть Balancy", web_app: { url: `${base}/mini-app/` } }]]
  };
}

async function sendToAppUser(
  appUserId: string,
  text: string,
  markup?: TelegramBot.InlineKeyboardMarkup
): Promise<void> {
  const bot = botRef;

  if (!bot) {
    return;
  }

  const user = await getAppUserById(appUserId);

  if (!user?.telegram_user_id) {
    return;
  }

  try {
    await bot.sendMessage(user.telegram_user_id, text, {
      parse_mode: "HTML",
      reply_markup: markup
    });
  } catch (error) {
    console.warn("[telegram] team join notify failed for app user %s:", appUserId, error);
  }
}

export async function notifyTeamJoinAccepted(options: {
  joined: boolean;
  workspaceName: string;
  memberAppUser: TelegramAppUserRow;
  ownerAppUserId: string;
}): Promise<void> {
  if (!options.joined) {
    return;
  }

  const teamName = escapeHtml(options.workspaceName.trim() || "Команда");
  const markup = buildOpenAppMarkup();

  await sendToAppUser(
    options.memberAppUser.id,
    [
      `<b>Вы добавлены в команду «${teamName}»</b>`,
      "",
      "Переключитесь на командное пространство в приложении — там общие счета и операции."
    ].join("\n"),
    markup
  );

  if (options.ownerAppUserId === options.memberAppUser.id) {
    return;
  }

  const memberLabel = escapeHtml(formatMemberName(options.memberAppUser));

  await sendToAppUser(
    options.ownerAppUserId,
    [
      `<b>${memberLabel} вступил в команду «${teamName}»</b>`,
      "",
      "Участник может видеть и вести общую книгу команды."
    ].join("\n"),
    markup
  );
}
