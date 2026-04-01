'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  formatNumber,
  formatWeight,
  type ShipmentRecord,
} from '../lib/demo-logistics';
import { buildCustomerPortalShipments, readPersistedCustomerConfirmations } from '../lib/customer-shipment-sync';
import { ShipmentFinanceReleaseJourney } from './shipment-finance-release-journey';

const shipmentTabs = ['Overview', 'Finance & Release', 'Cargo Items', 'Documents', 'Customs & Tax', 'Timeline', 'Support'] as const;

const stageDisplayOrder = [
  'Booking / Quote',
  'Origin Preparation',
  'Ocean Transit',
  'Djibouti Release',
  'Clearance Ready',
  'Truck Transit',
  'Dry Port Arrival',
  'Customer Delivery',
  'Empty Return',
  'Closed',
] as const;

function formatPortalStatus(value: string) {
  return value.replace(/_/g, ' ');
}

function normalizeShipmentStage(value: ShipmentRecord['currentStage']) {
  switch (value) {
    case 'Booking':
      return 'Booking / Quote';
    case 'Ocean':
      return 'Ocean Transit';
    case 'Djibouti':
      return 'Djibouti Release';
    case 'Inland Transit':
      return 'Truck Transit';
    case 'Dry Port':
      return 'Dry Port Arrival';
    case 'Delivery':
      return 'Customer Delivery';
    default:
      return value;
  }
}

function statusTone(text: string) {
  const value = text.toLowerCase();
  if (value.includes('closed') || value.includes('complete') || value.includes('released') || value.includes('paid')) return 'success';
  if (value.includes('overdue') || value.includes('blocked')) return 'danger';
  if (value.includes('pending') || value.includes('review') || value.includes('open')) return 'warning';
  return 'info';
}

function persistCustomerConfirmation(shipmentRef: string, confirmation: ShipmentRecord['deliveryConfirmation']) {
  if (typeof document === 'undefined') return;
  const encoded = encodeURIComponent(JSON.stringify(confirmation));
  document.cookie = `tikur_abay_customer_confirmation_${shipmentRef}=${encoded}; path=/; max-age=604800; SameSite=Lax`;
}

