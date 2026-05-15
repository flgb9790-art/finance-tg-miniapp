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

const MEMORY_RATE_TTL_MS = 10 * 60 * 1000;
const memoryRateCache = new Map<string, { rate: number; expiresAt: number }>();

function memoryRateCacheKey(fromCurrencyCode: string, toCurrencyCode: string): string {
  return `${fromCurrencyCode}:${toCurrencyCode}`;
}

export function invalidateExchangeRateMemoryCache(): void {
  memoryRateCache.clear();
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

  invalidateExchangeRateMemoryCache();

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

  const cacheKey = memoryRateCacheKey(fromCurrencyCode, toCurrencyCode);
  const cached = memoryRateCache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.rate;
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
    memoryRateCache.set(cacheKey, {
      rate: existingRate,
      expiresAt: Date.now() + MEMORY_RATE_TTL_MS
    });
    return existingRate;
  }

  await syncExchangeRates();
  const syncedRate = await readRate();

  if (syncedRate === null) {
    throw new Error(`Exchange rate ${fromCurrencyCode} -> ${toCurrencyCode} was not found`);
  }

  memoryRateCache.set(cacheKey, {
    rate: syncedRate,
    expiresAt: Date.now() + MEMORY_RATE_TTL_MS
  });

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

export interface SpotlightQuoteRow {
  code: string;
  displayUnit: number;
  label: string;
  /** Сколько единиц базовой валюты за `displayUnit` единиц валюты строки (средний курс). */
  amountInBase: number;
  /** Сколько единиц валюты строки за 1 единицу базовой валюты. */
  quotePerBase: number;
}

const SPOTLIGHT_QUOTE_DEFS: Array<{ code: string; displayUnit: number }> = [
  { code: "USD", displayUnit: 1 },
  { code: "EUR", displayUnit: 1 },
  { code: "RUB", displayUnit: 100 }
];

export async function getSpotlightQuotesForBase(
  baseCurrencyCode: string
): Promise<{
  base: string;
  rows: SpotlightQuoteRow[];
  ratesUpdatedAt: string | null;
}> {
  const base = baseCurrencyCode.trim().toUpperCase();
  const rows: SpotlightQuoteRow[] = [];

  for (const def of SPOTLIGHT_QUOTE_DEFS) {
    if (def.code === base) {
      continue;
    }

    const perUnitOfCodeInBase = await getExchangeRate(def.code, base);
    const quotePerBase = await getExchangeRate(base, def.code);
    const amountInBase = Number(
      (perUnitOfCodeInBase * def.displayUnit).toFixed(6)
    );

    const label =
      def.displayUnit === 100
        ? `100 ${def.code}`
        : `1 ${def.code}`;

    rows.push({
      code: def.code,
      displayUnit: def.displayUnit,
      label,
      amountInBase,
      quotePerBase: Number(quotePerBase.toFixed(8))
    });
  }

  return {
    base,
    rows,
    ratesUpdatedAt: await getLatestExchangeRateUpdate()
  };
}

export async function convertFxPreview(
  amount: number,
  fromCurrencyCode: string,
  toCurrencyCode: string
): Promise<{ converted: number; rate: number }> {
  const from = fromCurrencyCode.trim().toUpperCase();
  const to = toCurrencyCode.trim().toUpperCase();

  if (!Number.isFinite(amount)) {
    throw new Error("Amount must be a finite number");
  }

  const rate = await getExchangeRate(from, to);
  const converted = Number((amount * rate).toFixed(6));

  return { converted, rate };
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
