'use client';

import { useQuery } from '@tanstack/react-query';
import type {
  AggregatedCountry,
  CountryListItem,
} from '@/lib/types';
import { useLanguage } from '@/components/language-provider';
import type { Locale } from '@/lib/i18n';

/** Fetch + cache the full country list (for the selector). */
export function useCountryList() {
  return useQuery<{ countries: CountryListItem[]; synced: boolean; count: number }>({
    queryKey: ['countries', 'list'],
    queryFn: async () => {
      const res = await fetch('/api/countries', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load country list');
      return res.json();
    },
    // The list basically never changes once synced.
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Fetch + cache the aggregated dashboard for one country.
 *
 * The locale is part of the query key: switching language triggers a refetch,
 * which may regenerate the LLM content in the new language (one-time cost,
 * then cached in the DB in that language).
 */
export function useCountry(code: string | null) {
  const { locale } = useLanguage();
  return useQuery<AggregatedCountry>({
    queryKey: ['country', code, locale as Locale],
    enabled: !!code,
    queryFn: async () => {
      const res = await fetch(`/api/countries/${code}?lang=${locale}`, { cache: 'no-store' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Failed to load country ${code}`);
      }
      return res.json();
    },
    // Dynamic data is freshness-controlled server-side; keep client staleTime
    // short so manual refetches / window-focus work but we don't spam.
    staleTime: 60 * 1000,
  });
}
