'use client';

import { Check, Languages, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { useLanguage } from './language-provider';
import { LOCALES, LOCALE_NATIVE, type Locale } from '@/lib/i18n';

/** Compact language switcher for the header (globe icon + current code).
 *  Shows a searchable list of 100+ world languages. */
export function LanguageSwitcher() {
  const { locale, setLocale } = useLanguage();
  const current = LOCALES.find((l) => l.code === locale) ?? LOCALES[0];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 rounded-full bg-background/50 backdrop-blur px-2.5"
          aria-label="Change language"
        >
          <Languages className="size-4" />
          <span className="text-sm font-medium uppercase">{current.code}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="end">
        <Command>
          <div className="flex items-center border-b px-3" cmdk-input-wrapper="">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <CommandInput placeholder="Search language…" className="h-9" />
          </div>
          <CommandList className="max-h-72 overflow-y-auto">
            <CommandEmpty>No language found.</CommandEmpty>
            <CommandGroup>
              {LOCALES.map((l) => (
                <CommandItem
                  key={l.code}
                  value={`${l.label} ${l.code} ${LOCALE_NATIVE[l.code] ?? ''}`}
                  onSelect={() => {
                    setLocale(l.code as Locale);
                  }}
                  className="gap-2"
                >
                  <span className="text-base leading-none">{l.flag}</span>
                  <span className="flex-1">{l.label}</span>
                  <Check className={cn('size-4', locale === l.code ? 'opacity-100' : 'opacity-0')} />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
