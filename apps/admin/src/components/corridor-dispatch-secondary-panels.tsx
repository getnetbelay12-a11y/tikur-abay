'use client';

import type { DispatchTripRecord } from '../lib/corridor-dispatch-demo-data';
import { useConsoleI18n } from '../lib/use-console-i18n';

type PacketItem = {
  label: string;
  complete: boolean;
};

type PacketDownload = {
  key: string;
  label: string;
  fileName: string;
  title: string;
  subtitle: string;
  lines: string[];
};

type DispatchLivePoint = {
  locationLabel?: string;
  latestGpsAt?: string | null;
  latitude?: number;
  longitude?: number;
  speed?: number;
};

function formatDate(value: string) {
  if (!value || value === 'Not started') return value || 'Pending';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function CorridorDispatchSecondaryPanels({
  selectedTrip,
  olderCheckpoints,
  packetExtraItems,
  packetDownloads,
  downloadPacketDocument,
  selectedLivePoint,
  visibleCheckpoints,
  escalateFirstIssue,
}: {
  selectedTrip: DispatchTripRecord;
  olderCheckpoints: DispatchTripRecord['checkpoints'];
  packetExtraItems: PacketItem[];
  packetDownloads: PacketDownload[];
  downloadPacketDocument: (document: PacketDownload) => void;
  selectedLivePoint: DispatchLivePoint | null;
  visibleCheckpoints: DispatchTripRecord['checkpoints'];
  escalateFirstIssue: () => void;
}) {
  const { tx } = useConsoleI18n();

  return (
    <>
      <article className="dispatch-panel dispatch-detail-panel dispatch-packet-preview-panel">
        <header className="dispatch-panel-header">
          <div>
            <span className="dispatch-panel-eyebrow">Packet preview</span>
            <h2>Extended packet checklist</h2>
          </div>
        </header>
        <div className="dispatch-packet-check-table dispatch-packet-check-table-compact">
          {packetExtraItems.map((item) => (
            <div key={item.label} className={item.complete ? 'dispatch-packet-check-row dispatch-packet-check-row-compact is-complete' : 'dispatch-packet-check-row dispatch-packet-check-row-compact is-missing'}>
              <span>{item.label}</span>
              <strong>{item.complete ? 'Ready' : 'Missing'}</strong>
            </div>
          ))}
        </div>
        <div className="dispatch-action-rail console-gap-top-md">
          {packetDownloads.map((document) => (
            <button
              key={document.key}
              type="button"
              className="dispatch-desk-button dispatch-desk-button-secondary console-download-button"
              onClick={() => downloadPacketDocument(document)}
            >
              {document.label}
            </button>
          ))}
        </div>
      </article>

      <article className="dispatch-panel dispatch-arrival-context-panel dispatch-arrival-context-side-panel">
        <header className="dispatch-panel-header">
          <div>
            <span className="dispatch-panel-eyebrow">Arrival context</span>
            <h2>Current handoff details</h2>
          </div>
          <span className="dispatch-chip dispatch-chip-mode">{selectedTrip.arrivalReadiness.destinationNode}</span>
        </header>
        <div className="dispatch-arrival-context-list">
          <div className="dispatch-arrival-context-row">
            <span>Destination node</span>
            <strong>{selectedTrip.arrivalReadiness.destinationNode}</strong>
          </div>
          <div className="dispatch-arrival-context-row">
            <span>Expected arrival</span>
            <strong>{formatDate(selectedTrip.expectedArrivalTime)}</strong>
          </div>
          <div className="dispatch-arrival-context-row">
            <span>Unload handoff owner</span>
            <strong>{selectedTrip.arrivalReadiness.unloadHandoffOwner}</strong>
          </div>
          <div className="dispatch-arrival-context-row dispatch-arrival-context-row-wide">
            <span>Yard contact</span>
            <strong>{selectedTrip.arrivalReadiness.yardContact}</strong>
          </div>
        </div>
      </article>

      <article className="dispatch-panel dispatch-detail-panel dispatch-arrival-detail-side-panel">
        <header className="dispatch-panel-header">
          <div>
            <span className="dispatch-panel-eyebrow">Arrival context</span>
            <h2>Extended arrival details</h2>
          </div>
        </header>
        <div className="dispatch-detail-rows">
          <div className="dispatch-detail-row">
            <span>POD expectation</span>
            <strong>{selectedTrip.arrivalReadiness.podExpectation}</strong>
          </div>
          <div className="dispatch-detail-row">
            <span>Empty return instruction</span>
            <strong>{selectedTrip.arrivalReadiness.emptyReturnInstructionAvailable ? 'Available after unload' : 'Pending'}</strong>
          </div>
          <div className="dispatch-detail-row dispatch-detail-row-long">
            <span>Special handling instructions</span>
            <strong>{selectedTrip.arrivalReadiness.specialHandlingInstructions}</strong>
          </div>
          <div className="dispatch-detail-row dispatch-detail-row-long">
            <span>Dispatch note</span>
            <strong>{selectedTrip.dispatchNote}</strong>
          </div>
        </div>
      </article>

      <article className="dispatch-panel dispatch-detail-panel dispatch-detail-panel-history">
        <header className="dispatch-panel-header">
          <div>
            <span className="dispatch-panel-eyebrow">Checkpoint history</span>
            <h2>Earlier checkpoints</h2>
          </div>
        </header>
        <div className="dispatch-timeline dispatch-timeline-compact">
          {olderCheckpoints.length ? olderCheckpoints.map((event) => (
            <div key={event.id} className={`dispatch-timeline-item ${event.timestamp ? 'is-complete' : 'is-next'}`}>
              <div className="dispatch-timeline-dot" />
              <div className="dispatch-timeline-content">
                <div className="dispatch-timeline-headline">
                  <strong>{event.label}</strong>
                  <span>{event.location} · {event.status}</span>
                </div>
                <p>{event.timestamp ? formatDate(event.timestamp) : 'Pending event.'}</p>
                <p>{event.driverNote || event.officerNote || 'No checkpoint note yet.'}</p>
              </div>
            </div>
          )) : <div className="dispatch-empty-state dispatch-empty-state-compact">No earlier checkpoint history.</div>}
        </div>
      </article>

      <article className="dispatch-panel dispatch-movement-panel">
        <header className="dispatch-panel-header">
          <div>
            <span className="dispatch-panel-eyebrow">Movement</span>
            <h2>{tx('Live Movement')}</h2>
          </div>
          <span className={`dispatch-chip ${selectedTrip.delayRisk === 'High' ? 'dispatch-chip-high' : selectedTrip.delayRisk === 'Medium' ? 'dispatch-chip-medium' : 'dispatch-chip-ready'}`}>{selectedTrip.delayRisk} risk</span>
        </header>
        <div className="dispatch-movement-route-card">
          <div className="dispatch-movement-route-head">
            <span className="dispatch-panel-eyebrow">Route progress</span>
            <strong>{selectedTrip.originHandoffPoint} {'->'} {selectedTrip.inlandDestination}</strong>
          </div>
          <div className="dispatch-route-placeholder">
            <div className="dispatch-route-bar" />
            <div className="dispatch-route-points">
              <span>{selectedTrip.originHandoffPoint}</span>
              <span>{selectedTrip.liveMovement.currentLocation}</span>
              <span>{selectedTrip.inlandDestination}</span>
            </div>
          </div>
        </div>
        <div className="dispatch-movement-metric-panel">
          <div className="dispatch-movement-metric-head">
            <span className="dispatch-panel-eyebrow">Movement metrics</span>
            <strong>Current trip visibility</strong>
          </div>
          <div className="dispatch-movement-overview-row">
            <div className="dispatch-movement-overview-copy">
              <span>Corridor</span>
              <strong>{selectedTrip.liveMovement.corridorName}</strong>
            </div>
            <div className="dispatch-movement-overview-copy">
              <span>Distance to destination</span>
              <strong>{selectedTrip.liveMovement.distanceToDestinationKm} km to destination</strong>
            </div>
          </div>
          <div className="ops-field-grid dispatch-movement-metrics">
            <div className="ops-field-row"><span>Current location</span><strong>{selectedTrip.liveMovement.currentLocation}</strong></div>
            <div className="ops-field-row"><span>ETA</span><strong>{formatDate(selectedTrip.liveMovement.eta)}</strong></div>
            <div className="ops-field-row"><span>Last GPS update</span><strong>{formatDate(selectedTrip.lastGpsTimestamp)}</strong></div>
            <div className="ops-field-row"><span>Movement health</span><strong>{selectedTrip.liveMovement.movementHealth}</strong></div>
            <div className="ops-field-row dispatch-metric-row-wide"><span>Speed summary</span><strong>{selectedTrip.liveMovement.speedSummary}</strong></div>
            {selectedLivePoint ? <div className="ops-field-row dispatch-metric-row-wide"><span>Driver app</span><strong>{`${selectedLivePoint.locationLabel || 'On corridor'} · ${selectedLivePoint.latitude?.toFixed(4)}, ${selectedLivePoint.longitude?.toFixed(4)} · ${Math.round(selectedLivePoint.speed || 0)} km/h`}</strong></div> : null}
          </div>
        </div>
      </article>

      <article className="dispatch-panel dispatch-timeline-panel">
        <header className="dispatch-panel-header">
          <div>
            <span className="dispatch-panel-eyebrow">Checkpoint Timeline</span>
            <h2>{tx('Checkpoint Timeline')}</h2>
          </div>
          <span className="dispatch-chip dispatch-chip-mode">{visibleCheckpoints.length ? 'Latest checkpoint' : 'No checkpoint yet'}</span>
        </header>
        <div className="dispatch-timeline dispatch-timeline-compact">
          {visibleCheckpoints.map((event, index) => (
            <div key={event.id} className={`dispatch-timeline-item ${event.timestamp ? 'is-complete' : index === selectedTrip.checkpoints.findIndex((item) => !item.timestamp) ? 'is-current' : 'is-next'}`}>
              <div className="dispatch-timeline-dot" />
              <div className="dispatch-timeline-content">
                <div className="dispatch-timeline-headline">
                  <strong>{event.label}</strong>
                  <span>{event.location} · {event.status}</span>
                </div>
                <p>{event.timestamp ? formatDate(event.timestamp) : 'Pending event.'}</p>
                <p>{event.driverNote || event.officerNote || 'No checkpoint note yet.'}</p>
                <div className="dispatch-timeline-actions">
                  <button type="button" className="dispatch-mini-action">View details</button>
                  <button type="button" className="dispatch-mini-action" onClick={escalateFirstIssue}>Flag hold</button>
                  <button type="button" className="dispatch-mini-action">Notify</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </article>
    </>
  );
}
