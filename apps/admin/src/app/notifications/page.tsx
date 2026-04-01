import { NotificationsRuntime } from '../../components/notifications-runtime';
import { serverApiGet } from '../../lib/server-api';

type NotificationRow = Record<string, unknown>;

export default async function NotificationsPage() {
  const notifications = await serverApiGet<NotificationRow[]>('/notifications').catch(() => []);

  return <NotificationsRuntime notifications={notifications ?? []} />;
}
