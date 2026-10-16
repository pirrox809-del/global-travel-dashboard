'use client';

import { Phone, Heart, Flame, type LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { CountryStatic } from '@/lib/types';
import { useT } from '@/components/language-provider';
import { SourceBadge } from './source-badge';

type EmergencyNumbers = NonNullable<CountryStatic['content']>['emergencyNumbers'];

/** Emergency numbers card — 3 stat boxes (police/ambulance/fire) + disclaimer. */
export function EmergencyCard({ numbers }: { numbers: EmergencyNumbers }) {
  const t = useT();
  return (
    <Card className="animate-card-in">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Phone className="size-4 text-rose-500" />
          {t('card.emergency')}
        </CardTitle>
        <SourceBadge source="curated" />
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-2">
          <Box icon={Phone} label={t('emergency.police')} value={numbers?.police ?? '—'} tone="rose" />
          <Box icon={Heart} label={t('emergency.ambulance')} value={numbers?.ambulance ?? '—'} tone="amber" />
          <Box icon={Flame} label={t('emergency.fire')} value={numbers?.fire ?? '—'} tone="orange" />
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground italic">{t('emergency.disclaimer')}</p>
      </CardContent>
    </Card>
  );
}

function Box({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  tone: 'rose' | 'amber' | 'orange';
}) {
  const tones: Record<string, string> = {
    rose: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
    amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    orange: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  };
  return (
    <div className={`flex flex-col items-center justify-center rounded-lg px-2 py-3 text-center ${tones[tone]}`}>
      <Icon className="size-4" />
      <span className="mt-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="mt-0.5 text-xl font-bold tabular-nums">{value}</span>
    </div>
  );
}