export function ShipmentsWorkspace() {
  const [shipments, setShipments] = useState<ShipmentRecord[]>(() => buildCustomerPortalShipments());
  const [selectedShipmentRef, setSelectedShipmentRef] = useState(() => buildCustomerPortalShipments()[0]?.shipmentRef ?? '');
  const [activeTab, setActiveTab] = useState<(typeof shipmentTabs)[number]>('Overview');
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<'all' | ShipmentRecord['currentStage']>('all');
  const [customerConfirmations, setCustomerConfirmations] = useState<Record<string, ShipmentRecord['deliveryConfirmation']>>(() => readPersistedCustomerConfirmations());

  useEffect(() => {
    const hydrate = () => {
      const nextShipments = buildCustomerPortalShipments();
      setShipments(nextShipments);
      setCustomerConfirmations(readPersistedCustomerConfirmations());
      setSelectedShipmentRef((current) => current || nextShipments[0]?.shipmentRef || '');
    };
    hydrate();
    window.addEventListener('storage', hydrate);
    window.addEventListener('focus', hydrate);
    document.addEventListener('visibilitychange', hydrate);
    return () => {
      window.removeEventListener('storage', hydrate);
      window.removeEventListener('focus', hydrate);
      document.removeEventListener('visibilitychange', hydrate);
    };
  }, []);

  useEffect(() => {
    setSelectedShipmentRef((current) => {
      if (!shipments.length) return '';
      if (shipments.some((shipment) => shipment.shipmentRef === current)) return current;
      return shipments[0]?.shipmentRef || '';
    });
  }, [shipments]);

  const filteredShipments = useMemo(() => {
    return shipments.filter((shipment) => {
      const matchesSearch = [shipment.bookingNumber, shipment.containerNumber, shipment.customerReference, shipment.route]
        .join(' ')
        .toLowerCase()
        .includes(search.trim().toLowerCase());
      const matchesStage = stageFilter === 'all' || normalizeShipmentStage(shipment.currentStage) === stageFilter;
      return matchesSearch && matchesStage;
    });
  }, [search, shipments, stageFilter]);

  const selectedShipment =
    filteredShipments.find((shipment) => shipment.shipmentRef === selectedShipmentRef) ??
    shipments.find((shipment) => shipment.shipmentRef === selectedShipmentRef) ??
    filteredShipments[0] ??
    shipments[0];

  if (!selectedShipment) {
    return (
      <section className="portal-grid portal-shipments-layout">
        <article className="portal-card">
          <div className="portal-section-header">
            <div>
              <div className="portal-section-eyebrow">Shipment list</div>
              <h2>My Shipments</h2>
            </div>
          </div>
          <p className="portal-helper-text">No shipment is available for this customer account yet.</p>
        </article>
      </section>
    );
  }

  const cargoTotals = selectedShipment.cargoItems.reduce(
    (acc, item) => {
      acc.lines += 1;
      acc.packages += item.packageQuantity;
      acc.gross += item.grossWeight;
      acc.cbm += item.cbm;
      return acc;
    },
    { lines: 0, packages: 0, gross: 0, cbm: 0 },
  );
  const customerConfirmation = customerConfirmations[selectedShipment.shipmentRef] ?? selectedShipment.deliveryConfirmation;
  const currentStageLabel = normalizeShipmentStage(selectedShipment.currentStage);

  return (
    <section className="portal-grid portal-shipments-layout">
      <article className="portal-card">
        <div className="portal-section-header">
          <div>
            <div className="portal-section-eyebrow">Shipment list</div>
            <h2>My Shipments</h2>
          </div>
        </div>
        <div className="portal-toolbar">
          <input className="portal-input" type="search" placeholder="Search booking / container / route" value={search} onChange={(event) => setSearch(event.target.value)} />
          <select className="portal-select" value={stageFilter} onChange={(event) => setStageFilter(event.target.value as 'all' | ShipmentRecord['currentStage'])}>
            <option value="all">All stages</option>
            {stageDisplayOrder.map((stage) => <option key={stage} value={stage}>{stage}</option>)}
          </select>
        </div>
        <div className="portal-shipment-list">
          {filteredShipments.length ? filteredShipments.map((shipment) => (
            <button
              key={shipment.shipmentRef}
              type="button"
              className={shipment.shipmentRef === selectedShipment.shipmentRef ? 'portal-shipment-row active' : 'portal-shipment-row'}
              onClick={() => setSelectedShipmentRef(shipment.shipmentRef)}
            >
              <div className="portal-row-head">
                <strong>{shipment.bookingNumber}</strong>
                <span className={`portal-status-chip ${statusTone(normalizeShipmentStage(shipment.currentStage))}`}>{normalizeShipmentStage(shipment.currentStage)}</span>
              </div>
              <div className="portal-meta-grid">
                <span>{shipment.containerNumber}</span>
                <span>{shipment.customerReference}</span>
              </div>
              <p>{shipment.route}</p>
              <div className="portal-row-foot">
                <span>{shipment.etaFinal}</span>
                <span className={`portal-status-chip ${shipment.exceptions.length ? 'warning' : 'success'}`}>
                  {shipment.exceptions.length ? 'Exception open' : 'Clear'}
                </span>
              </div>
            </button>
          )) : (
            <div className="portal-list-row">
              <div>
                <strong>No shipment matches this filter</strong>
                <p>Try a different stage or search by booking, container, or route.</p>
              </div>
              <span className="portal-status-chip">Awaiting filter change</span>
            </div>
          )}
        </div>
      </article>

      <div className="portal-grid portal-shipment-detail">
        <article className="portal-card">
          <div className="portal-section-header">
            <div>
              <div className="portal-section-eyebrow">Selected shipment</div>
              <h2>{selectedShipment.bookingNumber}</h2>
            </div>
            <span className={`portal-status-chip ${selectedShipment.serviceType === 'Multimodal' ? 'info' : ''}`}>{selectedShipment.serviceType}</span>
          </div>
            <div className="portal-data-grid">
            <div className="portal-data-item"><span>Booking number</span><strong>{selectedShipment.bookingNumber}</strong></div>
            <div className="portal-data-item"><span>BL number</span><strong>{selectedShipment.blNumber}</strong></div>
            <div className="portal-data-item"><span>Container number</span><strong>{selectedShipment.containerNumber}</strong></div>
            <div className="portal-data-item"><span>Seal number</span><strong>{selectedShipment.sealNumber}</strong></div>
            <div className="portal-data-item"><span>Customer</span><strong>{selectedShipment.customerName}</strong></div>
            <div className="portal-data-item"><span>Supplier</span><strong>{selectedShipment.supplierName}</strong></div>
            <div className="portal-data-item"><span>Port of loading</span><strong>{selectedShipment.portOfLoading}</strong></div>
            <div className="portal-data-item"><span>Port of discharge</span><strong>{selectedShipment.portOfDischarge}</strong></div>
            <div className="portal-data-item"><span>Final destination</span><strong>{selectedShipment.finalDestination}</strong></div>
            <div className="portal-data-item"><span>Current stage</span><strong>{currentStageLabel}</strong></div>
            <div className="portal-data-item"><span>Customer confirmation</span><strong>{formatPortalStatus(customerConfirmation.status)}</strong></div>
            <div className="portal-data-item"><span>Last updated</span><strong>{selectedShipment.lastUpdated}</strong></div>
          </div>
          <div className="portal-tab-strip">
            {shipmentTabs.map((tab) => (
              <button key={tab} type="button" className={tab === activeTab ? 'portal-tab active' : 'portal-tab'} onClick={() => setActiveTab(tab)}>
                {tab}
              </button>
            ))}
          </div>
        </article>

        {activeTab === 'Overview' ? (
          <section className="portal-grid two">
            <article className="portal-card">
              <div className="portal-section-header">
                <div>
                  <div className="portal-section-eyebrow">Overview</div>
                  <h2>Shipment overview</h2>
                </div>
              </div>
              <div className="portal-data-grid two-col">
                <div className="portal-data-item"><span>Route summary</span><strong>{selectedShipment.route}</strong></div>
                <div className="portal-data-item"><span>Vessel / ETA Djibouti</span><strong>{selectedShipment.vesselName} · {selectedShipment.etaDjibouti}</strong></div>
                <div className="portal-data-item"><span>Gate-out status</span><strong>{selectedShipment.gateOutStatus}</strong></div>
                <div className="portal-data-item"><span>Inland transport</span><strong>{selectedShipment.inlandTransportStatus}</strong></div>
                <div className="portal-data-item"><span>Dry-port status</span><strong>{selectedShipment.dryPortStatus}</strong></div>
                <div className="portal-data-item"><span>POD status</span><strong>{selectedShipment.podStatus}</strong></div>
                <div className="portal-data-item"><span>Shortage status</span><strong>{customerConfirmation.shortageStatus}</strong></div>
                <div className="portal-data-item"><span>Damage status</span><strong>{customerConfirmation.damageStatus}</strong></div>
                <div className="portal-data-item"><span>Empty return status</span><strong>{selectedShipment.emptyReturnStatus}</strong></div>
                <div className="portal-data-item"><span>Expected next step</span><strong>{selectedShipment.expectedNextStep}</strong></div>
              </div>
            </article>
            <article className="portal-card">
              <div className="portal-section-header">
                <div>
                  <div className="portal-section-eyebrow">Current status</div>
                  <h2>Milestones and issues</h2>
                </div>
              </div>
              <div className="portal-list">
                <div className="portal-list-row">
                  <div>
                    <strong>Customer contact status</strong>
                    <p>{selectedShipment.customerContactStatus}</p>
                  </div>
                  <span className="portal-status-chip info">Active</span>
                </div>
                <div className="portal-list-row">
                  <div>
                    <strong>Issue summary</strong>
                    <p>{selectedShipment.issueSummary}</p>
                  </div>
                  <span className={`portal-status-chip ${selectedShipment.exceptions.length ? 'warning' : 'success'}`}>
                    {selectedShipment.exceptions.length ? 'Needs follow-up' : 'Clear'}
                  </span>
                </div>
                <div className="portal-list-row">
                  <div>
                    <strong>Expected next step</strong>
                    <p>{selectedShipment.expectedNextStep}</p>
                  </div>
                  <span className="portal-status-chip">Next</span>
                </div>
                <div className="portal-list-row">
                  <div>
                    <strong>Risk controls</strong>
                    <p>Djibouti free time ends {selectedShipment.riskControl.freeTimeEnd}. Dry-port collection deadline {selectedShipment.riskControl.dryPortCollectionDeadline}. Empty return deadline {selectedShipment.riskControl.emptyReturnDeadline}.</p>
                  </div>
                  <span className={`portal-status-chip ${statusTone(`${selectedShipment.riskControl.demurrageRiskLevel} ${selectedShipment.riskControl.emptyReturnRiskLevel}`)}`}>
                    {selectedShipment.riskControl.demurrageRiskLevel} / {selectedShipment.riskControl.emptyReturnRiskLevel}
                  </span>
                </div>
              </div>
            </article>
            <article className="portal-card">
              <div className="portal-section-header">
                <div>
                  <div className="portal-section-eyebrow">Customer confirmation</div>
                  <h2>Receipt confirmation</h2>
                </div>
                <span className={`portal-status-chip ${customerConfirmation ? 'success' : 'warning'}`}>
                  {formatPortalStatus(customerConfirmation.status)}
                </span>
              </div>
              <div className="portal-list">
                <div className="portal-list-row">
                  <div>
                    <strong>Receipt status</strong>
                    <p>{customerConfirmation.receivedAt !== 'Pending' ? `${customerConfirmation.receivedBy} · ${customerConfirmation.receivedAt}` : 'Customer receipt has not been confirmed yet.'}</p>
                  </div>
                  <span className={`portal-status-chip ${customerConfirmation.customerActionNeeded ? 'warning' : 'success'}`}>
                    {customerConfirmation.customerActionNeeded ? 'Action needed' : 'Confirmed'}
                  </span>
                </div>
                <div className="portal-list-row">
                  <div>
                    <strong>POD and issue state</strong>
                    <p>POD is {customerConfirmation.podStatus}. Shortage is {customerConfirmation.shortageStatus}. Damage is {customerConfirmation.damageStatus}.</p>
                  </div>
                  <span className={`portal-status-chip ${customerConfirmation.claimRequired ? 'warning' : 'success'}`}>
                    {customerConfirmation.claimRequired ? 'Claim / review open' : 'No claim'}
                  </span>
                </div>
                <div className="portal-list-row">
                  <div>
                    <strong>Remarks</strong>
                    <p>{customerConfirmation.remarks}</p>
                  </div>
                  <button type="button" className="portal-btn" onClick={() => setActiveTab('Documents')}>View POD</button>
                </div>
                <div className="portal-action-row" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {[
                    ['received_clean', 'Mark goods received'],
                    ['received_with_shortage', 'Report shortage'],
                    ['received_with_damage', 'Report damage'],
                    ['received_with_shortage_and_damage', 'Report shortage + damage'],
                  ].map(([status, label]) => (
                    <button
                      key={status}
                      type="button"
                      className="portal-btn"
                      onClick={() => {
                        const nextConfirmation: ShipmentRecord['deliveryConfirmation'] = {
                          ...customerConfirmation,
                          status: status as ShipmentRecord['deliveryConfirmation']['status'],
                          receivedAt: 'Mar 19, 2026 18:45',
                          receivedBy: 'Lidya Getachew',
                          podStatus: 'verified',
                          signatureCaptured: true,
                          photoProofCaptured: true,
                          shortageStatus: status.includes('shortage') ? 'reported' : 'none',
                          damageStatus: status.includes('damage') ? 'reported' : 'none',
                          claimRequired: status !== 'received_clean',
                          customerActionNeeded: status !== 'received_clean',
                          remarks:
                            status === 'received_clean'
                              ? 'Goods received and accepted.'
                              : status === 'received_with_shortage'
                                ? 'Shortage reported at receipt. Support review requested.'
                                : status === 'received_with_damage'
                                  ? 'Damage reported at receipt. Photo review requested.'
                                  : 'Shortage and damage reported at receipt. Claim review requested.',
                        };
                        persistCustomerConfirmation(selectedShipment.shipmentRef, nextConfirmation);
                        setCustomerConfirmations((current) => ({
                          ...current,
                          [selectedShipment.shipmentRef]: nextConfirmation,
                        }));
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </article>
          </section>
        ) : null}

        {activeTab === 'Finance & Release' ? (
          <ShipmentFinanceReleaseJourney
            shipmentRef={selectedShipment.shipmentRef}
            bookingNumber={selectedShipment.bookingNumber}
            customerName={selectedShipment.customerName}
          />
        ) : null}

        {activeTab === 'Cargo Items' ? (
          <article className="portal-card">
            <div className="portal-section-header">
              <div>
                <div className="portal-section-eyebrow">Cargo items</div>
                <h2>Item-by-item cargo verification</h2>
              </div>
            </div>
            <div className="portal-cargo-list">
              {selectedShipment.cargoItems.map((item) => (
                <article key={item.id} className="portal-cargo-card">
                  <div className="portal-row-head">
                    <strong>Line {item.lineNumber}</strong>
                    <span className="portal-status-chip">{item.packageType} · {item.packageQuantity}</span>
                  </div>
                  <div className="portal-data-grid two-col">
                    <div className="portal-data-item"><span>Goods description</span><strong>{item.description}</strong></div>
                    <div className="portal-data-item"><span>HS code</span><strong>{item.hsCode}</strong></div>
                    <div className="portal-data-item"><span>Gross weight</span><strong>{formatWeight(item.grossWeight)}</strong></div>
                    <div className="portal-data-item"><span>Net weight</span><strong>{formatWeight(item.netWeight)}</strong></div>
                    <div className="portal-data-item"><span>CBM</span><strong>{item.cbm}</strong></div>
                    <div className="portal-data-item"><span>Invoice reference</span><strong>{item.invoiceReference}</strong></div>
                    <div className="portal-data-item"><span>Packing list reference</span><strong>{item.packingListReference}</strong></div>
                    <div className="portal-data-item"><span>Customs / transit reference</span><strong>{item.customsReference}</strong></div>
                    <div className="portal-data-item wide"><span>Remarks / variance</span><strong>{item.remarks}</strong></div>
                  </div>
                </article>
              ))}
            </div>
            <div className="portal-summary-strip">
              <div><span>Total lines</span><strong>{cargoTotals.lines}</strong></div>
              <div><span>Total packages</span><strong>{formatNumber(cargoTotals.packages)}</strong></div>
              <div><span>Total gross weight</span><strong>{formatWeight(cargoTotals.gross)}</strong></div>
              <div><span>Total CBM</span><strong>{cargoTotals.cbm.toFixed(1)}</strong></div>
            </div>
          </article>
        ) : null}

        {activeTab === 'Documents' ? (
          <article className="portal-card">
            <div className="portal-section-header">
              <div>
                <div className="portal-section-eyebrow">Documents</div>
                <h2>Shipment document vault</h2>
              </div>
              <span className="portal-status-chip info">{selectedShipment.documents.filter((item) => item.status !== 'Pending').length} of {selectedShipment.documents.length} linked shipment documents available</span>
            </div>
            <div className="portal-doc-list">
              {(selectedShipment.documents.length ? selectedShipment.documents : [{
                id: 'no-docs',
                shipmentRef: selectedShipment.shipmentRef,
                type: 'Document vault',
                referenceNumber: 'Not yet uploaded',
                issueDate: 'Awaiting update',
                status: 'Pending' as const,
                uploadedBy: 'Operations',
              }]).map((document) => (
                <div key={document.id} className="portal-doc-row">
                  <div>
                    <strong>{document.type}</strong>
                    <p>{document.referenceNumber} · {document.issueDate}</p>
                  </div>
                  <div className="portal-actions">
                    <span className={`portal-status-chip ${statusTone(document.status)}`}>{document.status}</span>
                    <button className="portal-btn secondary" type="button">View</button>
                    <button className="portal-btn secondary" type="button">Download</button>
                  </div>
                </div>
              ))}
            </div>
          </article>
        ) : null}

        {activeTab === 'Customs & Tax' ? (
          <section className="portal-grid two">
            <article className="portal-card">
              <div className="portal-section-header">
                <div>
                  <div className="portal-section-eyebrow">Customs & tax</div>
                  <h2>Release and declaration status</h2>
                </div>
              </div>
              <div className="portal-data-grid two-col">
                <div className="portal-data-item"><span>Customs declaration reference</span><strong>{selectedShipment.customsTax.declarationReference}</strong></div>
                <div className="portal-data-item"><span>Transit document</span><strong>{selectedShipment.customsTax.transitDocumentType} · {selectedShipment.customsTax.transitDocumentReference}</strong></div>
                <div className="portal-data-item"><span>Customs release status</span><strong>{selectedShipment.customsTax.customsReleaseStatus}</strong></div>
                <div className="portal-data-item"><span>Inspection status</span><strong>{selectedShipment.customsTax.inspectionStatus}</strong></div>
                <div className="portal-data-item"><span>Tax / duty summary</span><strong>{selectedShipment.customsTax.taxDutySummary}</strong></div>
                <div className="portal-data-item"><span>Release readiness</span><strong>{selectedShipment.customsTax.releaseReadiness}</strong></div>
              </div>
            </article>
            <article className="portal-card">
              <div className="portal-section-header">
                <div>
                  <div className="portal-section-eyebrow">Customer-friendly state</div>
                  <h2>Status and comments</h2>
                </div>
              </div>
              <div className="portal-list">
                <div className="portal-list-row">
                  <div>
                    <strong>Current state</strong>
                    <p>{selectedShipment.customsTax.comments}</p>
                  </div>
                  <span className={`portal-status-chip ${statusTone(selectedShipment.customsTax.state)}`}>{selectedShipment.customsTax.state}</span>
                </div>
                <div className="portal-list-row">
                  <div>
                    <strong>Blocked / pending / cleared</strong>
                    <p>{selectedShipment.exceptions.length ? selectedShipment.issueSummary : 'No blocking customs or tax issue is visible to the customer.'}</p>
                  </div>
                  <span className={`portal-status-chip ${selectedShipment.exceptions.length ? 'warning' : 'success'}`}>
                    {selectedShipment.exceptions.length ? 'Pending follow-up' : 'Cleared'}
                  </span>
                </div>
              </div>
            </article>
          </section>
        ) : null}

        {activeTab === 'Timeline' ? (
          <article className="portal-card">
            <div className="portal-section-header">
              <div>
                <div className="portal-section-eyebrow">Timeline</div>
                <h2>Corridor milestones</h2>
              </div>
            </div>
            <div className="portal-timeline">
              {(selectedShipment.timeline.length ? selectedShipment.timeline : [{
                id: 'timeline-empty',
                label: 'Awaiting first milestone',
                timestamp: selectedShipment.lastUpdated,
                location: 'Corridor system',
                note: 'No recent timeline update has been shared yet.',
                status: 'next' as const,
              }]).map((event) => (
                <div key={event.id} className="portal-timeline-row">
                  <div className={`portal-timeline-dot ${event.status}`} />
                  <div className="portal-timeline-content">
                    <div className="portal-row-head">
                      <strong>{event.label}</strong>
                      <span className={`portal-status-chip ${event.status === 'done' ? 'success' : event.status === 'active' ? 'info' : ''}`}>{event.timestamp}</span>
                    </div>
                    <p>{event.location}</p>
                    <p>{event.note}</p>
                  </div>
                </div>
              ))}
            </div>
          </article>
        ) : null}

        {activeTab === 'Support' ? (
          <article className="portal-card">
            <div className="portal-section-header">
              <div>
                <div className="portal-section-eyebrow">Shipment support</div>
                <h2>Shipment-linked support view</h2>
              </div>
              <div className="portal-actions">
                <button type="button" className="portal-btn">Open support</button>
                <button type="button" className="portal-btn secondary">New support request</button>
              </div>
            </div>
            <div className="portal-filter-chip-row">
              {['document', 'customs', 'delay', 'invoice', 'delivery', 'empty return', 'other'].map((category) => (
                <span key={category} className="portal-status-chip">{category}</span>
              ))}
            </div>
            <div className="portal-support-list">
              {(selectedShipment.supportThreads.length ? selectedShipment.supportThreads : [{
                id: 'empty-thread',
                shipmentRef: selectedShipment.shipmentRef,
                title: 'No active support thread',
                channel: 'Chat' as const,
                preview: 'This shipment currently has no open support conversation.',
                status: 'Resolved' as const,
                timestamp: selectedShipment.lastUpdated,
                category: 'other' as const,
              }]).map((thread) => (
                <div key={thread.id} className="portal-support-row">
                  <div>
                    <strong>{thread.title}</strong>
                    <p>{thread.preview}</p>
                    <p>{thread.timestamp}</p>
                  </div>
                  <div className="portal-actions">
                    <span className="portal-status-chip info">{thread.channel}</span>
                    <span className={`portal-status-chip ${statusTone(thread.status)}`}>{thread.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </article>
        ) : null}
      </div>
    </section>
  );
}
