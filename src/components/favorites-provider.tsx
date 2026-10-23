'use client';

import {
  createContext,
  useCallback,
  useContext,
  useSyncExternalStore,
  type ReactNode,
} from 'react';

/**
 * FavoritesProvider — manages the user's favourite countries (stored in
 * localStorage). Used by:
 *  - the hero card's star toggle (add/remove favourite)
 *  - the country selector (favourites sorted first in the dropdown)
 *  - the home empty state (favourites shown as quick-pick buttons)
 */

const FAVORITES_KEY = 'gtd-favorites';

// ─── External store pattern (hydration-safe) ───────────────────────────

let favoritesState: string[] = loadFavorites();
const listeners = new Set<() => void>();

function loadFavorites(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(FAVORITES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveFavorites(favs: string[]) {
  favoritesState = favs;
  try {
    window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
  } catch {
    /* ignore */
  }
  // Notify all subscribers (triggers React re-render).
  for (const listener of listeners) listener();
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function getSnapshot(): string[] {
  return favoritesState;
}

function getServerSnapshot(): string[] {
  return [];
}

// ─── Context ────────────────────────────────────────────────────────────

type FavoritesContextValue = {
  favorites: string[];
  isFavorite: (code: string) => boolean;
  toggleFavorite: (code: string) => void;
};

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const favorites = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const isFavorite = useCallback(
    (code: string) => favorites.includes(code),
    [favorites],
  );

  const toggleFavorite = useCallback((code: string) => {
    const current = getSnapshot();
    const next = current.includes(code)
      ? current.filter((c) => c !== code)
      : [...current, code];
    saveFavorites(next);
  }, []);

  return (
    <FavoritesContext.Provider value={{ favorites, isFavorite, toggleFavorite }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites must be used within <FavoritesProvider>');
  return ctx;
}
