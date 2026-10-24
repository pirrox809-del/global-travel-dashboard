'use client';

import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { useLanguage } from './language-provider';
import { LOCALES, type Locale } from '@/lib/i18n';
import { FlagIcon } from '@/components/ui/flag-icon';

/** Compact language switcher for the header (current flag + code). */
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
          <FlagIcon locale={current.code} className="h-3 w-[18px]" />
          <span className="text-sm font-medium uppercase">{current.code}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-0" align="end">
        <Command>
          <CommandList>
            <CommandGroup>
              {LOCALES.map((l) => (
                <CommandItem
                  key={l.code}
                  value={`${l.label} ${l.code}`}
                  onSelect={() => {
                    setLocale(l.code as Locale);
                  }}
                  className="gap-2.5"
                >
                  <FlagIcon locale={l.code} />
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
