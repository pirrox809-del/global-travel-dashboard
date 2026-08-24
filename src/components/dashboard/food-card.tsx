'use client';

import { Utensils } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { CountryStatic } from '@/lib/types';
import { useLanguage } from '@/components/language-provider';
import { SourceBadge } from './source-badge';

const CATEGORY_STYLE: Record<string, string> = {
  main: 'bg-rose-500/10 text-rose-700 dark:text-rose-300',
  dessert: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  street: 'bg-orange-500/10 text-orange-700 dark:text-orange-300',
  drink: 'bg-teal-500/10 text-teal-700 dark:text-teal-300',
};

/** Typical dishes of the country. */
export function FoodCard({ foods }: { foods: CountryStatic['foods'] }) {
  const { t } = useLanguage();
  const categoryLabel = (cat: string | null) => {
    if (!cat) return null;
    const map: Record<string, Parameters<typeof t>[0]> = {
      main: 'food.cat.main',
      dessert: 'food.cat.dessert',
      street: 'food.cat.street',
      drink: 'food.cat.drink',
    };
    return map[cat] ? t(map[cat]) : cat;
  };
  return (
    <Card className="animate-card-in">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Utensils className="size-4 text-rose-500" />
          {t('card.food')}
        </CardTitle>
        <SourceBadge source="curated" />
      </CardHeader>
      <CardContent>
        {foods.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('food.noData')}</p>
        ) : (
          <ul className="space-y-2.5 max-h-72 overflow-y-auto scroll-soft pr-1">
            {foods.map((f) => (
              <li key={f.id} className="flex flex-col gap-1 border-b last:border-0 pb-2.5 last:pb-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-sm">🍽️ {f.name}</span>
                  {f.category ? (
                    <Badge className={`text-[10px] ${CATEGORY_STYLE[f.category] ?? ''}`} variant="secondary">
                      {categoryLabel(f.category)}
                    </Badge>
                  ) : null}
                </div>
                {f.description ? (
                  <p className="text-xs text-muted-foreground leading-snug">{f.description}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
