import { supabase } from "../lib/supabase.js";

interface OpenExchangeApiResponse {
  result: string;
  rates: Record<string, number>;
  time_last_update_utc?: string;
}

export interface ExchangeRateRow {
  base_currency_code: string;
  quote_currency_code: string;
  rate: string;
  updated_at: string;
}

export async function listActiveCurrencyCodes(): Promise<string[]> {
  const { data, error } = await supabase
    .from("currencies")
    .select("code")
    .eq("is_active", true)
    .order("code", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map((item) => item.code);
}

function roundRate(value: number): number {
  return Number(value.toFixed(8));
}

function roundAmount(value: number): number {
  return Number(value.toFixed(2));
}

export async function syncExchangeRates(): Promise<{
  syncedPairs: number;
  updatedAt: string;
}> {
  const currencyCodes = await listActiveCurrencyCodes();

  if (currencyCodes.length < 2) {
    return {
      syncedPairs: 0,
      updatedAt: new Date().toISOString()
    };
  }

  const response = await fetch("https://open.er-api.com/v6/latest/USD");

  if (!response.ok) {
    throw new Error(`Exchange rates API failed with status ${response.status}`);
  }

  const payload = (await response.json()) as OpenExchangeApiResponse;

  if (payload.result !== "success") {
    throw new Error("Exchange rates API returned unsuccessful result");
  }

  const supportedRates = currencyCodes.reduce<Record<string, number>>(
    (result, code) => {
      const apiRate = payload.rates[code];

      if (typeof apiRate === "number" && apiRate > 0) {
        result[code] = apiRate;
      }

      return result;
    },
    {
      USD: 1
    }
  );

  const upsertRows = Object.keys(supportedRates).flatMap((baseCode) =>
    Object.keys(supportedRates)
      .filter((quoteCode) => quoteCode !== baseCode)
      .map((quoteCode) => ({
        base_currency_code: baseCode,
        quote_currency_code: quoteCode,
        rate: roundRate(supportedRates[quoteCode] / supportedRates[baseCode])
      }))
  );

  if (upsertRows.length === 0) {
    return {
      syncedPairs: 0,
      updatedAt: new Date().toISOString()
    };
  }

  const { error } = await supabase
    .from("exchange_rates")
    .upsert(upsertRows, {
      onConflict: "base_currency_code,quote_currency_code"
    });

  if (error) {
    throw error;
  }

  return {
    syncedPairs: upsertRows.length,
    updatedAt: new Date().toISOString()
  };
}

export async function getExchangeRate(
  fromCurrencyCode: string,
  toCurrencyCode: string
): Promise<number> {
  if (fromCurrencyCode === toCurrencyCode) {
    return 1;
  }

  async function readRate(): Promise<number | null> {
    const { data, error } = await supabase
      .from("exchange_rates")
      .select("rate")
      .eq("base_currency_code", fromCurrencyCode)
      .eq("quote_currency_code", toCurrencyCode)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data ? Number(data.rate) : null;
  }

  const existingRate = await readRate();

  if (existingRate !== null) {
    return existingRate;
  }

  await syncExchangeRates();
  const syncedRate = await readRate();

  if (syncedRate === null) {
    throw new Error(`Exchange rate ${fromCurrencyCode} -> ${toCurrencyCode} was not found`);
  }

  return syncedRate;
}

export async function convertAmount(
  amount: number,
  fromCurrencyCode: string,
  toCurrencyCode: string
): Promise<number> {
  const rate = await getExchangeRate(fromCurrencyCode, toCurrencyCode);
  return roundAmount(amount * rate);
}

export async function getLatestExchangeRateUpdate(): Promise<string | null> {
  const { data, error } = await supabase
    .from("exchange_rates")
    .select("updated_at")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.updated_at ?? null;
}
