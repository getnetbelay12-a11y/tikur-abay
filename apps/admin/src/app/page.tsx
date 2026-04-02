import { DemoScenarioControl } from '../components/demo-scenario-control';
import { HeadOfficeCommandCenter, type HeadOfficeCommandCenterPayload } from '../components/head-office-command-center';
import { readDemoManifest } from '../lib/demo-manifest';
import { demoScenarioToolsEnabled } from '../lib/runtime-flags';
import { ServerApiError, serverApiGet } from '../lib/server-api';

export default async function AdminHomePage() {
  const demoManifest = await readDemoManifest();
  let data: HeadOfficeCommandCenterPayload | null = null;
  let loadError = '';
  try {
    data = await serverApiGet<HeadOfficeCommandCenterPayload>('/dashboard/head-office-command-center', { revalidate: 15 });
  } catch (error) {
    loadError = error instanceof ServerApiError
      ? error.message
      : error instanceof Error
        ? error.message
        : 'The dashboard could not load its latest operational data.';
  }

  return (
    <main className="shell head-office-shell">
      {demoScenarioToolsEnabled ? <DemoScenarioControl manifest={demoManifest} /> : null}
      {data ? (
        <HeadOfficeCommandCenter data={data} />
      ) : (
        <section className="card console-card-pad">
          <div className="eyebrow">Executive Logistics Dashboard</div>
          <h1 className="console-title-tight">Dashboard data is temporarily unavailable</h1>
          <p>{loadError || 'The command center could not load its latest data. Refresh the page or verify backend connectivity.'}</p>
        </section>
      )}
    </main>
  );
}
