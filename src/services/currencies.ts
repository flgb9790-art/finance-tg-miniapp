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

export async function getCurrencyByCode(
  code: string
): Promise<CurrencyRow | null> {
  const { data, error } = await supabase
    .from("currencies")
    .select("*")
    .eq("code", code.toUpperCase())
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data ?? null) as CurrencyRow | null;
}
