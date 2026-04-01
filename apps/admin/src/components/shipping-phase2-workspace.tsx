'use client';

import Link from 'next/link';
import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { readSession } from '../lib/auth-session';
import { ShippingBillDocument, type ShippingBillDocumentData } from './shipping-bill-document';
import type { ShippingBillOfLadingPdfPayload } from '../lib/shipping-pdf';
import {
  approveShippingInstruction,
  approveShippingBillOfLading,
  assignShippingCarrierSchedule,
  canOperateShippingAction,
  finalizeShippingBillOfLading,
  generateShippingManifest,
  readShippingPhase1Workspace,
  shippingActionOwner,
  shippingCtaLabel,
  shippingStageLabel,
  shippingPhase1UpdatedEvent,
  submitShippingInstruction,
  updateShippingBillDraft,
  updateShippingInstructionDraft,
  type ShippingBillOfLadingRecord,
  type ShippingInstructionRecord,
  type ShippingManifestRecord,
} from '../lib/shipping-phase1';
import { downloadBillOfLadingPdf, downloadShippingManifestPdf, downloadSimpleShippingPdf, openBillOfLadingPrintView, printBillOfLadingOriginals } from '../lib/shipping-pdf';
import { sharedQuoteStorageUpdatedEvent } from '../lib/shared-quote-storage';

type ShippingPhase2Focus = 'instructions' | 'bills-of-lading' | 'manifest';
const shippingBillPrintStateStorageKey = 'tikur-abay:shipping-phase2:bill-print-state';

type ShippingBillPrintState = Record<string, { originalPrinted?: boolean; originalsPrinted?: boolean; copyPrinted?: boolean }>;

type DocumentCopilotState = {
  score: number;
  status: 'ready' | 'watch' | 'blocked';
  headline: string;
  blockers: string[];
  recommendations: string[];
  actionLabel?: string;
  actionTone?: 'primary' | 'secondary';
};

