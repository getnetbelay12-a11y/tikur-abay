'use client';

import type { DispatchTripRecord } from '../lib/corridor-dispatch-demo-data';

type DispatchLivePoint = {
  locationLabel?: string;
  latestGpsAt?: string | null;
  latitude?: number;
  longitude?: number;
  speed?: number;
};

type AssignmentDraft = {
  truckPlate: string;
  trailerPlate: string;
  driverName: string;
  driverPhone: string;
};

type AssignmentPreset = {
  truckPlate: string;
  trailerPlate: string;
  driverName: string;
};

function formatDate(value: string) {
  if (!value || value === 'Not started') return value || 'Pending';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function nextStepClass(isActive: boolean) {
  return isActive ? 'supplier-next-step-button' : '';
}

function activeStepPanelClass(isActive: boolean) {
  return isActive ? 'operations-step-active' : '';
}

function transitPackReady(trip: DispatchTripRecord) {
  return trip.transitPack.packetComplete && trip.transitPack.qrGenerated;
}

export function CorridorDispatchPrimaryWorkspace({
  selectedTrip,
  selectedLivePoint,
  nextActionKey,
  nextActionTitle,
  truckAssigned,
  driverAssigned,
  departureReady,
  loadingLogged,
  packSynced,
  packetAcknowledged,
  arrivedInland,
  departed,
  arrivalReady,
  emptyReturned,
  emptyReturnConfirmed,
  latestCheckpointSealConfirmed,
  assignmentDraft,
  dispatchAssignmentPresets,
  driverOptions,
  sharedDriverPin,
  activeIssueTitle,
  activeIssueExplanation,
  activeIssueSeverity,
  arrivalReadinessTitle,
  onApplyAssignmentPreset,
  onAssignmentDraftChange,
  onAssignTruck,
  onAssignDriver,
  onMarkGoodsLoaded,
  onChangeRoute,
  onDownloadLoadingReport,
  onConfirmDeparture,
  packetPreviewItems,
  onPushPackToMobile,
  onDownloadAllRequiredDocs,
  onDownloadDriverPacket,
  onConfirmArrivedInland,
  onSendArrivalNotice,
  onConfirmUnloadContact,
  onPushToYardDesk,
  onConfirmEmptyReturnClosure,
}: {
  selectedTrip: DispatchTripRecord;
  selectedLivePoint: DispatchLivePoint | null;
  nextActionKey: string;
  nextActionTitle: string;
  truckAssigned: boolean;
  driverAssigned: boolean;
  departureReady: boolean;
  loadingLogged: boolean;
  packSynced: boolean;
  packetAcknowledged: boolean;
  arrivedInland: boolean;
  departed: boolean;
  arrivalReady: boolean;
  emptyReturned: boolean;
  emptyReturnConfirmed: boolean;
  latestCheckpointSealConfirmed: boolean;
  assignmentDraft: AssignmentDraft;
  dispatchAssignmentPresets: AssignmentPreset[];
  driverOptions: string[];
  sharedDriverPin: string;
  activeIssueTitle: string;
  activeIssueExplanation: string;
  activeIssueSeverity: string;
  arrivalReadinessTitle: string;
  onApplyAssignmentPreset: (truckPlate: string) => void;
  onAssignmentDraftChange: (next: Partial<AssignmentDraft>) => void;
  onAssignTruck: () => void;
  onAssignDriver: () => void;
  onMarkGoodsLoaded: () => void;
  onChangeRoute: () => void;
  onDownloadLoadingReport: () => void;
  onConfirmDeparture: () => void;
  packetPreviewItems: Array<{ label: string; complete: boolean }>;
  onPushPackToMobile: () => void;
  onDownloadAllRequiredDocs: () => void;
  onDownloadDriverPacket: () => void;
  onConfirmArrivedInland: () => void;
  onSendArrivalNotice: () => void;
  onConfirmUnloadContact: () => void;
  onPushToYardDesk: () => void;
  onConfirmEmptyReturnClosure: () => void;
}) {
  const arrivalStepActive = ['confirm-arrived-inland', 'send-arrival-notice', 'confirm-unload-contact', 'push-yard-handoff', 'confirm-empty-returned'].includes(nextActionKey);

  return (
    <>
      <div className="dispatch-workpane dispatch-workpane-center">
        <article className="dispatch-panel dispatch-selected-workspace">
          <header className="dispatch-panel-header dispatch-selected-header">
            <div>
              <span className="dispatch-panel-eyebrow">Selected trip</span>
              <h2>{selectedTrip.tripId}</h2>
              <p>{selectedTrip.customerName} · {selectedTrip.corridorRoute}</p>
            </div>
            <div className="dispatch-selected-badges">
              <span className={`dispatch-chip ${selectedTrip.delayRisk === 'High' ? 'dispatch-chip-high' : selectedTrip.delayRisk === 'Medium' ? 'dispatch-chip-medium' : 'dispatch-chip-ready'}`}>{selectedTrip.currentTripStatus}</span>
              <span className="dispatch-chip dispatch-chip-mode">{nextActionTitle}</span>
            </div>
          </header>
          <div className="dispatch-next-strip dispatch-next-strip-inline">
            <span className="dispatch-panel-eyebrow">Next Required Action</span>
            <strong>{nextActionTitle}</strong>
            <p>{nextActionKey === 'push-pack' ? 'Driver app remains blocked until the packet is pushed.' : nextActionKey === 'log-loading' ? 'Capture the loading completion time before the truck leaves Djibouti.' : nextActionKey === 'confirm-departure' ? 'Truck, driver, packet, and loading timestamp are ready. Dispatch can log the actual departure now.' : nextActionKey === 'confirm-arrived-inland' ? 'Trip is moving. Confirm inland arrival as soon as it reaches the inland node.' : nextActionKey === 'send-arrival-notice' ? 'Arrival is in. Notify the inland team and customer.' : nextActionKey === 'confirm-unload-contact' ? 'Confirm the unload contact before final yard handoff.' : nextActionKey === 'push-yard-handoff' ? 'Arrival controls are complete. Send the file to yard.' : nextActionKey === 'confirm-empty-returned' ? 'Yard finished the empty return cycle. Dispatch should acknowledge closure.' : nextActionKey === 'assign-driver' ? 'Truck is present but a named driver is still missing.' : 'Complete the missing assignment control to move the trip forward.'}</p>
          </div>
        </article>

        <article className={`dispatch-panel dispatch-assignment-panel ${activeStepPanelClass(['assign-truck', 'assign-driver', 'confirm-departure'].includes(nextActionKey))}`}>
          <header className="dispatch-panel-header">
            <div>
              <span className={`dispatch-panel-eyebrow ${activeStepPanelClass(['assign-truck', 'assign-driver', 'confirm-departure'].includes(nextActionKey))}`}>Assignment</span>
              <h2>Dispatch Assignment</h2>
            </div>
            <span className={`dispatch-chip ${!truckAssigned || !driverAssigned ? 'dispatch-chip-medium' : departureReady ? 'dispatch-chip-ready' : 'dispatch-chip-mode'}`}>
              {!truckAssigned ? 'Waiting truck' : !driverAssigned ? 'Waiting driver' : departureReady ? 'Ready to depart' : 'Assignment in progress'}
            </span>
          </header>
          <div className="ops-field-grid dispatch-assignment-hero-grid">
            <div className="ops-field-row"><span>Assigned truck</span><strong>{selectedTrip.assignedTruck}</strong></div>
            <div className="ops-field-row"><span>Assigned trailer</span><strong>{selectedTrip.assignedTrailer}</strong></div>
            <div className="ops-field-row"><span>Assigned driver</span><strong>{selectedTrip.assignedDriver}</strong></div>
            <div className="ops-field-row"><span>Planned departure</span><strong>{formatDate(selectedTrip.plannedDepartureTime)}</strong></div>
            <div className="ops-field-row"><span>Expected arrival</span><strong>{formatDate(selectedTrip.expectedArrivalTime)}</strong></div>
            <div className="ops-field-row"><span>Goods loaded at</span><strong>{formatDate(selectedTrip.cargoLoadedAt || '')}</strong></div>
            <div className="ops-field-row"><span>Started from Djibouti</span><strong>{formatDate(selectedTrip.departedDjiboutiAt || '')}</strong></div>
            <div className="ops-field-row"><span>Live app location</span><strong>{selectedLivePoint?.locationLabel || selectedTrip.liveMovement.currentLocation}</strong></div>
            <div className="ops-field-row"><span>Last GPS from app</span><strong>{formatDate(selectedLivePoint?.latestGpsAt || '')}</strong></div>
          </div>
          <div className="ops-field-grid dispatch-assignment-meta-grid">
            <div className="ops-field-row"><span>Driver type</span><strong>{selectedTrip.driverType}</strong></div>
            <div className="ops-field-row"><span>Carrier / partner</span><strong>{selectedTrip.partnerName}</strong></div>
            <div className="ops-field-row"><span>Route type</span><strong>{selectedTrip.routeType}</strong></div>
            <div className="ops-field-row"><span>Handoff source</span><strong>{selectedTrip.handoffSource}</strong></div>
          </div>
          <div className="dispatch-assignment-form-grid">
            <label className={`supplier-field-block ${nextActionKey === 'assign-truck' && !assignmentDraft.truckPlate.trim() ? 'supplier-next-step-field' : ''}`}>
              <span>Truck plate number</span>
              <select className="supplier-desk-input" value={assignmentDraft.truckPlate} onChange={(event) => onApplyAssignmentPreset(event.target.value)}>
                <option value="">Select truck / driver assignment</option>
                {dispatchAssignmentPresets.map((preset) => (
                  <option key={preset.truckPlate} value={preset.truckPlate}>{preset.truckPlate} · {preset.driverName}</option>
                ))}
              </select>
            </label>
            <label className="supplier-field-block">
              <span>Trailer plate number</span>
              <input className="supplier-desk-input" value={assignmentDraft.trailerPlate} onChange={(event) => onAssignmentDraftChange({ trailerPlate: event.target.value })} placeholder="Enter trailer plate number" />
            </label>
            <label className={`supplier-field-block ${nextActionKey === 'assign-driver' && !assignmentDraft.driverName.trim() ? 'supplier-next-step-field' : ''}`}>
              <span>Driver name</span>
              <input className="supplier-desk-input" value={assignmentDraft.driverName} onChange={(event) => onAssignmentDraftChange({ driverName: event.target.value })} placeholder="Enter driver full name" list="dispatch-driver-options" />
            </label>
            <label className={`supplier-field-block ${nextActionKey === 'assign-driver' && !assignmentDraft.driverPhone.trim() ? 'supplier-next-step-field' : ''}`}>
              <span>Driver phone number</span>
              <input className="supplier-desk-input" value={assignmentDraft.driverPhone} onChange={(event) => onAssignmentDraftChange({ driverPhone: event.target.value })} placeholder="Enter driver phone number" />
            </label>
            <datalist id="dispatch-driver-options">
              {driverOptions.map((driver) => <option key={driver} value={driver} />)}
            </datalist>
          </div>
          <div className="dispatch-note-block">
            <span className="dispatch-panel-eyebrow">Dispatch note</span>
            <p>{selectedTrip.dispatchNote}</p>
            <p>Driver contact: {assignmentDraft.driverName || 'Pending'}{assignmentDraft.driverPhone ? ` · ${assignmentDraft.driverPhone}` : ''}</p>
            <p>Driver mobile PIN: {sharedDriverPin}</p>
            <p>Departure log: {selectedTrip.departedDjiboutiAt ? `Driver started from Djibouti at ${formatDate(selectedTrip.departedDjiboutiAt)}` : 'Departure not logged yet.'}</p>
            <p>Live tracking: {selectedLivePoint ? `${selectedLivePoint.locationLabel || 'On corridor'} · ${selectedLivePoint.latitude?.toFixed(4)}, ${selectedLivePoint.longitude?.toFixed(4)} · ${Math.round(selectedLivePoint.speed || 0)} km/h` : 'Waiting for driver app GPS heartbeat.'}</p>
          </div>
          <div className="dispatch-action-rail">
            <button type="button" className={`dispatch-desk-button dispatch-desk-button-secondary ${nextStepClass(nextActionKey === 'assign-truck')}`} onClick={onAssignTruck} data-testid="dispatch-assign-truck">Assign truck</button>
            <button type="button" className={`dispatch-desk-button dispatch-desk-button-secondary ${nextStepClass(nextActionKey === 'assign-driver')}`} onClick={onAssignDriver} data-testid="dispatch-assign-driver">Assign driver</button>
            <button type="button" className={`dispatch-desk-button dispatch-desk-button-secondary ${nextStepClass(nextActionKey === 'log-loading')}`} onClick={onMarkGoodsLoaded} disabled={!truckAssigned || !driverAssigned} data-testid="dispatch-mark-goods-loaded">Log goods loaded</button>
            <button type="button" className="dispatch-desk-button dispatch-desk-button-secondary" onClick={onChangeRoute}>Change route</button>
            <button type="button" className="dispatch-desk-button dispatch-desk-button-secondary" onClick={onAssignDriver}>Reassign</button>
            <button type="button" className="dispatch-desk-button dispatch-desk-button-secondary console-download-button" onClick={onDownloadLoadingReport}>Download loading report</button>
            <button type="button" className={`dispatch-desk-button dispatch-desk-button-primary ${nextStepClass(nextActionKey === 'confirm-departure')}`} onClick={onConfirmDeparture} disabled={!departureReady} data-testid="dispatch-confirm-departure">Confirm departure</button>
          </div>
        </article>

        <article className={`dispatch-panel dispatch-packet-panel ${activeStepPanelClass(nextActionKey === 'push-pack')}`}>
          <header className="dispatch-panel-header">
            <div>
              <span className={`dispatch-panel-eyebrow ${activeStepPanelClass(nextActionKey === 'push-pack')}`}>Driver Packet</span>
              <h2>Transit Pack Summary</h2>
            </div>
            <span className={`dispatch-chip ${packSynced ? 'dispatch-chip-ready' : 'dispatch-chip-medium'}`}>{packSynced ? 'Synced' : 'Needs push'}</span>
          </header>
          <div className="dispatch-submodule dispatch-packet-summary-strip">
            <div className="dispatch-submodule-head">
              <span className="dispatch-panel-eyebrow">Packet status</span>
            </div>
            <div className="ops-field-grid dispatch-packet-summary-grid">
              <div className={selectedTrip.transitPack.packetComplete ? 'ops-field-row dispatch-check-item is-complete' : 'ops-field-row dispatch-check-item is-pending'}><span>Packet completeness</span><strong>{selectedTrip.transitPack.packetComplete ? 'Complete' : 'Incomplete'}</strong></div>
              <div className={packSynced ? 'ops-field-row dispatch-check-item is-complete' : 'ops-field-row dispatch-check-item is-pending'}><span>Mobile sync status</span><strong>{selectedTrip.transitPack.mobileSyncStatus}</strong></div>
              <div className="ops-field-row dispatch-check-item is-pending"><span>Driver acknowledgement</span><strong>{selectedTrip.transitPack.driverAcknowledgement}</strong></div>
              <div className="ops-field-row dispatch-check-item is-pending"><span>Last packet update</span><strong>{formatDate(selectedTrip.transitPack.lastPacketUpdate)}</strong></div>
              <div className={loadingLogged ? 'ops-field-row dispatch-check-item is-complete' : 'ops-field-row dispatch-check-item is-pending'}><span>Goods loaded timestamp</span><strong>{loadingLogged ? formatDate(selectedTrip.cargoLoadedAt || '') : 'Pending'}</strong></div>
              <div className={selectedTrip.departedDjiboutiAt ? 'ops-field-row dispatch-check-item is-complete' : 'ops-field-row dispatch-check-item is-pending'}><span>Djibouti departure timestamp</span><strong>{selectedTrip.departedDjiboutiAt ? formatDate(selectedTrip.departedDjiboutiAt) : 'Pending'}</strong></div>
            </div>
          </div>
          <div className="dispatch-submodule">
            <div className="dispatch-submodule-head">
              <div>
                <span className="dispatch-panel-eyebrow">Checklist</span>
                <strong>Driver packet readiness</strong>
              </div>
            </div>
            <div className="dispatch-packet-check-table">
              {packetPreviewItems.map((item) => (
                <div key={item.label} className={item.complete ? 'dispatch-packet-check-row is-complete' : 'dispatch-packet-check-row is-missing'}>
                  <span>{item.label}</span>
                  <strong>{item.complete ? 'Ready' : 'Missing'}</strong>
                </div>
              ))}
            </div>
          </div>
          <div className="dispatch-submodule">
            <div className="dispatch-submodule-head">
              <div>
                <span className="dispatch-panel-eyebrow">Actions</span>
                <strong>Transit pack actions</strong>
              </div>
            </div>
            <div className="dispatch-action-rail">
              <button type="button" className={`dispatch-desk-button dispatch-desk-button-primary ${nextStepClass(nextActionKey === 'push-pack')}`} onClick={onPushPackToMobile} disabled={packSynced} data-testid="dispatch-push-pack">{packSynced ? 'Pushed to driver mobile' : 'Push pack to driver mobile'}</button>
              <button type="button" className="dispatch-desk-button dispatch-desk-button-secondary" onClick={onPushPackToMobile}>Regenerate QR</button>
              <button type="button" className="dispatch-desk-button dispatch-desk-button-secondary">Preview packet</button>
              <button type="button" className="dispatch-desk-button dispatch-desk-button-secondary console-download-button" onClick={onDownloadAllRequiredDocs}>Download all required docs</button>
              <button type="button" className="dispatch-desk-button dispatch-desk-button-secondary console-download-button" onClick={onDownloadDriverPacket}>Download driver packet</button>
              <button type="button" className="dispatch-desk-button dispatch-desk-button-secondary" onClick={onPushPackToMobile}>Mark packet acknowledged</button>
            </div>
            {packetAcknowledged ? (
              <div className="dispatch-packet-acknowledgement" role="status" aria-live="polite">
                <strong>Transit pack pushed to driver mobile.</strong>
                <span>
                  {selectedTrip.assignedDriver === 'Not assigned' || selectedTrip.assignedDriver === 'Pending driver'
                    ? 'Driver pending'
                    : `${selectedTrip.assignedDriver} · ${formatDate(selectedTrip.transitPack.lastPacketUpdate)}`}
                </span>
              </div>
            ) : null}
          </div>
        </article>
      </div>

      <aside className="dispatch-workpane dispatch-workpane-right">
        <article className={`dispatch-panel dispatch-arrival-panel ${activeStepPanelClass(arrivalStepActive)}`}>
          <header className="dispatch-panel-header">
            <div>
              <span className={`dispatch-panel-eyebrow ${activeStepPanelClass(arrivalStepActive)}`}>Arrival Handoff</span>
              <h2>{arrivalReadinessTitle}</h2>
            </div>
            <span className={`dispatch-chip ${arrivalReady ? 'dispatch-chip-ready' : 'dispatch-chip-medium'}`}>{arrivalReady ? 'Ready' : 'Controls open'}</span>
          </header>
          <div className="dispatch-arrival-topline">
            <div className="dispatch-arrival-status-card">
              <span className="dispatch-panel-eyebrow">Current inland status</span>
              <strong>{arrivedInland ? 'Arrived inland (FULL_IN)' : departed ? 'Moving to inland node' : 'Waiting for departure'}</strong>
              <p>{arrivedInland ? 'Arrival controls are open for handoff and inland confirmation.' : departed ? 'Track the inland node ETA and prepare the arrival handoff.' : 'Dispatch must complete assignment and departure before arrival work can continue.'}</p>
            </div>
            <div className="dispatch-arrival-status-card">
              <span className="dispatch-panel-eyebrow">Handoff readiness</span>
              <strong>{arrivalReady ? 'Ready for yard handoff' : nextActionTitle}</strong>
              <p>{arrivalReady ? 'Transit pack, checkpoint, and arrival controls are aligned for the next desk.' : 'Complete the missing readiness controls below before final handoff.'}</p>
            </div>
          </div>
          <div className="dispatch-arrival-grid">
            <div className="dispatch-arrival-actions">
              <div className="dispatch-submodule">
                <div className="dispatch-submodule-head">
                  <div>
                    <span className="dispatch-panel-eyebrow">Arrival checklist</span>
                    <strong>Handoff readiness</strong>
                  </div>
                </div>
                <div className="dispatch-packet-check-table dispatch-arrival-checklist">
                  <div className={transitPackReady(selectedTrip) ? 'dispatch-packet-check-row is-complete' : 'dispatch-packet-check-row is-missing'}><span>Transit pack complete</span><strong>{transitPackReady(selectedTrip) ? 'Complete' : 'Pending'}</strong></div>
                  <div className={selectedTrip.checkpoints.length > 0 ? 'dispatch-packet-check-row is-complete' : 'dispatch-packet-check-row is-missing'}><span>Checkpoints updated</span><strong>{selectedTrip.checkpoints.length > 0 ? 'Updated' : 'Pending'}</strong></div>
                  <div className={latestCheckpointSealConfirmed ? 'dispatch-packet-check-row is-complete' : 'dispatch-packet-check-row is-missing'}><span>Seal intact at latest checkpoint</span><strong>{latestCheckpointSealConfirmed ? 'Yes' : 'No'}</strong></div>
                  <div className={!selectedTrip.issues.some((issue) => issue.severity === 'High') ? 'dispatch-packet-check-row is-complete' : 'dispatch-packet-check-row is-missing'}><span>No blocking issue</span><strong>{!selectedTrip.issues.some((issue) => issue.severity === 'High') ? 'Yes' : 'No'}</strong></div>
                  <div className={selectedTrip.arrivalReadiness.arrivalNoticeSent ? 'dispatch-packet-check-row is-complete' : 'dispatch-packet-check-row is-missing'}><span>Arrival notice sent</span><strong>{selectedTrip.arrivalReadiness.arrivalNoticeSent ? 'Done' : 'Pending'}</strong></div>
                  <div className={selectedTrip.arrivalReadiness.unloadContactConfirmed ? 'dispatch-packet-check-row is-complete' : 'dispatch-packet-check-row is-missing'}><span>Unload contact confirmed</span><strong>{selectedTrip.arrivalReadiness.unloadContactConfirmed ? 'Done' : 'Pending'}</strong></div>
                  <div className={arrivalReady ? 'dispatch-packet-check-row is-complete' : 'dispatch-packet-check-row is-missing'}><span>Ready for inland arrival handoff</span><strong>{arrivalReady ? 'Yes' : 'No'}</strong></div>
                </div>
              </div>
              <div className="dispatch-submodule">
                <div className="dispatch-submodule-head">
                  <div>
                    <span className="dispatch-panel-eyebrow">Actions</span>
                    <strong>Arrival controls</strong>
                  </div>
                </div>
                <div className="dispatch-arrival-cta-stack">
                  <button type="button" className={`dispatch-desk-button dispatch-desk-button-secondary ${nextStepClass(nextActionKey === 'confirm-arrived-inland')}`} onClick={onConfirmArrivedInland} disabled={!packSynced || !departed} data-testid="dispatch-confirm-arrived-inland">Confirm arrived inland</button>
                  <button type="button" className={`dispatch-desk-button dispatch-desk-button-secondary ${nextStepClass(nextActionKey === 'send-arrival-notice')}`} onClick={onSendArrivalNotice} disabled={!packSynced || !arrivedInland} data-testid="dispatch-send-arrival-notice">Send arrival notice</button>
                  <button type="button" className={`dispatch-desk-button dispatch-desk-button-secondary ${nextStepClass(nextActionKey === 'confirm-unload-contact')}`} onClick={onConfirmUnloadContact} disabled={!packSynced || !arrivedInland} data-testid="dispatch-confirm-unload-contact">Confirm unload contact</button>
                  {selectedTrip.currentTripStatus === 'Awaiting unload handoff' ? (
                    <>
                      <div className="dispatch-packet-check-row is-complete"><span>Dry-port / yard handoff</span><strong>Done</strong></div>
                      <a className="dispatch-desk-button dispatch-desk-button-primary" href={`/operations/dry-port-yard?booking=${encodeURIComponent(selectedTrip.bookingNumber)}`}>Open Dry-Port / Yard Desk</a>
                      <button type="button" className={`dispatch-desk-button dispatch-desk-button-primary ${nextStepClass(nextActionKey === 'confirm-empty-returned')}`} disabled={!emptyReturned || emptyReturnConfirmed} onClick={onConfirmEmptyReturnClosure} data-testid="dispatch-confirm-empty-returned">{emptyReturnConfirmed ? 'Empty return confirmed' : 'Confirm empty returned'}</button>
                    </>
                  ) : (
                    <button type="button" className={`dispatch-desk-button dispatch-desk-button-primary ${nextStepClass(nextActionKey === 'push-yard-handoff')}`} disabled={!arrivalReady || !packSynced} onClick={onPushToYardDesk} data-testid="dispatch-push-yard">Push to Dry-Port / Yard Desk</button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </article>

        <article className="dispatch-panel dispatch-risk-panel">
          <header className="dispatch-panel-header">
            <div>
              <span className="dispatch-panel-eyebrow">Risk</span>
              <h2>Issue monitor</h2>
            </div>
            <span className={`dispatch-chip ${activeIssueSeverity === 'High' ? 'dispatch-chip-high' : activeIssueSeverity === 'Medium' ? 'dispatch-chip-medium' : 'dispatch-chip-ready'}`}>{activeIssueSeverity}</span>
          </header>
          <div className="ops-issue-card dispatch-arrival-issue">
            <span className={`dispatch-chip ${activeIssueSeverity === 'High' ? 'dispatch-chip-high' : activeIssueSeverity === 'Medium' ? 'dispatch-chip-medium' : 'dispatch-chip-ready'}`}>{activeIssueSeverity}</span>
            <div className="ops-issue-copy">
              <strong>{activeIssueTitle}</strong>
              <p>{activeIssueExplanation}</p>
            </div>
          </div>
        </article>
      </aside>
    </>
  );
}
