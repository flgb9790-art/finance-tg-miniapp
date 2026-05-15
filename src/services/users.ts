import type { User as TelegramUser } from "node-telegram-bot-api";
import { supabase } from "../lib/supabase.js";
import { ensurePersonalWorkspace } from "./workspaces.js";

function logSupabaseError(context: string, error: unknown): void {
  if (error && typeof error === "object") {
    const e = error as {
      message?: string;
      code?: string;
      details?: string;
      hint?: string;
    };

    console.error(`[app_users] ${context}`, {
      message: e.message,
      code: e.code,
      details: e.details,
      hint: e.hint
    });

    return;
  }

  console.error(`[app_users] ${context}`, error);
}

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
  const telegramUserId = telegramUser.id;
  const profile = {
    username: telegramUser.username ?? null,
    first_name: telegramUser.first_name ?? null,
    last_name: telegramUser.last_name ?? null
  };

  const { data: existing, error: selectError } = await supabase
    .from("app_users")
    .select("*")
    .eq("telegram_user_id", telegramUserId)
    .maybeSingle();

  if (selectError) {
    logSupabaseError("select by telegram_user_id", selectError);
    throw selectError;
  }

  if (existing) {
    const { data, error } = await supabase
      .from("app_users")
      .update(profile)
      .eq("telegram_user_id", telegramUserId)
      .select()
      .single();

    if (error) {
      logSupabaseError("update profile", error);
      throw error;
    }

    if (!data) {
      throw new Error("Supabase update returned no row");
    }

    await ensurePersonalWorkspace(data.id);
    return data as TelegramAppUserRow;
  }

  const { data: inserted, error: insertError } = await supabase
    .from("app_users")
    .insert({
      telegram_user_id: telegramUserId,
      ...profile
    })
    .select()
    .single();

  if (insertError) {
    const code = (insertError as { code?: string }).code;

    if (code === "23505") {
      const { data: afterRace, error: retryErr } = await supabase
        .from("app_users")
        .update(profile)
        .eq("telegram_user_id", telegramUserId)
        .select()
        .single();

      if (retryErr) {
        logSupabaseError("update after unique race", retryErr);
        throw retryErr;
      }

      if (!afterRace) {
        throw new Error("Supabase update after race returned no row");
      }

      await ensurePersonalWorkspace(afterRace.id);
      return afterRace as TelegramAppUserRow;
    }

    logSupabaseError("insert profile", insertError);
    throw insertError;
  }

  if (!inserted) {
    throw new Error("Supabase insert returned no row");
  }

  await ensurePersonalWorkspace(inserted.id);
  return inserted as TelegramAppUserRow;
}
