import type { User as TelegramUser } from "node-telegram-bot-api";
import { supabase } from "../lib/supabase.js";

export interface TelegramAppUserRow {
  id: string;
  telegram_user_id: number;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  created_at: string;
}

export async function getAppUserById(userId: string): Promise<TelegramAppUserRow | null> {
  const { data, error } = await supabase
    .from("app_users")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data ?? null) as TelegramAppUserRow | null;
}

export async function registerTelegramUser(
  telegramUser: TelegramUser
): Promise<TelegramAppUserRow> {
  const payload = {
    telegram_user_id: telegramUser.id,
    username: telegramUser.username ?? null,
    first_name: telegramUser.first_name ?? null,
    last_name: telegramUser.last_name ?? null
  };

  const { data, error } = await supabase
    .from("app_users")
    .upsert(payload, {
      onConflict: "telegram_user_id"
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("Supabase did not return the saved user");
  }

  return data as TelegramAppUserRow;
}
