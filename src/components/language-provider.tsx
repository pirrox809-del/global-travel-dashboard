'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import {
  DEFAULT_LOCALE,
  LOCALES,
  translate,
  translateRegion,
  formatDate,
  formatDateLong,
  formatTime,
  type Locale,
  type MessageKey,
} from '@/lib/i18n';

export type TFn = (key: MessageKey, params?: Record<string, string | number>) => string;

type LanguageContextValue = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: TFn;
  trRegion: (region: string) => string;
  fmt: {
    weekdayDay: (d: string) => string;
    dateLong: (d: string) => string;
    time: (d: string) => string;
  };
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

const STORAGE_KEY = 'gtd-locale';

/**
 * Detect the initial locale WITHOUT triggering a setState-in-effect.
 * On the server → default locale (stable first paint). On the client →
 * read localStorage / browser language via useSyncExternalStore, the
 * React 19 pattern for hydration-safe external reads.
 */
function subscribe() {
  return () => {};
}
function getClientSnapshot(): Locale {
  if (typeof window === 'undefined') return DEFAULT_LOCALE;
  const stored = window.localStorage.getItem(STORAGE_KEY) as Locale | null;
  if (stored && LOCALES.some((l) => l.code === stored)) return stored;
  const nav = navigator.language?.slice(0, 2).toLowerCase();
  if (nav === 'es' || nav === 'it' || nav === 'fr') return nav as Locale;
  return DEFAULT_LOCALE;
}
function getServerSnapshot(): Locale {
  return DEFAULT_LOCALE;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Hydration-safe initial locale.
  const detected = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
  const [locale, setLocaleState] = useState<Locale>(detected);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try {
      window.localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* ignore */
    }
  }, []);

  // Side-effect: keep <html lang> in sync for accessibility + SEO.
  // This is a DOM write, not a setState, so it's allowed inside useEffect.
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo<LanguageContextValue>(
    () => ({
      locale,
      setLocale,
      t: (key, params) => translate(locale, key, params),
      trRegion: (region) => translateRegion(region, locale),
      fmt: {
        weekdayDay: (d) => formatDate(d, locale),
        dateLong: (d) => formatDateLong(d, locale),
        time: (d) => formatTime(d, locale),
      },
    }),
    [locale, setLocale],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

/** Hook: access the current locale + translation function. */
export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within <LanguageProvider>');
  return ctx;
}

/** Convenience: just the `t` function. */
export function useT() {
  return useLanguage().t;
}
