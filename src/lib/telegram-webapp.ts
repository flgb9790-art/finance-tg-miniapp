import crypto from "node:crypto";
import type { User as TelegramUser } from "node-telegram-bot-api";

export interface TelegramWebAppUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
}

export interface TelegramLoginPayload extends TelegramWebAppUser {
  auth_date: number;
  hash: string;
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

export function validateTelegramLoginData(
  payload: Record<string, string | undefined>,
  botToken: string
): TelegramLoginPayload {
  const hash = String(payload.hash ?? "").trim();
  const authDateRaw = String(payload.auth_date ?? "").trim();
  const idRaw = String(payload.id ?? "").trim();

  if (!hash || !authDateRaw || !idRaw) {
    throw new Error("Telegram login payload is incomplete");
  }

  const params = new URLSearchParams();
  Object.entries(payload).forEach(([key, value]) => {
    if (typeof value === "string" && value.length > 0) {
      params.set(key, value);
    }
  });

  const receivedHash = params.get("hash");
  if (!receivedHash) {
    throw new Error("Telegram login hash is missing");
  }

  const dataCheckString = createDataCheckString(params);
  const secretKey = crypto.createHash("sha256").update(botToken).digest();
  const calculatedHash = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  if (calculatedHash !== receivedHash) {
    throw new Error("Telegram login payload signature is invalid");
  }

  const id = Number(idRaw);
  const auth_date = Number(authDateRaw);

  if (!Number.isFinite(id) || !Number.isFinite(auth_date)) {
    throw new Error("Telegram login payload numbers are invalid");
  }

  return {
    id,
    first_name: payload.first_name,
    last_name: payload.last_name,
    username: payload.username,
    auth_date,
    hash
  };
}
