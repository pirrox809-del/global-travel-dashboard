'use client';

import { Badge } from '@/components/ui/badge';

/** Small "data source" pill shown in card headers for transparency. */
export function SourceBadge({ source }: { source: string }) {
  return (
    <Badge variant="outline" className="text-[9px] font-normal uppercase tracking-wider opacity-70">
      {source}
    </Badge>
  );
}
