import crypto from "node:crypto";
import type { User as TelegramUser } from "node-telegram-bot-api";

export interface TelegramWebAppUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
}

function createDataCheckString(params: URLSearchParams): string {
  const pairs: string[] = [];

  for (const [key, value] of params.entries()) {
    if (key === "hash") {
      continue;
    }

    pairs.push(`${key}=${value}`);
  }

  return pairs.sort((a, b) => a.localeCompare(b)).join("\n");
}

export function validateTelegramWebAppInitData(
  initData: string,
  botToken: string
): TelegramWebAppUser {
  if (!initData) {
    throw new Error("Missing Telegram init data");
  }

  const params = new URLSearchParams(initData);
  const receivedHash = params.get("hash");

  if (!receivedHash) {
    throw new Error("Telegram init data does not contain hash");
  }

  const dataCheckString = createDataCheckString(params);
  const secretKey = crypto
    .createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest();

  const calculatedHash = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  if (calculatedHash !== receivedHash) {
    throw new Error("Telegram init data signature is invalid");
  }

  const rawUser = params.get("user");

  if (!rawUser) {
    throw new Error("Telegram init data does not contain user");
  }

  const parsedUser = JSON.parse(rawUser) as TelegramWebAppUser;

  if (!parsedUser.id) {
    throw new Error("Telegram init data contains invalid user");
  }

  return parsedUser;
}

export function toTelegramBotUser(user: TelegramWebAppUser): TelegramUser {
  return {
    id: user.id,
    is_bot: false,
    first_name: user.first_name ?? "",
    last_name: user.last_name,
    username: user.username
  };
}
