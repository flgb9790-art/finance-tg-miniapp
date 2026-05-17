import { supabase } from "../lib/supabase.js";

export interface CurrencyRow {
  code: string;
  name: string;
  symbol: string | null;
  is_active: boolean;
  created_at: string;
}

export async function listActiveCurrencies(): Promise<CurrencyRow[]> {
  const { data, error } = await supabase
    .from("currencies")
    .select("*")
    .eq("is_active", true)
    .order("code", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as CurrencyRow[];
}

const USDT_CURRENCY_ROW: CurrencyRow = {
  code: "USDT",
  name: "Tether USDT",
  symbol: "USDT",
  is_active: true,
  created_at: ""
};

export async function getCurrencyByCode(
  code: string
): Promise<CurrencyRow | null> {
  const normalized = code.trim().toUpperCase();
  if (normalized === "USDT") {
    const fromDb = await supabase
      .from("currencies")
      .select("*")
      .eq("code", "USDT")
      .eq("is_active", true)
      .maybeSingle();
    if (fromDb.error) {
      throw fromDb.error;
    }
    if (fromDb.data) {
      return fromDb.data as CurrencyRow;
    }
    return USDT_CURRENCY_ROW;
  }

  const { data, error } = await supabase
    .from("currencies")
    .select("*")
    .eq("code", normalized)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data ?? null) as CurrencyRow | null;
}
