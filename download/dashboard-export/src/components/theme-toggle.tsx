'use client';

import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';
import { useSyncExternalStore } from 'react';
import { Button } from '@/components/ui/button';

/**
 * Simple light/dark toggle (next-themes).
 *
 * We avoid the "setState-in-effect" anti-pattern for the mounted check by
 * using useSyncExternalStore: returns false on the server, true on the client,
 * with no cascading render. This is the React-recommended way to guard against
 * hydration mismatches for theme-dependent UI.
 */
function useMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true, // client snapshot
    () => false, // server snapshot
  );
}

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();
  if (!mounted) return <div className="size-9" aria-hidden />;
  const isDark = theme === 'dark';
  return (
    <Button
      variant="outline"
      size="icon"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="size-9 rounded-full"
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}