function formatDate(value: string) {
  if (!value) return 'Pending';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function titleForFocus(focus: ShippingPhase2Focus) {
  if (focus === 'instructions') return 'Shipping Instructions';
  if (focus === 'bills-of-lading') return 'Bills of Lading';
  return 'Manifest';
}

function nextStepClass(isActive: boolean) {
  return isActive ? 'supplier-next-step-button' : '';
}

function isShippingInstructionReady(record: ShippingInstructionRecord | null) {
  if (!record) return false;
  return [
    record.shipperName,
    record.consigneeName,
    record.notifyParty,
    record.cargoDescription,
    record.hsCode,
    record.containerNumber,
    record.sealNumber,
    record.packageSummary,
    record.grossWeight,
    record.measurementCbm,
    record.portOfLoading,
    record.portOfDischarge,
    record.placeOfReceipt,
    record.placeOfDelivery,
    record.incoterm,
  ].every((value) => String(value || '').trim().length > 0);
}

function deriveInstructionCopilot(record: ShippingInstructionRecord | null) : DocumentCopilotState {
  if (!record) {
    return {
      score: 0,
      status: 'blocked',
      headline: 'No shipping instruction file is active.',
      blockers: ['Shipping instruction starts only after booking conversion.'],
      recommendations: ['Select a booking file to prepare the shipping instruction pack.'],
    };
  }
  const blockers: string[] = [];
  const recommendations: string[] = [];
  let score = 100;
  if (!record.shipperName || !record.consigneeName || !record.containerNumber) {
    blockers.push('Core SI parties or container references are missing.');
    score -= 24;
  }
  if (!record.hsCode || !record.cargoDescription) {
    blockers.push('Cargo description and HS code must be complete before approval.');
    score -= 18;
  }
  if (record.status === 'draft') {
    recommendations.push('Save and submit the SI to move the document pack into approval.');
    score -= 8;
  } else if (record.status === 'submitted') {
    recommendations.push('Approve the SI so BL drafting can unlock.');
  } else {
    recommendations.push('SI is approved. Continue with BL control.');
  }
  return {
    score: Math.max(0, score),
    status: blockers.length ? 'blocked' : score < 90 ? 'watch' : 'ready',
    headline: record.status === 'approved' ? 'Shipping instruction is cleared for the next document gate.' : 'Shipping instruction readiness is guiding the BL gate.',
    blockers,
    recommendations,
    actionLabel: record.status === 'draft' ? shippingCtaLabel('submit_si') : record.status === 'submitted' ? shippingCtaLabel('approve_si') : undefined,
    actionTone: record.status === 'submitted' ? 'primary' : 'secondary',
  };
}

function deriveBillCopilot(
  record: ShippingBillOfLadingRecord | null,
  hasSchedule: boolean,
  printState: ShippingBillPrintState[string] | undefined,
): DocumentCopilotState {
  if (!record) {
    return {
      score: 0,
      status: 'blocked',
      headline: 'No BL file is active.',
      blockers: ['BL drafting starts only after booking confirmation and SI progression.'],
      recommendations: ['Select a booking file to manage the BL workflow.'],
    };
  }
  const blockers: string[] = [];
  const recommendations: string[] = [];
  let score = 100;
  if (!hasSchedule) {
    blockers.push('Carrier schedule is not assigned, so vessel and voyage are not locked.');
    score -= 24;
  }
  if (record.blockedReason) {
    blockers.push(record.blockedReason);
    score -= 20;
  }
  if (!record.houseBlNumber || !record.masterBlNumber) {
    blockers.push('House BL and carrier BL references must both be complete.');
    score -= 18;
  }
  if (record.status === 'draft') {
    recommendations.push('Approve the BL draft once schedule and references are aligned.');
  } else if (record.status === 'approved') {
    recommendations.push('Finalize the BL so manifest generation can unlock.');
  } else if (record.status === 'final' && !printState?.originalPrinted) {
    recommendations.push('Print or save the original BL set and verify the output.');
    score -= 8;
  } else {
    recommendations.push('BL is finalized. Continue into manifest generation or distribution.');
  }
  return {
    score: Math.max(0, score),
    status: blockers.length ? 'blocked' : score < 92 ? 'watch' : 'ready',
    headline: record.status === 'final' ? 'Bill of lading is finalized and ready for downstream release.' : 'BL gate is controlling the voyage document flow.',
    blockers,
    recommendations,
    actionLabel:
      !hasSchedule ? shippingCtaLabel('assign_schedule')
      : record.status === 'draft' ? shippingCtaLabel('approve_bl')
      : record.status === 'approved' ? shippingCtaLabel('finalize_bl')
      : !printState?.originalPrinted ? 'Print / Save Original BL'
      : undefined,
    actionTone:
      record.status === 'approved' || record.status === 'draft' ? 'primary' : 'secondary',
  };
}

function deriveManifestCopilot(
  group: {
    status: 'pending' | 'generated';
    blockedReason: string;
    bookings: string[];
    totalContainers: number;
  } | null,
  groupRecords: ShippingManifestRecord[],
): DocumentCopilotState {
  if (!group) {
    return {
      score: 0,
      status: 'blocked',
      headline: 'No manifest voyage is active.',
      blockers: ['Manifest control needs at least one voyage-linked booking.'],
      recommendations: ['Select a voyage group to review manifest readiness.'],
    };
  }
  const blockers: string[] = [];
  const recommendations: string[] = [];
  let score = 100;
  if (group.status !== 'generated' && group.blockedReason) {
    blockers.push(group.blockedReason);
    score -= 24;
  }
  if (group.status !== 'generated' && groupRecords.some((item) => Boolean(item.blockedReason))) {
    blockers.push('At least one booking in this voyage still blocks manifest generation.');
    score -= 18;
  }
  if (!group.totalContainers) {
    blockers.push('No container lines are attached to this voyage group.');
    score -= 18;
  }
  if (group.status !== 'generated') {
    recommendations.push('Generate the voyage manifest once every linked BL is final.');
    score -= 10;
  } else {
    recommendations.push('Manifest is generated. Download and distribute the voyage pack.');
  }
  return {
    score: Math.max(0, score),
    status: blockers.length ? 'blocked' : score < 92 ? 'watch' : 'ready',
    headline: group.status === 'generated' ? 'Voyage manifest is ready for issue and sharing.' : 'Manifest readiness depends on every linked BL gate.',
    blockers,
    recommendations,
    actionLabel: group.status !== 'generated' ? shippingCtaLabel('generate_manifest') : 'Download manifest PDF',
    actionTone: group.status !== 'generated' ? 'primary' : 'secondary',
  };
}

function buildBillPdfPayload(
  documentData: ShippingBillDocumentData,
  options: {
    bookingReference: string;
    freightTerm: 'prepaid' | 'collect';
    seaFreight: string;
    clearanceFreight: string;
    inlandFreight: string;
    outputLabel: string;
    printVariant: 'original' | 'copy';
    fileName: string;
  },
): ShippingBillOfLadingPdfPayload {
  return {
    fileName: options.fileName,
    bookingReference: options.bookingReference,
    documentTitle: 'Multimodal Transport Bill of Lading',
    blNumber: documentData.blNumber,
    masterBlNumber: documentData.carrierBlNumber,
    slotCarrierBillNumber: documentData.slotCarrierBillNumber,
    issueDate: documentData.dateOfIssue,
    placeOfIssue: documentData.placeOfIssue,
    shipper: documentData.shipper,
    consignee: documentData.consignee,
    notifyParty: documentData.notifyParty,
    portOfLoading: documentData.portOfLoading,
    portOfDischarge: documentData.portOfDischarge,
    placeOfReceipt: documentData.placeOfReceipt,
    placeOfDelivery: documentData.placeOfDelivery,
    vessel: documentData.vessel,
    voyage: documentData.voyage,
    shippedOnBoardDate: documentData.shippedOnBoardDate,
    incoterm: documentData.incoterm,
    freightTerm: options.freightTerm,
    containerNumber: documentData.containers[0]?.no || '',
    sealNumber: documentData.containers[0]?.seal || '',
    containerType: '40HQ',
    packages: documentData.containers[0]?.packages || '',
    weight: documentData.containers[0]?.weight || '',
    measurementCbm: documentData.measurementCbm,
    marksAndNumbers: documentData.marksAndNumbers,
    cargoDescription: documentData.containers[0]?.description || '',
    hsCode: documentData.hsCode,
    tinNumber: documentData.tinNumber,
    tinAreaCode: documentData.tinAreaCode,
    lcNumber: documentData.lcNumber,
    numberOfOriginalBills: documentData.numberOfOriginalBills,
    seaFreight: options.seaFreight,
    clearanceFreight: options.clearanceFreight,
    inlandFreight: options.inlandFreight,
    outputLabel: options.outputLabel,
    printVariant: options.printVariant,
  };
}

export function ShippingPhase2Workspace({ focus }: { focus: ShippingPhase2Focus }) {
  const [workspace, setWorkspace] = useState(() => readShippingPhase1Workspace());
  const [sessionRole, setSessionRole] = useState(() => readSession()?.role ?? null);
  const [search, setSearch] = useState('');
  const [selectedBookingId, setSelectedBookingId] = useState('');
  const [selectedManifestKey, setSelectedManifestKey] = useState('');
  const [billPrintState, setBillPrintState] = useState<ShippingBillPrintState>({});
  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(shippingBillPrintStateStorageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as ShippingBillPrintState;
      setBillPrintState(parsed && typeof parsed === 'object' ? parsed : {});
    } catch {
      window.localStorage.removeItem(shippingBillPrintStateStorageKey);
    }
  }, []);

  function updateBillPrintState(bookingId: string, patch: Partial<ShippingBillPrintState[string]>) {
    setBillPrintState((current) => {
      const next = {
        ...current,
        [bookingId]: {
          ...(current[bookingId] || {}),
          ...patch,
        },
      };
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(shippingBillPrintStateStorageKey, JSON.stringify(next));
      }
      return next;
    });
  }

  useEffect(() => {
    const reload = () => setWorkspace(readShippingPhase1Workspace());
    reload();
    setSessionRole(readSession()?.role ?? null);
    window.addEventListener(sharedQuoteStorageUpdatedEvent, reload as EventListener);
    window.addEventListener(shippingPhase1UpdatedEvent, reload as EventListener);
    return () => {
      window.removeEventListener(sharedQuoteStorageUpdatedEvent, reload as EventListener);
      window.removeEventListener(shippingPhase1UpdatedEvent, reload as EventListener);
    };
  }, []);

  const bookings = useMemo(() => {
    const needle = deferredSearch.trim().toLowerCase();
    return workspace.bookings.filter((booking) => {
      if (!needle) return true;
      return [booking.bookingId, booking.quoteId, booking.customerName, booking.routeSummary].join(' ').toLowerCase().includes(needle);
    });
  }, [deferredSearch, workspace.bookings]);

  const selectedBooking = bookings.find((item) => item.bookingId === selectedBookingId) || bookings[0] || null;
  const selectedQuote = workspace.quotes.find((item) => item.bookingId === selectedBooking?.bookingId) || null;
  const selectedInstruction = workspace.instructions.find((item) => item.bookingId === selectedBooking?.bookingId) || null;
  const selectedBill = workspace.billsOfLading.find((item) => item.bookingId === selectedBooking?.bookingId) || null;
  const selectedManifest = workspace.manifests.find((item) => item.bookingId === selectedBooking?.bookingId) || null;
  const selectedCarrierSchedule = workspace.carrierSchedules.find((item) => item.vesselName === selectedBill?.vesselName && item.voyageNumber === selectedBill?.voyageNumber) || null;
  const manifestGroups = useMemo(() => {
    const needle = deferredSearch.trim().toLowerCase();
    const groups = new Map<string, {
      key: string;
      vesselName: string;
      voyageNumber: string;
      status: 'pending' | 'generated';
      generatedAt: string;
      blockedReason: string;
      bookings: string[];
      customers: string[];
      totalContainers: number;
      totalWeight: number;
    }>();
    workspace.manifests.forEach((manifest) => {
      const bill = workspace.billsOfLading.find((item) => item.bookingId === manifest.bookingId);
      const key = `${manifest.vesselName}__${manifest.voyageNumber}`;
      const haystack = [manifest.vesselName, manifest.voyageNumber, manifest.bookingId, bill?.customerName || ''].join(' ').toLowerCase();
      if (needle && !haystack.includes(needle)) return;
      const current = groups.get(key) || {
        key,
        vesselName: manifest.vesselName,
        voyageNumber: manifest.voyageNumber,
        status: manifest.status,
        generatedAt: manifest.generatedAt,
        blockedReason: manifest.blockedReason,
        bookings: [],
        customers: [],
        totalContainers: 0,
        totalWeight: 0,
      };
      current.status = current.status === 'generated' || manifest.status === 'generated' ? 'generated' : 'pending';
      current.generatedAt = current.generatedAt || manifest.generatedAt;
      current.blockedReason = current.status === 'generated' ? '' : current.blockedReason || manifest.blockedReason;
      current.bookings.push(manifest.bookingId);
      if (bill?.customerName) current.customers.push(bill.customerName);
      current.totalContainers += manifest.totalContainers;
      current.totalWeight += manifest.totalWeight;
      groups.set(key, current);
    });
    return Array.from(groups.values()).sort((a, b) => a.vesselName.localeCompare(b.vesselName) || a.voyageNumber.localeCompare(b.voyageNumber));
  }, [deferredSearch, workspace.billsOfLading, workspace.manifests]);
  const selectedManifestGroup =
    manifestGroups.find((item) => item.key === selectedManifestKey) ||
    (selectedManifest
      ? manifestGroups.find((item) => item.key === `${selectedManifest.vesselName}__${selectedManifest.voyageNumber}`) || null
      : null) ||
    manifestGroups[0] ||
    null;

  useEffect(() => {
    if (!selectedBookingId && bookings[0]?.bookingId) {
      setSelectedBookingId(bookings[0].bookingId);
    }
  }, [bookings, selectedBookingId]);

  useEffect(() => {
    if (focus !== 'manifest' || selectedManifestKey) return;
    const selectedBookingManifestKey = selectedManifest ? `${selectedManifest.vesselName}__${selectedManifest.voyageNumber}` : '';
    if (selectedBookingManifestKey) {
      setSelectedManifestKey(selectedBookingManifestKey);
      return;
    }
    if (manifestGroups[0]?.key) {
      setSelectedManifestKey(manifestGroups[0].key);
    }
  }, [focus, manifestGroups, selectedManifest, selectedManifestKey]);

  return (
    <main className="shell">
      <section className="supplier-desk-shell">
        <header className="supplier-desk-header">
          <div className="supplier-desk-title">
            <span className="supplier-desk-eyebrow">Shipping Phase 2</span>
            <h1>{titleForFocus(focus)}</h1>
            <p>Booking-driven shipping documents with strict dependency gates across SI, BL, and manifest.</p>
          </div>
          <div className="supplier-desk-toolbar">
            <input className="supplier-desk-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search booking, quote, customer, route" />
          </div>
        </header>

        <nav className="supplier-jump-links">
          <Link className="supplier-jump-link" href="/shipping/carrier-schedules">Carrier Schedules</Link>
          <Link className="supplier-jump-link" href="/shipping/after-sales">After-Sales</Link>
          <Link className="supplier-jump-link" href="/shipping/finance">Finance</Link>
          <Link className={focus === 'instructions' ? 'supplier-jump-link is-active' : 'supplier-jump-link'} href="/shipping/instructions">Shipping Instructions</Link>
          <Link className={focus === 'bills-of-lading' ? 'supplier-jump-link is-active' : 'supplier-jump-link'} href="/shipping/bills-of-lading">Bills of Lading</Link>
          <Link className={focus === 'manifest' ? 'supplier-jump-link is-active' : 'supplier-jump-link'} href="/shipping/manifest">Manifest</Link>
          <Link className="supplier-jump-link" href="/shipping/tracking">Tracking</Link>
          <Link className="supplier-jump-link" href="/shipping">Full workspace</Link>
        </nav>

        <section className="shipping-phase2-layout">
          {focus === 'manifest' ? (
            <article className="supplier-panel">
              <header className="supplier-panel-header">
                <div>
                  <span className="supplier-panel-eyebrow">Voyages</span>
                  <h2>Manifest queue</h2>
                </div>
                <p>{manifestGroups.length} voyages</p>
              </header>
              <div className="supplier-queue-list shipping-phase2-queue">
                {manifestGroups.map((group) => (
                  <button key={group.key} type="button" className={group.key === selectedManifestGroup?.key ? 'supplier-queue-row active' : 'supplier-queue-row'} onClick={() => setSelectedManifestKey(group.key)}>
                    <div className="supplier-queue-topline">
                      <strong>{group.vesselName}</strong>
                      <span className={`status-badge ${group.status === 'generated' ? 'good' : 'warning'}`}>{group.status}</span>
                    </div>
                    <span>{group.voyageNumber}</span>
                    <span>{group.bookings.length} bookings · {group.totalContainers} containers</span>
                  </button>
                ))}
              </div>
            </article>
          ) : (
            <article className="supplier-panel">
              <header className="supplier-panel-header">
                <div>
                  <span className="supplier-panel-eyebrow">Bookings</span>
                  <h2>Shipping document queue</h2>
                </div>
                <p>{bookings.length} files</p>
              </header>
              <div className="supplier-queue-list shipping-phase2-queue">
                {bookings.map((booking) => (
                  <button key={booking.bookingId} type="button" className={booking.bookingId === selectedBooking?.bookingId ? 'supplier-queue-row active' : 'supplier-queue-row'} onClick={() => setSelectedBookingId(booking.bookingId)}>
                    <div className="supplier-queue-topline">
                      <strong>{booking.bookingId}</strong>
                      <span className="status-badge info">{shippingStageLabel(booking.currentStage)}</span>
                    </div>
                    <span>{booking.customerName}</span>
                    <span>{booking.routeSummary}</span>
                  </button>
                ))}
              </div>
            </article>
          )}

          <div className="shipping-phase2-focus-column">
            {focus === 'instructions' ? <ShippingInstructionPanel record={selectedInstruction} /> : null}
            {focus === 'bills-of-lading' ? <ShippingBillPanel record={selectedBill} /> : null}
            {focus === 'manifest' ? <ShippingManifestPanel record={selectedManifest} group={selectedManifestGroup} /> : null}
          </div>
        </section>
      </section>
    </main>
  );

  function ShippingInstructionPanel({ record }: { record: ShippingInstructionRecord | null }) {
    const [draft, setDraft] = useState({
      shipperName: '',
      consigneeName: '',
      notifyParty: '',
      cargoDescription: '',
      hsCode: '',
      containerNumber: '',
      sealNumber: '',
      packageSummary: '',
      grossWeight: '',
      measurementCbm: '',
      marksAndNumbers: '',
      portOfLoading: '',
      portOfDischarge: '',
      placeOfReceipt: '',
      placeOfDelivery: '',
      specialInstructions: '',
      incoterm: '',
      consigneeTinNumber: '',
      tinAreaCode: '',
      letterOfCreditNumber: '',
      hazardousCargo: false,
      unNumber: '',
      freightTerm: 'prepaid' as 'prepaid' | 'collect',
    });

    useEffect(() => {
      if (!record) return;
      setDraft({
        shipperName: record.shipperName,
        consigneeName: record.consigneeName,
        notifyParty: record.notifyParty,
        cargoDescription: record.cargoDescription,
        hsCode: record.hsCode,
        containerNumber: record.containerNumber,
        sealNumber: record.sealNumber,
        packageSummary: record.packageSummary,
        grossWeight: record.grossWeight,
        measurementCbm: record.measurementCbm,
        marksAndNumbers: record.marksAndNumbers,
        portOfLoading: record.portOfLoading,
        portOfDischarge: record.portOfDischarge,
        placeOfReceipt: record.placeOfReceipt,
        placeOfDelivery: record.placeOfDelivery,
        specialInstructions: record.specialInstructions,
        incoterm: record.incoterm,
        consigneeTinNumber: record.consigneeTinNumber,
        tinAreaCode: record.tinAreaCode,
        letterOfCreditNumber: record.letterOfCreditNumber,
        hazardousCargo: record.hazardousCargo,
        unNumber: record.unNumber,
        freightTerm: record.freightTerm,
      });
    }, [record]);
    const canEdit = canOperateShippingAction(sessionRole, 'shipping_instruction_edit');
    const canApprove = canOperateShippingAction(sessionRole, 'shipping_instruction_approve');
    const instructionReady = isShippingInstructionReady(record);
    const submitIsNext = Boolean(record) && record?.status === 'draft' && canEdit && instructionReady;
    const approveIsNext = Boolean(record) && record?.status === 'submitted' && canApprove && instructionReady;
    const copilot = deriveInstructionCopilot(record);

    return (
      <article className="supplier-panel">
        <header className="supplier-panel-header">
          <div>
            <span className="supplier-panel-eyebrow">Phase 2</span>
            <h2>Shipping instruction</h2>
          </div>
          <p>{record?.status || 'draft'}</p>
        </header>
        {record ? (
          <>
            <div className="supplier-form-grid">
              <label className="supplier-field-block">
                <span className="supplier-field-label">Shipper</span>
                <input className="supplier-desk-input" value={draft.shipperName} disabled={!canEdit} onChange={(event) => setDraft((current) => ({ ...current, shipperName: event.target.value }))} />
              </label>
              <label className="supplier-field-block">
                <span className="supplier-field-label">Consignee</span>
                <input className="supplier-desk-input" value={draft.consigneeName} disabled={!canEdit} onChange={(event) => setDraft((current) => ({ ...current, consigneeName: event.target.value }))} />
              </label>
              <label className="supplier-field-block">
                <span className="supplier-field-label">Notify party</span>
                <input className="supplier-desk-input" value={draft.notifyParty} disabled={!canEdit} onChange={(event) => setDraft((current) => ({ ...current, notifyParty: event.target.value }))} />
              </label>
              <label className="supplier-field-block">
                <span className="supplier-field-label">Freight term</span>
                <select className="supplier-desk-select" value={draft.freightTerm} disabled={!canEdit} onChange={(event) => setDraft((current) => ({ ...current, freightTerm: event.target.value as 'prepaid' | 'collect' }))}>
                  <option value="prepaid">prepaid</option>
                  <option value="collect">collect</option>
                </select>
              </label>
              <label className="supplier-field-block">
                <span className="supplier-field-label">HS code</span>
                <input className="supplier-desk-input" value={draft.hsCode} disabled={!canEdit} onChange={(event) => setDraft((current) => ({ ...current, hsCode: event.target.value }))} />
              </label>
              <label className="supplier-field-block">
                <span className="supplier-field-label">Container No.</span>
                <input className="supplier-desk-input" value={draft.containerNumber} disabled={!canEdit} onChange={(event) => setDraft((current) => ({ ...current, containerNumber: event.target.value }))} />
              </label>
              <label className="supplier-field-block">
                <span className="supplier-field-label">Seal No.</span>
                <input className="supplier-desk-input" value={draft.sealNumber} disabled={!canEdit} onChange={(event) => setDraft((current) => ({ ...current, sealNumber: event.target.value }))} />
              </label>
              <label className="supplier-field-block">
                <span className="supplier-field-label">Packages</span>
                <input className="supplier-desk-input" value={draft.packageSummary} disabled={!canEdit} onChange={(event) => setDraft((current) => ({ ...current, packageSummary: event.target.value }))} />
              </label>
              <label className="supplier-field-block">
                <span className="supplier-field-label">Gross weight</span>
                <input className="supplier-desk-input" value={draft.grossWeight} disabled={!canEdit} onChange={(event) => setDraft((current) => ({ ...current, grossWeight: event.target.value }))} />
              </label>
              <label className="supplier-field-block">
                <span className="supplier-field-label">Measurement (M3)</span>
                <input className="supplier-desk-input" value={draft.measurementCbm} disabled={!canEdit} onChange={(event) => setDraft((current) => ({ ...current, measurementCbm: event.target.value }))} />
              </label>
              <label className="supplier-field-block">
                <span className="supplier-field-label">POL</span>
                <input className="supplier-desk-input" value={draft.portOfLoading} disabled={!canEdit} onChange={(event) => setDraft((current) => ({ ...current, portOfLoading: event.target.value }))} />
              </label>
              <label className="supplier-field-block">
                <span className="supplier-field-label">POD</span>
                <input className="supplier-desk-input" value={draft.portOfDischarge} disabled={!canEdit} onChange={(event) => setDraft((current) => ({ ...current, portOfDischarge: event.target.value }))} />
              </label>
              <label className="supplier-field-block">
                <span className="supplier-field-label">Place of receipt</span>
                <input className="supplier-desk-input" value={draft.placeOfReceipt} disabled={!canEdit} onChange={(event) => setDraft((current) => ({ ...current, placeOfReceipt: event.target.value }))} />
              </label>
              <label className="supplier-field-block">
                <span className="supplier-field-label">Place of delivery</span>
                <input className="supplier-desk-input" value={draft.placeOfDelivery} disabled={!canEdit} onChange={(event) => setDraft((current) => ({ ...current, placeOfDelivery: event.target.value }))} />
              </label>
              <label className="supplier-field-block">
                <span className="supplier-field-label">Incoterm</span>
                <input className="supplier-desk-input" value={draft.incoterm} disabled={!canEdit} onChange={(event) => setDraft((current) => ({ ...current, incoterm: event.target.value }))} />
              </label>
              <label className="supplier-field-block">
                <span className="supplier-field-label">LC / Bank permit</span>
                <input className="supplier-desk-input" value={draft.letterOfCreditNumber} disabled={!canEdit} onChange={(event) => setDraft((current) => ({ ...current, letterOfCreditNumber: event.target.value }))} />
              </label>
              <label className="supplier-field-block">
                <span className="supplier-field-label">Consignee TIN</span>
                <input className="supplier-desk-input" value={draft.consigneeTinNumber} disabled={!canEdit} onChange={(event) => setDraft((current) => ({ ...current, consigneeTinNumber: event.target.value }))} />
              </label>
              <label className="supplier-field-block">
                <span className="supplier-field-label">TIN area code</span>
                <input className="supplier-desk-input" value={draft.tinAreaCode} disabled={!canEdit} onChange={(event) => setDraft((current) => ({ ...current, tinAreaCode: event.target.value }))} />
              </label>
              <label className="supplier-field-block">
                <span className="supplier-field-label">UN number</span>
                <input className="supplier-desk-input" value={draft.unNumber} disabled={!canEdit} onChange={(event) => setDraft((current) => ({ ...current, unNumber: event.target.value }))} />
              </label>
            </div>
            <label className="supplier-field-block console-gap-top-md">
              <span className="supplier-field-label">Cargo description</span>
              <textarea className="supplier-desk-input shipping-phase-textarea" value={draft.cargoDescription} disabled={!canEdit} onChange={(event) => setDraft((current) => ({ ...current, cargoDescription: event.target.value }))} />
            </label>
            <label className="supplier-field-block console-gap-top-md">
              <span className="supplier-field-label">Marks &amp; numbers</span>
              <input className="supplier-desk-input" value={draft.marksAndNumbers} disabled={!canEdit} onChange={(event) => setDraft((current) => ({ ...current, marksAndNumbers: event.target.value }))} />
            </label>
            <label className="supplier-field-block console-gap-top-md">
              <span className="supplier-field-label">Special instructions</span>
              <textarea className="supplier-desk-input shipping-phase-textarea" value={draft.specialInstructions} disabled={!canEdit} onChange={(event) => setDraft((current) => ({ ...current, specialInstructions: event.target.value }))} />
            </label>
            <div className="shipping-phase-detail-list">
              <div className="shipping-phase-detail-row"><span>Booking</span><strong>{record.bookingId}</strong></div>
              <div className="shipping-phase-detail-row"><span>Quote</span><strong>{record.quoteId}</strong></div>
              <div className="shipping-phase-detail-row"><span>Shipper</span><strong>{draft.shipperName}</strong></div>
              <div className="shipping-phase-detail-row"><span>Consignee</span><strong>{draft.consigneeName}</strong></div>
              <div className="shipping-phase-detail-row"><span>Notify party</span><strong>{draft.notifyParty}</strong></div>
              <div className="shipping-phase-detail-row"><span>Container / seal</span><strong>{draft.containerNumber} / {draft.sealNumber}</strong></div>
              <div className="shipping-phase-detail-row"><span>Packages / weight</span><strong>{draft.packageSummary} / {draft.grossWeight}</strong></div>
              <div className="shipping-phase-detail-row"><span>POL / POD</span><strong>{draft.portOfLoading} / {draft.portOfDischarge}</strong></div>
              <div className="shipping-phase-detail-row"><span>Receipt / delivery</span><strong>{draft.placeOfReceipt} / {draft.placeOfDelivery}</strong></div>
              <div className="shipping-phase-detail-row"><span>TIN / area</span><strong>{draft.consigneeTinNumber} / {draft.tinAreaCode}</strong></div>
              <div className="shipping-phase-detail-row"><span>Freight term</span><strong>{draft.freightTerm}</strong></div>
            </div>
            <div className="shipping-phase-note">
              <span>Cargo & trade details</span>
              <p>{draft.cargoDescription} · HS {draft.hsCode} · {draft.measurementCbm} · LC {draft.letterOfCreditNumber || 'Pending'}</p>
            </div>
            <div className="shipping-phase-note">
              <span>Marks / special instructions</span>
              <p>{draft.marksAndNumbers} · {draft.specialInstructions || 'No special instruction recorded.'} {draft.hazardousCargo ? `· Hazardous ${draft.unNumber || 'UN pending'}` : ''}</p>
            </div>
            <div className="shipping-phase-note">
              <span>Timing</span>
              <p>Submitted: {formatDate(record.submittedAt)} · Approved: {formatDate(record.approvedAt)}</p>
            </div>
            <div className={`shipping-copilot-panel is-${copilot.status}`}>
              <div className="shipping-copilot-header">
                <div>
                  <span className="supplier-panel-eyebrow">AI Document Copilot</span>
                  <h3>{copilot.headline}</h3>
                </div>
                <div className={`shipping-copilot-score status-${copilot.status}`}><strong>{copilot.score}</strong><span>/100</span></div>
              </div>
              {copilot.blockers.length ? (
                <div className="shipping-copilot-block">
                  <span>Blockers</span>
                  <ul>{copilot.blockers.map((item) => <li key={item}>{item}</li>)}</ul>
                </div>
              ) : null}
              <div className="shipping-copilot-block">
                <span>Recommendations</span>
                <ul>{copilot.recommendations.map((item) => <li key={item}>{item}</li>)}</ul>
              </div>
              {copilot.actionLabel ? (
                <div className="shipping-copilot-actions">
                  {record.status === 'draft' ? (
                    <button type="button" className={`supplier-desk-button ${copilot.actionTone === 'primary' ? 'supplier-desk-button-primary' : 'supplier-desk-button-secondary'}`} disabled={!canEdit || !instructionReady || record.status !== 'draft'} onClick={() => submitShippingInstruction(record.bookingId)}>
                      {copilot.actionLabel}
                    </button>
                  ) : record.status === 'submitted' ? (
                    <button type="button" className={`supplier-desk-button ${copilot.actionTone === 'primary' ? 'supplier-desk-button-primary' : 'supplier-desk-button-secondary'}`} disabled={!canApprove || !instructionReady || record.status !== 'submitted'} onClick={() => approveShippingInstruction(record.bookingId)}>
                      {copilot.actionLabel}
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
            {selectedCarrierSchedule ? (
              <div className="shipping-phase-note">
                <span>Carrier schedule</span>
                <p>{selectedCarrierSchedule.carrierName} · {selectedCarrierSchedule.vesselName} · {selectedCarrierSchedule.voyageNumber} · ETD {formatDate(selectedCarrierSchedule.etd)}</p>
              </div>
            ) : null}
            {!canEdit || !canApprove ? (
              <div className="shipping-phase-note is-blocked">
                <span>Desk ownership</span>
                <p>Editing belongs to {shippingActionOwner('shipping_instruction_edit')}. Approval belongs to {shippingActionOwner('shipping_instruction_approve')}.</p>
              </div>
            ) : null}
            <div className="supplier-inline-actions">
              <button
                type="button"
                className="supplier-desk-button supplier-desk-button-secondary console-download-button"
                disabled={!canEdit}
                onClick={() =>
                  updateShippingInstructionDraft(record.bookingId, {
                    shipperName: draft.shipperName,
                    consigneeName: draft.consigneeName,
                    notifyParty: draft.notifyParty,
                    cargoDescription: draft.cargoDescription,
                    hsCode: draft.hsCode,
                    containerNumber: draft.containerNumber,
                    sealNumber: draft.sealNumber,
                    packageSummary: draft.packageSummary,
                    grossWeight: draft.grossWeight,
                    measurementCbm: draft.measurementCbm,
                    marksAndNumbers: draft.marksAndNumbers,
                    portOfLoading: draft.portOfLoading,
                    portOfDischarge: draft.portOfDischarge,
                    placeOfReceipt: draft.placeOfReceipt,
                    placeOfDelivery: draft.placeOfDelivery,
                    specialInstructions: draft.specialInstructions,
                    incoterm: draft.incoterm,
                    consigneeTinNumber: draft.consigneeTinNumber,
                    tinAreaCode: draft.tinAreaCode,
                    letterOfCreditNumber: draft.letterOfCreditNumber,
                    hazardousCargo: draft.hazardousCargo,
                    unNumber: draft.unNumber,
                    freightTerm: draft.freightTerm,
                  })
                }
              >
                Save SI draft
              </button>
              <button
                type="button"
                className="supplier-desk-button supplier-desk-button-secondary console-download-button"
                disabled={!instructionReady}
                onClick={() =>
                  downloadSimpleShippingPdf({
                    fileName: record.bookingId + '-shipping-instruction.pdf',
                    title: 'Shipping Instruction',
                    subtitle: 'Booking ' + record.bookingId + ' shipping instruction pack',
                    lines: [
                      'Booking: ' + record.bookingId,
                      'Quote: ' + record.quoteId,
                      'Shipper: ' + draft.shipperName,
                      'Consignee: ' + draft.consigneeName,
                      'Notify party: ' + draft.notifyParty,
                      'Freight term: ' + draft.freightTerm,
                      'POL: ' + draft.portOfLoading,
                      'POD: ' + draft.portOfDischarge,
                      'Place of receipt: ' + draft.placeOfReceipt,
                      'Place of delivery: ' + draft.placeOfDelivery,
                      'Container / Seal: ' + draft.containerNumber + ' / ' + draft.sealNumber,
                      'Packages: ' + draft.packageSummary,
                      'Gross weight: ' + draft.grossWeight,
                      'Measurement: ' + draft.measurementCbm,
                      'HS code: ' + draft.hsCode,
                      'Incoterm: ' + draft.incoterm,
                      'LC / Bank permit: ' + (draft.letterOfCreditNumber || 'Pending'),
                      'Consignee TIN / Area: ' + (draft.consigneeTinNumber || 'Pending') + ' / ' + (draft.tinAreaCode || 'Pending'),
                      'Cargo: ' + draft.cargoDescription,
                      'Marks: ' + (draft.marksAndNumbers || 'Pending'),
                      'Special instructions: ' + (draft.specialInstructions || 'None'),
                      'Status: ' + record.status,
                    ],
                  })
                }
              >
                Download SI PDF
              </button>
              <button type="button" className={`supplier-desk-button supplier-desk-button-secondary ${nextStepClass(submitIsNext)}`} disabled={!canEdit || !instructionReady || record.status !== 'draft'} onClick={() => submitShippingInstruction(record.bookingId)}>{shippingCtaLabel('submit_si')}</button>
              <button type="button" className={`supplier-desk-button supplier-desk-button-primary ${nextStepClass(approveIsNext)}`} disabled={!canApprove || !instructionReady || record.status !== 'submitted'} onClick={() => approveShippingInstruction(record.bookingId)}>{shippingCtaLabel('approve_si')}</button>
            </div>
          </>
        ) : (
          <div className="supplier-check-item is-pending"><strong>No shipping instruction yet</strong><p>Shipping instruction activates after booking confirmation.</p></div>
        )}
      </article>
    );
  }

  function ShippingBillPanel({ record }: { record: ShippingBillOfLadingRecord | null }) {
    const [draft, setDraft] = useState({
      houseBlNumber: '',
      masterBlNumber: '',
      slotCarrierBillNumber: '',
      carrierName: '',
      vesselName: '',
      voyageNumber: '',
      shippedOnBoardDate: '',
      placeOfIssue: '',
      numberOfOriginalBills: 3,
      freightTerm: 'prepaid' as 'prepaid' | 'collect',
    });

    useEffect(() => {
      if (!record) return;
      setDraft({
        houseBlNumber: record.houseBlNumber,
        masterBlNumber: record.masterBlNumber,
        slotCarrierBillNumber: record.slotCarrierBillNumber,
        carrierName: record.carrierName,
        vesselName: record.vesselName,
        voyageNumber: record.voyageNumber,
        shippedOnBoardDate: record.shippedOnBoardDate,
        placeOfIssue: record.placeOfIssue,
        numberOfOriginalBills: record.numberOfOriginalBills,
        freightTerm: record.freightTerm,
      });
    }, [record]);
    const canAssignSchedule = canOperateShippingAction(sessionRole, 'carrier_schedule_assign');
    const canApproveBl = canOperateShippingAction(sessionRole, 'bill_of_lading_approve');
    const canFinalize = canOperateShippingAction(sessionRole, 'bill_of_lading_finalize');
    const documentData: ShippingBillDocumentData | null = record && selectedBooking
      ? {
          blNumber: draft.houseBlNumber || 'Pending',
          carrierBlNumber: draft.masterBlNumber || 'Pending',
          slotCarrierBillNumber: draft.slotCarrierBillNumber || 'Pending',
          bookingNumber: record.bookingId,
          shipmentId: record.bookingId,
          shipper: record.shipperName,
          consignee: record.consigneeName,
          notifyParty: record.notifyParty,
          vessel: draft.vesselName,
          voyage: draft.voyageNumber,
          portOfLoading: record.portOfLoading,
          portOfDischarge: record.portOfDischarge,
          placeOfReceipt: record.placeOfReceipt,
          placeOfDelivery: record.placeOfDelivery,
          shippedOnBoardDate: draft.shippedOnBoardDate || 'Pending',
          hsCode: record.hsCode,
          marksAndNumbers: record.marksAndNumbers,
          measurementCbm: record.measurementCbm,
          tinNumber: record.consigneeTinNumber,
          tinAreaCode: record.tinAreaCode,
          numberOfOriginalBills: draft.numberOfOriginalBills,
          lcNumber: record.letterOfCreditNumber || 'Pending',
          incoterm: selectedBooking?.incoterm || selectedInstruction?.incoterm || 'CIF',
          freight: draft.freightTerm.toUpperCase(),
          placeOfIssue: draft.placeOfIssue || 'Djibouti',
          dateOfIssue: record.issueDate ? formatDate(record.issueDate) : 'Pending',
          outputLabel: record.status === 'final' ? 'ORIGINAL' : 'Draft preview',
          verifyHref: `/shipping/bills-of-lading/verify?blNumber=${encodeURIComponent(draft.houseBlNumber || 'Pending')}&carrierBl=${encodeURIComponent(draft.masterBlNumber || 'Pending')}&shipmentId=${encodeURIComponent(record.bookingId)}`,
          containers: [
            {
              no: record.containerNumber,
              seal: record.sealNumber,
              packages: record.packageSummary,
              weight: record.grossWeight,
              description: record.cargoDescription,
            },
          ],
        }
      : null;
    const seaFreight = selectedQuote ? `USD ${selectedQuote.pricing.seaFreightUSD.toLocaleString('en-US')}` : 'USD Pending';
    const clearanceFreight = selectedQuote ? `USD ${selectedQuote.pricing.djiboutiClearanceUSD.toLocaleString('en-US')}` : 'USD Pending';
    const inlandFreight = selectedQuote ? `ETB ${selectedQuote.pricing.inlandTransportETB.toLocaleString('en-US')}` : 'ETB Pending';
    const previewPdfPayload = documentData && record
      ? buildBillPdfPayload(documentData, {
          bookingReference: record.bookingId,
          freightTerm: draft.freightTerm,
          seaFreight,
          clearanceFreight,
          inlandFreight,
          outputLabel: record.status === 'final' ? 'ORIGINAL' : 'DRAFT PREVIEW',
          printVariant: record.status === 'final' ? 'original' : 'copy',
          fileName: `${draft.houseBlNumber || record.bookingId}-preview.pdf`,
        })
      : null;
    const assignScheduleIsNext = Boolean(record && !selectedCarrierSchedule && workspace.carrierSchedules[0] && canAssignSchedule && record.status !== 'final');
    const approveBlIsNext = Boolean(record && selectedCarrierSchedule && !record.blockedReason && record.status === 'draft' && canApproveBl);
    const finalizeBlIsNext = Boolean(record && !record.blockedReason && record.status === 'approved' && canFinalize);
    const printOriginalIsNext = Boolean(record && record.status === 'final' && !billPrintState[record.bookingId]?.originalPrinted);
    const copilot = deriveBillCopilot(record, Boolean(selectedCarrierSchedule), record ? billPrintState[record.bookingId] : undefined);

    return (
      <article className="supplier-panel">
        <header className="supplier-panel-header">
          <div>
            <span className="supplier-panel-eyebrow">Phase 2</span>
            <h2>Bill of lading</h2>
          </div>
          <p>{record?.status || 'draft'}</p>
        </header>
        {record ? (
          <>
            <div className="supplier-form-grid">
              <label className="supplier-field-block">
                <span className="supplier-field-label">House BL</span>
                <input className="supplier-desk-input" value={draft.houseBlNumber} disabled={record.status === 'final' || !canFinalize} onChange={(event) => setDraft((current) => ({ ...current, houseBlNumber: event.target.value }))} />
              </label>
              <label className="supplier-field-block">
                <span className="supplier-field-label">Carrier BL / Master BL</span>
                <input className="supplier-desk-input" value={draft.masterBlNumber} disabled={record.status === 'final' || !canFinalize} onChange={(event) => setDraft((current) => ({ ...current, masterBlNumber: event.target.value }))} />
              </label>
              <label className="supplier-field-block">
                <span className="supplier-field-label">Slot carrier bill no.</span>
                <input className="supplier-desk-input" value={draft.slotCarrierBillNumber} disabled={record.status === 'final' || !canFinalize} onChange={(event) => setDraft((current) => ({ ...current, slotCarrierBillNumber: event.target.value }))} />
              </label>
              <label className="supplier-field-block">
                <span className="supplier-field-label">Carrier</span>
                <input className="supplier-desk-input" value={draft.carrierName} disabled={record.status === 'final' || !canFinalize} onChange={(event) => setDraft((current) => ({ ...current, carrierName: event.target.value }))} />
              </label>
              <label className="supplier-field-block">
                <span className="supplier-field-label">Vessel</span>
                <input className="supplier-desk-input" value={draft.vesselName} disabled={record.status === 'final' || !canFinalize} onChange={(event) => setDraft((current) => ({ ...current, vesselName: event.target.value }))} />
              </label>
              <label className="supplier-field-block">
                <span className="supplier-field-label">Voyage</span>
                <input className="supplier-desk-input" value={draft.voyageNumber} disabled={record.status === 'final' || !canFinalize} onChange={(event) => setDraft((current) => ({ ...current, voyageNumber: event.target.value }))} />
              </label>
              <label className="supplier-field-block">
                <span className="supplier-field-label">Freight term</span>
                <select className="supplier-desk-select" value={draft.freightTerm} disabled={record.status === 'final' || !canFinalize} onChange={(event) => setDraft((current) => ({ ...current, freightTerm: event.target.value as 'prepaid' | 'collect' }))}>
                  <option value="prepaid">prepaid</option>
                  <option value="collect">collect</option>
                </select>
              </label>
              <label className="supplier-field-block">
                <span className="supplier-field-label">Shipped on board</span>
                <input className="supplier-desk-input" value={draft.shippedOnBoardDate} disabled={record.status === 'final' || !canFinalize} onChange={(event) => setDraft((current) => ({ ...current, shippedOnBoardDate: event.target.value }))} />
              </label>
              <label className="supplier-field-block">
                <span className="supplier-field-label">Place of issue</span>
                <input className="supplier-desk-input" value={draft.placeOfIssue} disabled={record.status === 'final' || !canFinalize} onChange={(event) => setDraft((current) => ({ ...current, placeOfIssue: event.target.value }))} />
              </label>
              <label className="supplier-field-block">
                <span className="supplier-field-label">No. of originals</span>
                <input className="supplier-desk-input" type="number" min="1" value={draft.numberOfOriginalBills} disabled={record.status === 'final' || !canFinalize} onChange={(event) => setDraft((current) => ({ ...current, numberOfOriginalBills: Number(event.target.value) || 1 }))} />
              </label>
            </div>
            <div className="shipping-phase-detail-list">
              <div className="shipping-phase-detail-row"><span>Booking</span><strong>{record.bookingId}</strong></div>
              <div className="shipping-phase-detail-row"><span>House BL</span><strong>{draft.houseBlNumber || 'Pending'}</strong></div>
              <div className="shipping-phase-detail-row"><span>Carrier BL / Master BL</span><strong>{draft.masterBlNumber || 'Pending'}</strong></div>
              <div className="shipping-phase-detail-row"><span>Slot carrier bill</span><strong>{draft.slotCarrierBillNumber || 'Pending'}</strong></div>
              <div className="shipping-phase-detail-row"><span>Carrier</span><strong>{draft.carrierName}</strong></div>
              <div className="shipping-phase-detail-row"><span>Vessel</span><strong>{draft.vesselName}</strong></div>
              <div className="shipping-phase-detail-row"><span>Voyage</span><strong>{draft.voyageNumber}</strong></div>
              <div className="shipping-phase-detail-row"><span>Freight term</span><strong>{draft.freightTerm}</strong></div>
              <div className="shipping-phase-detail-row"><span>Shipped on board</span><strong>{draft.shippedOnBoardDate || 'Pending'}</strong></div>
              <div className="shipping-phase-detail-row"><span>Place of receipt / delivery</span><strong>{record.placeOfReceipt} / {record.placeOfDelivery}</strong></div>
              <div className="shipping-phase-detail-row"><span>TIN / area</span><strong>{record.consigneeTinNumber} / {record.tinAreaCode}</strong></div>
              <div className="shipping-phase-detail-row"><span>BL approved</span><strong>{record.approvedAt ? formatDate(record.approvedAt) : 'Pending'}</strong></div>
              <div className="shipping-phase-detail-row"><span>BL finalized</span><strong>{record.issueDate ? formatDate(record.issueDate) : 'Pending'}</strong></div>
              <div className="shipping-phase-detail-row"><span>Original printed</span><strong>{billPrintState[record.bookingId]?.originalPrinted ? 'Yes' : 'Pending'}</strong></div>
            </div>
            <div className="shipping-phase-note">
              <span>Combined transport references</span>
              <p>{record.marksAndNumbers} · HS {record.hsCode} · {record.measurementCbm} · LC {record.letterOfCreditNumber || 'Pending'} · {draft.numberOfOriginalBills} originals</p>
            </div>
            {selectedCarrierSchedule ? (
              <div className="shipping-phase-note">
                <span>Assigned schedule</span>
                <p>{selectedCarrierSchedule.carrierName} · {selectedCarrierSchedule.vesselName} · {selectedCarrierSchedule.voyageNumber} · ETA {formatDate(selectedCarrierSchedule.etaDjibouti)}</p>
              </div>
            ) : (
              <div className="shipping-phase-note is-blocked">
                <span>Assigned schedule</span>
                <p>No vessel schedule assigned yet. Use Carrier Schedules before finalizing the BL.</p>
              </div>
            )}
            <div className={record.blockedReason ? 'shipping-phase-note is-blocked' : 'shipping-phase-note'}>
              <span>BL gate</span>
              <p>{record.blockedReason || `Final BL issued ${formatDate(record.issueDate)}.`}</p>
            </div>
            <div className={`shipping-copilot-panel is-${copilot.status}`}>
              <div className="shipping-copilot-header">
                <div>
                  <span className="supplier-panel-eyebrow">AI Document Copilot</span>
                  <h3>{copilot.headline}</h3>
                </div>
                <div className={`shipping-copilot-score status-${copilot.status}`}><strong>{copilot.score}</strong><span>/100</span></div>
              </div>
              {copilot.blockers.length ? (
                <div className="shipping-copilot-block">
                  <span>Blockers</span>
                  <ul>{copilot.blockers.map((item) => <li key={item}>{item}</li>)}</ul>
                </div>
              ) : null}
              <div className="shipping-copilot-block">
                <span>Recommendations</span>
                <ul>{copilot.recommendations.map((item) => <li key={item}>{item}</li>)}</ul>
              </div>
              {copilot.actionLabel ? (
                <div className="shipping-copilot-actions">
                  {!selectedCarrierSchedule && workspace.carrierSchedules[0] ? (
                    <button type="button" className={`supplier-desk-button ${copilot.actionTone === 'primary' ? 'supplier-desk-button-primary' : 'supplier-desk-button-secondary'}`} disabled={!canAssignSchedule} onClick={() => assignShippingCarrierSchedule(record.bookingId, workspace.carrierSchedules[0].scheduleId)}>
                      {copilot.actionLabel}
                    </button>
                  ) : record.status === 'draft' ? (
                    <button type="button" className={`supplier-desk-button ${copilot.actionTone === 'primary' ? 'supplier-desk-button-primary' : 'supplier-desk-button-secondary'}`} disabled={Boolean(record.blockedReason) || !canApproveBl} onClick={() => approveShippingBillOfLading(record.bookingId)}>
                      {copilot.actionLabel}
                    </button>
                  ) : record.status === 'approved' ? (
                    <button type="button" className={`supplier-desk-button ${copilot.actionTone === 'primary' ? 'supplier-desk-button-primary' : 'supplier-desk-button-secondary'}`} disabled={Boolean(record.blockedReason) || !canFinalize} onClick={() => finalizeShippingBillOfLading(record.bookingId)}>
                      {copilot.actionLabel}
                    </button>
                  ) : record.status === 'final' ? (
                    <button
                      type="button"
                      className={`supplier-desk-button ${copilot.actionTone === 'primary' ? 'supplier-desk-button-primary' : 'supplier-desk-button-secondary'}`}
                      onClick={() => {
                        if (!documentData) return;
                        updateBillPrintState(record.bookingId, { originalPrinted: true });
                        openBillOfLadingPrintView(
                          buildBillPdfPayload(documentData, {
                            bookingReference: record.bookingId,
                            freightTerm: draft.freightTerm,
                            seaFreight,
                            clearanceFreight,
                            inlandFreight,
                            outputLabel: 'ORIGINAL',
                            printVariant: 'original',
                            fileName: `${draft.houseBlNumber || record.bookingId}-original-bl.pdf`,
                          }),
                        );
                      }}
                    >
                      {copilot.actionLabel}
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
            {!canAssignSchedule || !canApproveBl || !canFinalize ? (
              <div className="shipping-phase-note is-blocked">
                <span>Desk ownership</span>
                <p>Schedule assignment belongs to {shippingActionOwner('carrier_schedule_assign')}. BL approval belongs to {shippingActionOwner('bill_of_lading_approve')}. BL finalization belongs to {shippingActionOwner('bill_of_lading_finalize')}.</p>
              </div>
            ) : null}
            <div className="supplier-inline-actions">
              {workspace.carrierSchedules[0] ? (
                <button type="button" className={`supplier-desk-button supplier-desk-button-secondary ${nextStepClass(assignScheduleIsNext)}`} disabled={!canAssignSchedule} onClick={() => assignShippingCarrierSchedule(record.bookingId, workspace.carrierSchedules[0].scheduleId)}>
                  {shippingCtaLabel('assign_schedule')}
                </button>
              ) : null}
              <button
                type="button"
                className="supplier-desk-button supplier-desk-button-secondary"
                disabled={record.status === 'final' || !canFinalize}
                onClick={() =>
                  updateShippingBillDraft(record.bookingId, {
                    houseBlNumber: draft.houseBlNumber,
                    masterBlNumber: draft.masterBlNumber,
                    slotCarrierBillNumber: draft.slotCarrierBillNumber,
                    carrierName: draft.carrierName,
                    vesselName: draft.vesselName,
                    voyageNumber: draft.voyageNumber,
                    shippedOnBoardDate: draft.shippedOnBoardDate,
                    placeOfIssue: draft.placeOfIssue,
                    numberOfOriginalBills: draft.numberOfOriginalBills,
                    freightTerm: draft.freightTerm,
                  })
                }
              >
                Save BL draft
              </button>
              <button
                type="button"
                className={`supplier-desk-button supplier-desk-button-secondary ${nextStepClass(approveBlIsNext)}`}
                disabled={Boolean(record.blockedReason) || record.status !== 'draft' || !canApproveBl}
                onClick={() => approveShippingBillOfLading(record.bookingId)}
              >
                {shippingCtaLabel('approve_bl')}
              </button>
              <button
                type="button"
                className={`supplier-desk-button supplier-desk-button-primary ${nextStepClass(finalizeBlIsNext)}`}
                disabled={Boolean(record.blockedReason) || record.status !== 'approved' || !canFinalize}
                onClick={() => finalizeShippingBillOfLading(record.bookingId)}
              >
                {shippingCtaLabel('finalize_bl')}
              </button>
              <button
                type="button"
                className={`supplier-desk-button supplier-desk-button-secondary ${nextStepClass(printOriginalIsNext)}`}
                disabled={record.status !== 'final'}
                onClick={() => {
                  if (!documentData) return;
                  updateBillPrintState(record.bookingId, { originalPrinted: true });
                  openBillOfLadingPrintView(
                    buildBillPdfPayload(documentData, {
                      bookingReference: record.bookingId,
                      freightTerm: draft.freightTerm,
                      seaFreight,
                      clearanceFreight,
                      inlandFreight,
                      outputLabel: 'ORIGINAL',
                      printVariant: 'original',
                      fileName: `${draft.houseBlNumber || record.bookingId}-original-bl.pdf`,
                    }),
                  );
                }}
              >
                Print / Save Original BL
              </button>
              <button
                type="button"
                className="supplier-desk-button supplier-desk-button-secondary"
                disabled={record.status !== 'final'}
                onClick={() => {
                  if (!documentData) return;
                  updateBillPrintState(record.bookingId, { originalPrinted: true, originalsPrinted: true });
                  printBillOfLadingOriginals(
                    buildBillPdfPayload(documentData, {
                      bookingReference: record.bookingId,
                      freightTerm: draft.freightTerm,
                      seaFreight,
                      clearanceFreight,
                      inlandFreight,
                      outputLabel: 'ORIGINAL',
                      printVariant: 'original',
                      fileName: `${draft.houseBlNumber || record.bookingId}-originals.pdf`,
                    }),
                  );
                }}
              >
                Print 3 Originals
              </button>
              <button
                type="button"
                className="supplier-desk-button supplier-desk-button-secondary"
                disabled={record.status !== 'final'}
                onClick={() => {
                  if (!documentData) return;
                  updateBillPrintState(record.bookingId, { copyPrinted: true });
                  openBillOfLadingPrintView(
                    buildBillPdfPayload(documentData, {
                      bookingReference: record.bookingId,
                      freightTerm: draft.freightTerm,
                      seaFreight,
                      clearanceFreight,
                      inlandFreight,
                      outputLabel: 'COPY',
                      printVariant: 'copy',
                      fileName: `${draft.houseBlNumber || record.bookingId}-bl-copy.pdf`,
                    }),
                  );
                }}
              >
                Print Copy
              </button>
              <button
                type="button"
                className="supplier-desk-button supplier-desk-button-secondary"
                disabled={record.status !== 'final'}
                onClick={() =>
                  downloadSimpleShippingPdf({
                    fileName: `${draft.houseBlNumber || record.bookingId}-email-bl.pdf`,
                    title: 'Tikur Abay BL email pack',
                    subtitle: 'House BL and carrier BL summary',
                    lines: [
                      `House BL: ${draft.houseBlNumber || 'Pending'}`,
                      `Carrier BL: ${draft.masterBlNumber || 'Pending'}`,
                      `Booking: ${record.bookingId}`,
                      `Customer: ${record.customerName}`,
                      `Vessel: ${draft.vesselName}`,
                      `Voyage: ${draft.voyageNumber}`,
                      'Distribution: customer / bank / office',
                    ],
                  })
                }
              >
                Email BL
              </button>
              <Link
                className={record.status === 'final' ? 'supplier-desk-button supplier-desk-button-secondary' : 'supplier-desk-button supplier-desk-button-secondary is-disabled'}
                href={documentData?.verifyHref || '#'}
                aria-disabled={record.status !== 'final'}
                onClick={(event) => {
                  if (record.status !== 'final') event.preventDefault();
                }}
              >
                Verify BL
              </Link>
            </div>
            {documentData ? (
              <div className="shipping-bl-preview-shell">
                <div className="shipping-phase-note">
                  <span>BL preview</span>
                  <p>Preview renders the same generated PDF used for print and save, so it matches the final BL form exactly.</p>
                </div>
                {previewPdfPayload ? <ShippingBillDocument pdfPayload={previewPdfPayload} /> : null}
              </div>
            ) : null}
          </>
        ) : (
          <div className="supplier-check-item is-pending"><strong>No BL yet</strong><p>BL record activates after booking confirmation.</p></div>
        )}
      </article>
    );
  }

  function ShippingManifestPanel({
    record,
    group,
  }: {
    record: ShippingManifestRecord | null;
    group: {
      key: string;
      vesselName: string;
      voyageNumber: string;
      status: 'pending' | 'generated';
      generatedAt: string;
      blockedReason: string;
      bookings: string[];
      customers: string[];
      totalContainers: number;
      totalWeight: number;
    } | null;
  }) {
    const groupRecords = workspace.manifests.filter((item) => group && `${item.vesselName}__${item.voyageNumber}` === group.key);
    const canGenerateManifest = canOperateShippingAction(sessionRole, 'manifest_generate');
    const copilot = deriveManifestCopilot(group, groupRecords);
    return (
      <article className="supplier-panel">
        <header className="supplier-panel-header">
          <div>
            <span className="supplier-panel-eyebrow">Phase 2</span>
            <h2>Manifest</h2>
          </div>
          <p>{group?.status || record?.status || 'pending'}</p>
        </header>
        {group ? (
          <>
            <div className="shipping-phase-detail-list">
              <div className="shipping-phase-detail-row"><span>Manifest</span><strong>{record?.manifestId || `MAN-${group.voyageNumber}`}</strong></div>
              <div className="shipping-phase-detail-row"><span>Vessel</span><strong>{group.vesselName}</strong></div>
              <div className="shipping-phase-detail-row"><span>Voyage</span><strong>{group.voyageNumber}</strong></div>
              <div className="shipping-phase-detail-row"><span>POL / POD / delivery</span><strong>{record?.portOfLoading || 'Pending'} / {record?.portOfDischarge || 'Pending'} / {record?.placeOfDelivery || 'Pending'}</strong></div>
              <div className="shipping-phase-detail-row"><span>Sailing date</span><strong>{record?.sailingDate ? formatDate(record.sailingDate) : 'Pending'}</strong></div>
              <div className="shipping-phase-detail-row"><span>Bookings</span><strong>{group.bookings.length}</strong></div>
              <div className="shipping-phase-detail-row"><span>Containers</span><strong>{group.totalContainers}</strong></div>
              <div className="shipping-phase-detail-row"><span>Total weight</span><strong>{group.totalWeight.toLocaleString('en-US')} kg</strong></div>
            </div>
            <div className={group.blockedReason ? 'shipping-phase-note is-blocked' : 'shipping-phase-note'}>
              <span>Manifest gate</span>
              <p>{group.blockedReason || `Generated ${formatDate(group.generatedAt)}.`}</p>
            </div>
            <div className="shipping-phase-note">
              <span>Schedule source</span>
              <p>Manifest vessel and voyage now follow the booking's assigned carrier schedule so the voyage load list stays consistent with the finalized BL.</p>
            </div>
            <div className="shipping-phase-note">
              <span>Voyage load list</span>
              <p>{groupRecords.map((item) => `${item.bookingId} · ${item.slotCarrierWaybillNumber} · ${item.containerNumber} · HS ${item.hsCode} · TIN ${item.tinNo}`).join(' | ')}</p>
            </div>
            <div className={`shipping-copilot-panel is-${copilot.status}`}>
              <div className="shipping-copilot-header">
                <div>
                  <span className="supplier-panel-eyebrow">AI Document Copilot</span>
                  <h3>{copilot.headline}</h3>
                </div>
                <div className={`shipping-copilot-score status-${copilot.status}`}><strong>{copilot.score}</strong><span>/100</span></div>
              </div>
              {copilot.blockers.length ? (
                <div className="shipping-copilot-block">
                  <span>Blockers</span>
                  <ul>{copilot.blockers.map((item) => <li key={item}>{item}</li>)}</ul>
                </div>
              ) : null}
              <div className="shipping-copilot-block">
                <span>Recommendations</span>
                <ul>{copilot.recommendations.map((item) => <li key={item}>{item}</li>)}</ul>
              </div>
              {copilot.actionLabel ? (
                <div className="shipping-copilot-actions">
                  {group.status !== 'generated' ? (
                    <button
                      type="button"
                      className={`supplier-desk-button ${copilot.actionTone === 'primary' ? 'supplier-desk-button-primary' : 'supplier-desk-button-secondary'}`}
                      disabled={groupRecords.some((item) => Boolean(item.blockedReason)) || !canGenerateManifest}
                      onClick={() => groupRecords.forEach((item) => generateShippingManifest(item.bookingId))}
                    >
                      {copilot.actionLabel}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={`supplier-desk-button ${copilot.actionTone === 'primary' ? 'supplier-desk-button-primary' : 'supplier-desk-button-secondary'}`}
                      onClick={() =>
                        downloadShippingManifestPdf({
                          fileName: `${group.vesselName.replace(/\s+/g, '-').toLowerCase()}-${group.voyageNumber.toLowerCase()}-manifest.pdf`,
                          manifestType: 'cargo',
                          vesselName: group.vesselName,
                          voyageNumber: group.voyageNumber,
                          portOfLoading: record?.portOfLoading || 'Pending',
                          portOfDischarge: record?.portOfDischarge || 'Pending',
                          placeOfDelivery: record?.placeOfDelivery || 'Pending',
                          sailingDate: record?.sailingDate || '',
                          rows: groupRecords.map((item) => ({
                            billOfLadingNo: item.bookingId ? `HBL-${item.bookingId.replace(/^BK-/, '')}` : '-',
                            slotCarrierWaybillNo: item.slotCarrierWaybillNumber,
                            shipper: item.shipperName,
                            consignee: item.consigneeName,
                            notifyParty: item.notifyParty,
                            marksAndNumbers: item.marksAndNumbers,
                            containerNumber: item.containerNumber,
                            sealNumber: item.sealNumber,
                            packageSummary: item.packageSummary,
                            descriptionOfGoods: item.goodsDescription,
                            grossWeight: String(item.totalWeight),
                            cbm: String(item.cbm),
                            hsCode: item.hsCode,
                            tinNo: item.tinNo,
                            areaCode: item.areaCode,
                            cargoInTransitTo: item.cargoInTransitTo,
                          })),
                        })
                      }
                    >
                      {copilot.actionLabel}
                    </button>
                  )}
                </div>
              ) : null}
            </div>
            {!canGenerateManifest ? (
              <div className="shipping-phase-note is-blocked">
                <span>Desk ownership</span>
                <p>Manifest generation belongs to {shippingActionOwner('manifest_generate')}.</p>
              </div>
            ) : null}
            <div className="supplier-inline-actions">
              {group.status !== 'generated' ? (
                <button
                  type="button"
                  className={`supplier-desk-button supplier-desk-button-primary ${nextStepClass(!groupRecords.some((item) => Boolean(item.blockedReason)) && canGenerateManifest)}`}
                  disabled={groupRecords.some((item) => Boolean(item.blockedReason)) || !canGenerateManifest}
                  onClick={() => groupRecords.forEach((item) => generateShippingManifest(item.bookingId))}
                >
                  {shippingCtaLabel('generate_manifest')}
                </button>
              ) : null}
              <button
                type="button"
                className="supplier-desk-button supplier-desk-button-secondary"
                onClick={() =>
                  downloadShippingManifestPdf({
                    fileName: `${group.vesselName.replace(/\s+/g, '-').toLowerCase()}-${group.voyageNumber.toLowerCase()}-manifest.pdf`,
                    manifestType: 'cargo',
                    vesselName: group.vesselName,
                    voyageNumber: group.voyageNumber,
                    portOfLoading: record?.portOfLoading || 'Pending',
                    portOfDischarge: record?.portOfDischarge || 'Pending',
                    placeOfDelivery: record?.placeOfDelivery || 'Pending',
                    sailingDate: record?.sailingDate || '',
                    pageLabel: '1 / 1',
                    rows: groupRecords.map((item) => ({
                      billOfLadingNo: item.bookingId ? `HBL-${item.bookingId}` : '-',
                      slotCarrierWaybillNo: item.slotCarrierWaybillNumber || '-',
                      shipper: item.shipperName || '-',
                      consignee: item.consigneeName || '-',
                      notifyParty: item.notifyParty || '-',
                      marksAndNumbers: item.marksAndNumbers || '-',
                      containerNumber: item.containerNumber || '-',
                      sealNumber: item.sealNumber || '-',
                      packageSummary: item.packageSummary || '-',
                      descriptionOfGoods: item.goodsDescription || '-',
                      grossWeight: item.totalWeight ? `${item.totalWeight.toLocaleString('en-US')} KG` : '-',
                      cbm: item.cbm ? `${item.cbm} CBM` : '-',
                      hsCode: item.hsCode || '-',
                      tinNo: item.tinNo || '-',
                      areaCode: item.areaCode || '-',
                      cargoInTransitTo: item.cargoInTransitTo || '-',
                    })),
                  })
                }
              >
                Download manifest PDF
              </button>
            </div>
          </>
        ) : (
          <div className="supplier-check-item is-pending"><strong>No manifest yet</strong><p>Manifest record activates after booking confirmation.</p></div>
        )}
      </article>
    );
  }
}
