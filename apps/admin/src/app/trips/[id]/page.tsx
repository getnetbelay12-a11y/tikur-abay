import Link from 'next/link';
import { formatDateTime, formatLocation, formatPerson, formatPhone, formatText } from '../../../lib/formatters';
import { serverApiGet } from '../../../lib/server-api';

type TripDetail = {
  tripCode?: string;
  customer?: string;
  driver?: string;
  driverPhone?: string | null;
  vehicle?: string;
  route?: string;
  cargo?: string | null;
  origin?: string | null;
  destination?: string | null;
  status?: string;
  startTime?: string | null;
  completionTime?: string | null;
  eta?: string | null;
  documents?: Array<{ id: string; title?: string; status?: string; type?: string; createdAt?: string | null; fileUrl?: string }>;
  timeline?: Array<{ id: string; title?: string; timestamp?: string | null; source?: string | null; location?: string | null; note?: string | null }>;
};

export default async function TripDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const trip = await serverApiGet<TripDetail>(`/trips/${id}`).catch(() => null);
  const tripCode = formatText(trip?.tripCode, 'Trip Detail');
  const routeLabel = `${formatLocation(trip?.origin)} -> ${formatLocation(trip?.destination)}`;
  const documents = trip?.documents ?? [];
  const timeline = trip?.timeline ?? [];

  return (
    <main className="shell">
      <div className="panel workspace-shell">
        <section className="card workspace-detail-card">
          <h1 style={{ marginTop: 0 }}>{tripCode}</h1>
          <div className="label">{routeLabel} · {formatText(trip?.status, 'Status not recorded').replace(/_/g, ' ')}</div>
        </section>
        <section className="workspace-split-grid">
          <section className="card workspace-detail-card">
            <div className="workspace-section-header">
              <div>
                <div className="eyebrow">Trip Context</div>
                <h3>Operational summary</h3>
              </div>
            </div>
            <div className="workspace-metric-pair-grid">
              <MetricPair label="Customer" value={formatText(trip?.customer)} />
              <MetricPair label="Driver" value={formatPerson(trip?.driver)} />
              <MetricPair label="Driver phone" value={formatPhone(trip?.driverPhone)} />
              <MetricPair label="Vehicle" value={formatText(trip?.vehicle)} />
              <MetricPair label="Route" value={formatText(trip?.route)} />
              <MetricPair label="Cargo" value={formatText(trip?.cargo, 'Cargo not recorded')} />
              <MetricPair label="Status" value={formatText(trip?.status, 'Status not recorded').replace(/_/g, ' ')} />
              <MetricPair label="Start time" value={formatDateTime(trip?.startTime)} />
              <MetricPair label="Completion / ETA" value={trip?.completionTime ? formatDateTime(trip?.completionTime) : formatDateTime(trip?.eta)} />
              <MetricPair label="Documents" value={String(documents.length)} />
            </div>
          </section>

          <section className="card workspace-detail-card">
            <div className="workspace-section-header">
              <div>
                <div className="eyebrow">Documents</div>
                <h3>Linked trip files</h3>
              </div>
            </div>
            {!documents.length ? (
              <div className="empty-state inline-state-card"><p>No trip documents are available.</p></div>
            ) : (
              <div className="workspace-detail-list">
                {documents.map((document) => (
                  <div key={document.id} className="workspace-detail-row">
                    <div className="workspace-cell-stack">
                      <strong>{formatText(document.title, 'Trip document')}</strong>
                      <span>{formatText(document.type, 'Document')} · {formatDateTime(document.createdAt)}</span>
                    </div>
                    <div className="workspace-cell-stack" style={{ justifyItems: 'end' }}>
                      <span className="status-badge info">{formatText(document.status, 'ready')}</span>
                      {document.fileUrl && document.fileUrl !== '#' ? <Link href={document.fileUrl} className="inline-action">Open</Link> : <span className="label">File not attached</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </section>

        <section className="card workspace-detail-card">
          <div className="workspace-section-header">
            <div>
              <div className="eyebrow">Timeline</div>
              <h3>Trip execution history</h3>
            </div>
          </div>
          {!timeline.length ? (
            <div className="empty-state inline-state-card"><p>No timeline updates are available for this trip.</p></div>
          ) : (
            <div className="workspace-detail-list">
              {timeline.map((event) => (
                <div key={event.id} className="workspace-detail-row">
                  <div className="workspace-cell-stack">
                    <strong>{formatText(event.title, 'Status update')}</strong>
                    <span>{formatDateTime(event.timestamp)}</span>
                  </div>
                  <div className="workspace-cell-stack" style={{ justifyItems: 'end' }}>
                    <span>{formatPerson(event.source)}</span>
                    <span className="label">{event.location ? formatLocation(event.location) : formatText(event.note, 'Location not recorded')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function MetricPair({ label, value }: { label: string; value: string }) {
  return (
    <div className="workspace-metric-pair">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
