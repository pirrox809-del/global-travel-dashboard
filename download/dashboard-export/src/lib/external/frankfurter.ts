/**
 * frankfurter.ts → ora usa open.er-api.com come fonte primaria.
 *
 * Perché il cambio:
 *  - Frankfurter/BCE copre solo ~30 valute principali (no EGP, VND, PEN, BDT, ARS...).
 *  - open.er-api.com copre 166 valute (TUTTE le valute del mondo), gratis, no API key.
 *  - Aggiornato quotidianamente, basato su dati reali di mercato.
 *  - Cache 6h (come prima).
 *
 * Frankfurter resta come fallback se open.er-api.com è down.
 */
import { cache, TTL } from '@/lib/cache';

const PRIMARY = 'https://open.er-api.com/v6/latest/EUR';
const FALLBACK = 'https://api.frankfurter.dev/v1/latest?from=EUR';

export type ExchangeResult = {
  base: string;
  date: string;
  rates: Record<string, number>;
};

/** Fetch live EUR-base rates. open.er-api.com first (166 currencies), Frankfurter fallback. */
export async function getEcbRates(): Promise<ExchangeResult> {
  return cache.wrap('fx:er-api:latest', TTL.exchangeRate, async () => {
    try {
      const res = await fetch(PRIMARY, { next: { revalidate: TTL.exchangeRate } });
      if (!res.ok) throw new Error(`er-api ${res.status}`);
      const j = await res.json();
      if (!j.rates) throw new Error('er-api: no rates');
      return {
        base: 'EUR',
        date: j.date ?? new Date().toISOString().slice(0, 10),
        rates: j.rates as Record<string, number>,
      };
    } catch (err) {
      // Fallback: Frankfurter/ECB (~30 currencies only, but better than nothing).
      console.warn('[fx] er-api failed, trying Frankfurter:', (err as Error).message);
      const res = await fetch(FALLBACK, { next: { revalidate: TTL.exchangeRate } });
      if (!res.ok) throw new Error(`Frankfurter ${res.status}`);
      return (await res.json()) as ExchangeResult;
    }
  });
}

/**
 * Convert a single currency into EUR/USD/GBP. Returns null only if the
 * currency truly doesn't exist in any rate source (extremely rare with
 * 166 currencies covered).
 */
export async function convertCurrency(
  targetCurrency: string,
): Promise<{ perEur: number; perUsd: number; perGbp: number; date: string } | null> {
  const target = targetCurrency.toUpperCase();
  const ecb = await getEcbRates();
  const usdRate = ecb.rates['USD'] ?? 1;
  const gbpRate = ecb.rates['GBP'] ?? 1;

  if (target === 'EUR') {
    return { perEur: 1, perUsd: 1 / usdRate, perGbp: 1 / gbpRate, date: ecb.date };
  }
  const rate = ecb.rates[target];
  if (!rate) return null;
  return {
    perEur: rate,
    perUsd: rate / usdRate,
    perGbp: rate / gbpRate,
    date: ecb.date,
  };
}
