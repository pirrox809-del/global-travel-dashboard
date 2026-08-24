'use client';

import { useQuery } from '@tanstack/react-query';
import type {
  AggregatedCountry,
  CountryListItem,
} from '@/lib/types';

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

/** Fetch + cache the aggregated dashboard for one country. */
export function useCountry(code: string | null) {
  return useQuery<AggregatedCountry>({
    queryKey: ['country', code],
    enabled: !!code,
    queryFn: async () => {
      const res = await fetch(`/api/countries/${code}`, { cache: 'no-store' });
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
