import dynamic from 'next/dynamic';

const TransitorClearanceDeskRuntime = dynamic(
  () => import('../../../components/transitor-clearance-desk-runtime').then((module) => module.TransitorClearanceDeskRuntime),
  {
    loading: () => <main className="shell"><section className="djibouti-desk-shell transitor-clearance-shell"><div className="djibouti-empty-state">Loading clearance desk...</div></section></main>,
  },
);

export default function TransitorClearancePage() {
  return <TransitorClearanceDeskRuntime />;
}
