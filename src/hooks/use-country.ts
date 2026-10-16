'use client';

import { useEffect } from 'react';
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
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Fetch + cache the aggregated dashboard for one country.
 *
 * AUTO-REFETCH: when the API returns `meta.contentGenerating === true`, it
 * means the LLM content is being generated in the background (fire-and-forget).
 * The first response arrives fast (~2-3s) with all the REAL dynamic data
 * (weather, economy, earthquakes, photos) but `country.content` is null.
 * We automatically refetch every 8s until `contentGenerating` becomes false
 * (meaning the LLM content is now ready in the DB).
 *
 * This gives the user instant access to real data while the AI-curated
 * content fills in after ~15-30s.
 */
export function useCountry(code: string | null) {
  const { locale } = useLanguage();
  const query = useQuery<AggregatedCountry>({
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
    staleTime: 60 * 1000,
  });

  // Auto-refetch while LLM content is generating in the background.
  const contentGenerating = query.data?.meta?.contentGenerating === true;
  useEffect(() => {
    if (!contentGenerating) return;
    // Poll every 8s until content is ready.
    const interval = setInterval(() => {
      query.refetch();
    }, 8000);
    return () => clearInterval(interval);
  }, [contentGenerating, query]);

  return query;
}
