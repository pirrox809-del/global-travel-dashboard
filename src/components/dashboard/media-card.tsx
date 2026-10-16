'use client';

import { Tv } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { CountryStatic } from '@/lib/types';
import { useT } from '@/components/language-provider';
import { SourceBadge } from './source-badge';

type TvChannel = NonNullable<NonNullable<CountryStatic['content']>['tvChannels']>[number];

type TvType = 'public' | 'private' | 'news' | 'sports' | 'entertainment';

/** Color + i18n key per TV channel type.
 *  public=teal · private=violet · news=amber · sports=rose · entertainment=cyan. */
const TYPE_CONFIG: Record<
  TvType,
  { tone: string; key: 'tv.public' | 'tv.private' | 'tv.news' | 'tv.sports' | 'tv.entertainment' }
> = {
  public: { tone: 'bg-teal-500/10 text-teal-700 dark:text-teal-300', key: 'tv.public' },
  private: { tone: 'bg-violet-500/10 text-violet-700 dark:text-violet-300', key: 'tv.private' },
  news: { tone: 'bg-amber-500/10 text-amber-700 dark:text-amber-300', key: 'tv.news' },
  sports: { tone: 'bg-rose-500/10 text-rose-700 dark:text-rose-300', key: 'tv.sports' },
  entertainment: { tone: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300', key: 'tv.entertainment' },
};

/** Media card — list of TV channels with colour-coded type badges (LLM-curated). */
export function MediaCard({ channels }: { channels: TvChannel[] }) {
  const t = useT();
  if (!channels || channels.length === 0) return null;

  return (
    <Card className="animate-card-in">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Tv className="size-4 text-fuchsia-600" />
          {t('card.media')}
        </CardTitle>
        <SourceBadge source="curated" />
      </CardHeader>
      <CardContent>
        <ul className="max-h-80 space-y-0 overflow-y-auto scroll-soft">
          {channels.map((ch, i) => {
            const cfg = TYPE_CONFIG[ch.type as TvType];
            const label = cfg ? t(cfg.key) : ch.type;
            const tone = cfg?.tone ?? 'bg-muted text-muted-foreground';
            return (
              <li
                key={i}
                className="flex items-center justify-between gap-2 border-b py-1.5 text-sm last:border-0"
              >
                <span className="truncate text-foreground/90">{ch.name}</span>
                <Badge variant="outline" className={`text-[10px] font-medium ${tone}`}>
                  {label}
                </Badge>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
