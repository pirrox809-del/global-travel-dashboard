'use client';

import { useMemo, useState } from 'react';
import { Check, ChevronsUpDown, MapPin, Search } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useCountryList } from '@/hooks/use-country';
import { useLanguage } from './language-provider';

type Props = {
  value: string | null;
  onChange: (code: string | null) => void;
};

/** Searchable country picker, grouped by region. Region headings are localized. */
export function CountrySelector({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useCountryList();
  const { t, trRegion } = useLanguage();

  // Group countries by region for the dropdown.
  type Item = { code: string; name: string; flagEmoji: string | null; capital: string | null };
  const grouped = useMemo<{ region: string; countries: Item[] }[]>(() => {
    if (!data) return [];
    const m = new Map<string, Item[]>();
    for (const c of data.countries) {
      const region = c.region ?? 'Other';
      if (!m.has(region)) m.set(region, []);
      m.get(region)!.push({
        code: c.code,
        name: c.name,
        flagEmoji: c.flagEmoji,
        capital: c.capital,
      });
    }
    return [...m.entries()]
      .map(([region, countries]) => ({ region, countries }))
      .sort((a, b) => a.region.localeCompare(b.region));
  }, [data]);

  const selected = data?.countries.find((c) => c.code === value) ?? null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-medium h-12"
        >
          <span className="flex items-center gap-2 truncate">
            {selected ? (
              <>
                <span className="text-xl leading-none">{selected.flagEmoji ?? '🏳️'}</span>
                <span className="truncate">{selected.name}</span>
                {selected.capital ? (
                  <span className="text-muted-foreground text-xs hidden sm:inline">— {selected.capital}</span>
                ) : null}
              </>
            ) : (
              <span className="flex items-center gap-2 text-muted-foreground">
                <Search className="size-4" /> {isLoading ? t('selector.loading') : t('selector.placeholder')}
              </span>
            )}
          </span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[320px] p-0" align="start">
        <Command>
          <CommandInput placeholder={t('selector.search')} />
          <CommandList className="max-h-[360px] scroll-soft">
            <CommandEmpty>{t('selector.empty')}</CommandEmpty>
            {grouped.map(({ region, countries }) => (
              <CommandGroup key={region} heading={trRegion(region)}>
                {countries.map((c) => (
                  <CommandItem
                    key={c.code}
                    value={`${c.name} ${c.code} ${c.capital ?? ''}`}
                    onSelect={() => {
                      onChange(c.code === value ? null : c.code);
                      setOpen(false);
                    }}
                    className="gap-2"
                  >
                    <span className="text-lg leading-none w-6 text-center">{c.flagEmoji ?? '🏳️'}</span>
                    <span className="flex-1 truncate">{c.name}</span>
                    {c.capital ? (
                      <span className="text-muted-foreground text-xs hidden sm:flex items-center gap-1">
                        <MapPin className="size-3" />
                        {c.capital}
                      </span>
                    ) : null}
                    <Check className={cn('size-4', value === c.code ? 'opacity-100' : 'opacity-0')} />
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
