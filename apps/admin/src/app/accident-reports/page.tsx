import { AccidentReportsRuntime } from '../../components/accident-reports-runtime';
import { serverApiGet } from '../../lib/server-api';

export default async function AccidentReportsPage() {
  const incidents = await serverApiGet<Array<Record<string, unknown>>>('/incident-reports').catch(() => []);

  return <AccidentReportsRuntime incidents={incidents ?? []} />;
}
