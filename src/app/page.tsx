import { DashboardApp } from '@/components/dashboard-app';

/**
 * The single user-visible route.
 *
 * All the interactive logic lives in <DashboardApp /> (a client component)
 * because it uses URL search params + react-query. We keep this file a
 * server component so metadata stays on the server.
 */
export default function Home() {
  return <DashboardApp />;
}
