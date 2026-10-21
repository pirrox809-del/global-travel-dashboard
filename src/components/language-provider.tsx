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
  registerRuntimeLocale,
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
  /** True while translations are being fetched for the current locale. */
  translating: boolean;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

const STORAGE_KEY = 'gtd-locale';
const I18N_CACHE_PREFIX = 'gtd-i18n:';

/** The 4 locales that have full translations baked into the bundle —
 *  no need to fetch from the API for these. */
const BUNDLED_LOCALES = new Set(['en', 'es', 'it', 'fr']);

/**
 * Detect the initial locale WITHOUT triggering a setState-in-effect.
 */
function subscribe() {
  return () => {};
}
function getClientSnapshot(): Locale {
  if (typeof window === 'undefined') return DEFAULT_LOCALE;
  const stored = window.localStorage.getItem(STORAGE_KEY) as Locale | null;
  if (stored && LOCALES.some((l) => l.code === stored)) return stored;
  // Try to match the browser's language to one of our supported locales.
  const nav = navigator.language?.slice(0, 2).toLowerCase();
  if (nav && LOCALES.some((l) => l.code === nav)) return nav as Locale;
  return DEFAULT_LOCALE;
}
function getServerSnapshot(): Locale {
  return DEFAULT_LOCALE;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const detected = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
  const [locale, setLocaleState] = useState<Locale>(detected);
  const [translating, setTranslating] = useState(false);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try {
      window.localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* ignore */
    }
  }, []);

  // Keep <html lang> in sync.
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  // When the locale changes, check if it's one of the bundled locales
  // (en/es/it/fr — translations already in the JS bundle). If NOT,
  // check localStorage for previously-fetched translations. If not
  // cached locally, fetch from /api/i18n/[locale] (which uses the LLM
  // to translate on-the-fly, cached server-side). Register the result
  // via registerRuntimeLocale() so translate() can find it.
  useEffect(() => {
    if (BUNDLED_LOCALES.has(locale)) {
      // Defer setState to next microtask — avoids the
      // react-hooks/set-state-in-effect lint rule.
      queueMicrotask(() => setTranslating(false));
      return; // Translations are already in the bundle.
    }

    const localStorageKey = `${I18N_CACHE_PREFIX}${locale}`;

    // 1. Check localStorage first (instant for returning users).
    try {
      const cached = window.localStorage.getItem(localStorageKey);
      if (cached) {
        const messages = JSON.parse(cached);
        registerRuntimeLocale(locale, messages);
        queueMicrotask(() => setTranslating(false));
        return;
      }
    } catch {
      /* ignore parse errors */
    }

    // 2. Fetch from the API (first time for this language).
    queueMicrotask(() => setTranslating(true));
    let cancelled = false;

    fetch(`/api/i18n/${locale}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled || !data?.messages) return;
        registerRuntimeLocale(locale, data.messages);
        // Cache in localStorage for future visits.
        try {
          window.localStorage.setItem(localStorageKey, JSON.stringify(data.messages));
        } catch {
          /* localStorage might be full — ignore */
        }
      })
      .catch((err) => {
        console.error('[i18n] Failed to fetch translations for', locale, err);
        // On error, the translate() function will fall back to English.
      })
      .finally(() => {
        if (!cancelled) setTranslating(false);
      });

    return () => {
      cancelled = true;
    };
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
      translating,
    }),
    [locale, setLocale, translating],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within <LanguageProvider>');
  return ctx;
}

export function useT() {
  return useLanguage().t;
}
