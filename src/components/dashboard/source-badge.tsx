'use client';

import { Badge } from '@/components/ui/badge';
import { useT } from '@/components/language-provider';

/** Small "data source" pill shown in card headers for transparency.
 *  The source label is localized via the i18n dictionary. */
export function SourceBadge({ source }: { source: string }) {
  const t = useT();
  // Map raw source identifiers to translation keys.
  const keyMap: Record<string, Parameters<typeof t>[0]> = {
    'open-meteo': 'source.open-meteo',
    'frankfurter · ECB': 'source.frankfurter',
    'us-state-dept': 'source.us-state-dept',
    'ai · curated': 'source.aiCurated',
    'llm · estimate': 'source.llmEstimate',
    curated: 'source.curated',
    unavailable: 'source.unavailable',
  };
  const label = keyMap[source] ? t(keyMap[source]) : source;
  return (
    <Badge variant="outline" className="text-[9px] font-normal uppercase tracking-wider opacity-70">
      {label}
    </Badge>
  );
}
