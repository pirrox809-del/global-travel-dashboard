'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X, ArrowDown } from 'lucide-react';
import { useT } from '@/components/language-provider';

/**
 * DashboardSearch — a mini search bar at the top of each country's
 * dashboard that lets users find a category instantly instead of
 * scrolling. Typing filters the category list (e.g. "wea" → "Weather"),
 * clicking a result smooth-scrolls to that section.
 *
 * The categories are matched against the `data-card="..."` attributes
 * on the dashboard sections — so adding a new section just requires
 * adding a new entry to the `CATEGORIES` array below.
 *
 * The bar is sticky (sticks under the header + country selector bar)
 * so it's always accessible while scrolling through the dashboard.
 */

type CategoryKey =
  | 'photos'
  | 'weather'
  | 'exchange'
  | 'advisory'
  | 'overview'
  | 'culture'
  | 'food'
  | 'poi'
  | 'price'
  | 'globe'
  | 'emergency'
  | 'economy'
  | 'safety'
  | 'qualityOfLife'
  | 'clothing'
  | 'seismic'
  | 'internet'
  | 'media'
  | 'famousPeople';

/** All searchable categories. The `i18nKey` is the localized label,
 *  `keywords` are extra terms that should match (e.g. "GDP" for economy). */
const CATEGORIES: { key: CategoryKey; i18nKey: string; keywords?: string[] }[] = [
  { key: 'photos', i18nKey: 'search.cat.photos', keywords: ['images', 'gallery', 'pictures', 'wikipedia'] },
  { key: 'weather', i18nKey: 'search.cat.weather', keywords: ['temperature', 'climate', 'forecast', 'meteo'] },
  { key: 'exchange', i18nKey: 'search.cat.exchange', keywords: ['currency', 'fx', 'rate', 'money'] },
  { key: 'advisory', i18nKey: 'search.cat.advisory', keywords: ['warning', 'safety', 'travel', 'state dept'] },
  { key: 'overview', i18nKey: 'search.cat.overview', keywords: ['summary', 'intro', 'brief'] },
  { key: 'culture', i18nKey: 'search.cat.culture', keywords: ['unwritten', 'rules', 'customs', 'etiquette'] },
  { key: 'food', i18nKey: 'search.cat.food', keywords: ['cuisine', 'eat', 'dish', 'meal'] },
  { key: 'poi', i18nKey: 'search.cat.poi', keywords: ['places', 'monuments', 'attractions', 'sightseeing'] },
  { key: 'price', i18nKey: 'search.cat.price', keywords: ['cost', 'budget', 'hotel', 'flight', 'prices'] },
  { key: 'globe', i18nKey: 'search.cat.globe', keywords: ['location', 'map', 'position', 'where'] },
  { key: 'emergency', i18nKey: 'search.cat.emergency', keywords: ['police', 'ambulance', 'fire', '112', '911'] },
  { key: 'economy', i18nKey: 'search.cat.economy', keywords: ['gdp', 'inflation', 'unemployment', 'world bank'] },
  { key: 'safety', i18nKey: 'search.cat.safety', keywords: ['crime', 'animals', 'dangerous'] },
  { key: 'qualityOfLife', i18nKey: 'search.cat.qualityOfLife', keywords: ['health', 'education', 'hdi', 'life'] },
  { key: 'clothing', i18nKey: 'search.cat.clothing', keywords: ['wear', 'dress', 'taxes', 'vat'] },
  { key: 'seismic', i18nKey: 'search.cat.seismic', keywords: ['earthquake', 'usgs', 'disaster'] },
  { key: 'internet', i18nKey: 'search.cat.internet', keywords: ['wifi', 'connection', 'broadband'] },
  { key: 'media', i18nKey: 'search.cat.media', keywords: ['tv', 'channels', 'television'] },
  { key: 'famousPeople', i18nKey: 'search.cat.famousPeople', keywords: ['celebrities', 'people', 'notable'] },
];

export function DashboardSearch() {
  const t = useT();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter categories by query against the localized label + keywords.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CATEGORIES;
    return CATEGORIES.filter((cat) => {
      const label = t(cat.i18nKey).toLowerCase();
      const keywords = (cat.keywords ?? []).map((k) => k.toLowerCase());
      return label.includes(q) || keywords.some((k) => k.includes(q));
    });
  }, [query, t]);

  // Reset highlight when filter changes — done in the onChange handler
  // below (avoids the `react-hooks/set-state-in-effect` lint rule that
  // fires when setState is called inside useEffect).

  // Close dropdown when clicking outside.
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Keyboard navigation: ArrowUp/Down to move highlight, Enter to select, Esc to close.
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIsOpen(true);
      setHighlightIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && isOpen && filtered[highlightIndex]) {
      e.preventDefault();
      jumpToCategory(filtered[highlightIndex].key);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  const jumpToCategory = (key: CategoryKey) => {
    const el = document.querySelector(`[data-card="${key}"]`);
    if (el) {
      // Smooth scroll, leaving a 140px offset at the top so the sticky
      // header + country selector + this search bar don't cover the section.
      const top = el.getBoundingClientRect().top + window.scrollY - 140;
      window.scrollTo({ top, behavior: 'smooth' });
      // Briefly highlight the section so the user sees what was found.
      el.classList.add('ring-2', 'ring-amber-400/60', 'rounded-xl');
      setTimeout(() => {
        el.classList.remove('ring-2', 'ring-amber-400/60', 'rounded-xl');
      }, 1500);
    }
    setIsOpen(false);
    setQuery('');
    inputRef.current?.blur();
  };

  return (
    <div
      ref={containerRef}
      className="relative z-30 w-full"
    >
      <div className="relative flex items-center">
        <Search className="pointer-events-none absolute left-3.5 size-4 text-muted-foreground/70" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setHighlightIndex(0); // reset highlight when filter changes
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={t('search.placeholder')}
          aria-label={t('search.ariaLabel')}
          className="h-10 w-full rounded-xl border border-border/50 bg-card/60 pl-10 pr-10 text-sm text-foreground placeholder:text-muted-foreground/70 backdrop-blur-xl transition-colors focus:border-amber-500/60 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
        />
        {query ? (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              inputRef.current?.focus();
            }}
            aria-label={t('search.clear')}
            className="absolute right-3 flex size-5 items-center justify-center rounded-full text-muted-foreground/70 transition-colors hover:bg-foreground/10 hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        ) : null}
      </div>

      {isOpen && filtered.length > 0 ? (
        <div className="absolute left-0 right-0 top-full mt-1.5 max-h-80 overflow-y-auto rounded-xl border border-border/50 bg-card/95 shadow-2xl shadow-black/20 backdrop-blur-xl">
          {filtered.map((cat, i) => (
            <button
              key={cat.key}
              type="button"
              onClick={() => jumpToCategory(cat.key)}
              onMouseEnter={() => setHighlightIndex(i)}
              className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                i === highlightIndex
                  ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300'
                  : 'text-foreground hover:bg-foreground/5'
              }`}
            >
              <span className="font-medium">{t(cat.i18nKey)}</span>
              <ArrowDown className="size-3.5 shrink-0 opacity-50" />
            </button>
          ))}
        </div>
      ) : isOpen && query ? (
        <div className="absolute left-0 right-0 top-full mt-1.5 rounded-xl border border-border/50 bg-card/95 px-4 py-3 text-center text-sm text-muted-foreground backdrop-blur-xl">
          {t('search.noResults')}
        </div>
      ) : null}
    </div>
  );
}
