import dynamic from 'next/dynamic';

const CorridorDispatchRuntime = dynamic(
  () => import('../../../components/corridor-dispatch-runtime').then((module) => module.CorridorDispatchRuntime),
  {
    loading: () => <main className="shell"><section className="dispatch-desk-shell"><div className="dispatch-empty-state">Loading dispatch desk...</div></section></main>,
  },
);

export default async function DispatchDeskPage() {
  return <CorridorDispatchRuntime />;
}
