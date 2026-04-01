import { UsersRuntime } from '../../components/users-runtime';
import { serverApiGet } from '../../lib/server-api';

type UserRow = Record<string, unknown>;

export default async function UsersPage() {
  const users = await serverApiGet<UserRow[]>('/users').catch(() => []);

  return <UsersRuntime users={users ?? []} />;
}
