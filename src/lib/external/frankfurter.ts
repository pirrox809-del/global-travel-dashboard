/**
 * frankfurter.ts — Exchange rates via the Frankfurter API (https://frankfurter.app).
 *
 * Why this API:
 *  - 100% free, no API key, no rate limits of practical concern for our scale.
 *  - Reference rates published daily by the European Central Bank (ECB).
 *
 * We resolve the country's currency code (from our DB) and convert 1 EUR
 * (or 1 USD) into that currency. Cached 6 hours — ECB publishes once per
 * business day around 16:00 CET, but we cache conservatively.
 */
import { cache, TTL } from '@/lib/cache';

const BASE = 'https://api.frankfurter.dev/v1';

export type ExchangeResult = {
  base: string; // e.g. "EUR"
  date: string; // YYYY-MM-DD of the rate
  rates: Record<string, number>; // currency -> amount for 1 base
};

/** Fetch live ECB rates with EUR as base. Cached 6h. */
export async function getEcbRates(): Promise<ExchangeResult> {
  return cache.wrap('fx:ecb:latest', TTL.exchangeRate, async () => {
    const res = await fetch(`${BASE}/latest?from=EUR`, { next: { revalidate: TTL.exchangeRate } });
    if (!res.ok) throw new Error(`Frankfurter latest ${res.status}`);
    return (await res.json()) as ExchangeResult;
  });
}

/**
 * Convert a single currency into EUR/USD/GBP. Returns null if the currency
 * isn't traded on ECB (rare — e.g. some territories with no independent currency).
 */
export async function convertCurrency(
  targetCurrency: string,
): Promise<{ perEur: number; perUsd: number; perGbp: number; date: string } | null> {
  const target = targetCurrency.toUpperCase();
  const ecb = await getEcbRates();
  if (target === 'EUR') {
    const usdRate = ecb.rates['USD'] ?? 1;
    const gbpRate = ecb.rates['GBP'] ?? 1;
    return { perEur: 1, perUsd: 1 / usdRate, perGbp: 1 / gbpRate, date: ecb.date };
  }
  const rate = ecb.rates[target];
  if (!rate) return null;
  const usdRate = ecb.rates['USD'] ?? 1;
  const gbpRate = ecb.rates['GBP'] ?? 1;
  return {
    perEur: rate,
    perUsd: rate / usdRate, // cross-rate via EUR
    perGbp: rate / gbpRate,
    date: ecb.date,
  };
}
