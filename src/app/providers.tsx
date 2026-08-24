'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { useState, type ReactNode } from 'react';

/** Client-side providers: TanStack Query (server state) + next-themes (dark mode). */
export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Dynamic data (weather/fx/advisory) has server-side TTLs; on the
            // client we refetch on focus to feel "live" but avoid hammering.
            staleTime: 60 * 1000,
            refetchOnWindowFocus: true,
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={client}>
      <NextThemesProvider
        attribute="class"
        defaultTheme="light"
        enableSystem={false}
        disableTransitionOnChange
      >
        {children}
      </NextThemesProvider>
    </QueryClientProvider>
  );
}
