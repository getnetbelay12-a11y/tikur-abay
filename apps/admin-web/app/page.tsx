const cards = [
  'Active Trips',
  'Delayed Trips',
  'Awaiting Documents',
  'Awaiting Approval',
  'Vehicles Offline',
  'Branch Status',
];

const pages = [
  'Dashboard',
  'Shipments',
  'Dispatch',
  'Documents',
  'Agreements',
  'Tracking',
  'Incidents',
  'Compliance',
  'Customers',
  'Drivers',
  'Vehicles',
  'Reports',
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto grid max-w-7xl grid-cols-[260px_1fr] gap-6 p-6">
        <aside className="rounded-3xl bg-slate-900 p-6 text-white shadow-xl">
          <h1 className="text-2xl font-bold">Tikur Abay</h1>
          <p className="mt-2 text-sm text-slate-300">Transport Operations Platform</p>
          <nav className="mt-8 space-y-2">
            {pages.map((item) => (
              <div key={item} className="rounded-2xl px-4 py-3 text-sm hover:bg-slate-800">
                {item}
              </div>
            ))}
          </nav>
        </aside>
        <section className="space-y-6">
          <header className="rounded-3xl bg-white p-6 shadow-sm">
            <p className="text-sm font-medium uppercase tracking-wide text-amber-600">
              Operations Dashboard
            </p>
            <h2 className="mt-2 text-3xl font-bold">Freight control, dispatch, and compliance visibility</h2>
            <p className="mt-3 max-w-3xl text-sm text-slate-600">
              This MVP shell is prepared for shipment intake, document review,
              dispatch assignment, trip execution, tracking alerts, and executive reporting.
            </p>
          </header>
          <div className="grid grid-cols-3 gap-4">
            {cards.map((item) => (
              <div key={item} className="rounded-3xl bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">{item}</p>
                <p className="mt-3 text-3xl font-bold">--</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-3xl bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold">Dispatch Queue</h3>
              <ul className="mt-4 space-y-3 text-sm text-slate-600">
                <li>Shipment TA-2026-0001 waiting for assignment</li>
                <li>Shipment TA-2026-0007 delayed at checkpoint</li>
                <li>Shipment TA-2026-0011 pending compliance review</li>
              </ul>
            </div>
            <div className="rounded-3xl bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold">Management Signals</h3>
              <ul className="mt-4 space-y-3 text-sm text-slate-600">
                <li>On-time delivery rate</li>
                <li>Revenue by route</li>
                <li>Vehicle utilization</li>
                <li>Missing compliance items</li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

