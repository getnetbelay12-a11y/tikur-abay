type AiSeverity = 'info' | 'watch' | 'urgent';

export type OperationsAiBrief = {
  title: string;
  summary: string;
  nextAction: string;
  blockers: string[];
  validations: string[];
  risks: Array<{ label: string; tone: AiSeverity }>;
  draftMessage: string;
  secureMode: string;
};

function pushIf(target: string[], condition: boolean, message: string) {
  if (condition) target.push(message);
}

function isInvalidDateValue(value: string) {
  if (!value) return false;
  return Number.isNaN(new Date(value).getTime());
}

function toneForRisk(level: string): AiSeverity {
  const normalized = String(level || '').toLowerCase();
  if (normalized.includes('urgent') || normalized.includes('critical') || normalized.includes('high')) return 'urgent';
  if (normalized.includes('watch') || normalized.includes('approaching') || normalized.includes('medium')) return 'watch';
  return 'info';
}

export function buildSupplierAiBrief(shipment: any, nextAction: { title: string; helper: string } | null): OperationsAiBrief {
  const blockers: string[] = [];
  const validations: string[] = [];
  const risks: OperationsAiBrief['risks'] = [];
  const totalGross = (shipment?.cargoItems || []).reduce((sum: number, item: any) => sum + Number(item.grossWeightKg || 0), 0);
  const docs = shipment?.documents || [];

  pushIf(blockers, !shipment?.customerName, 'Customer name is still missing.');
  pushIf(blockers, (shipment?.cargoItems || []).length === 0, 'Cargo lines are not complete yet.');
  pushIf(blockers, docs.some((item: any) => !item.uploaded), 'Origin document pack is still incomplete.');
  pushIf(blockers, !shipment?.container?.containerNumber || !shipment?.container?.sealNumber, 'Container and seal controls are still open.');
  pushIf(blockers, !shipment?.etd || !shipment?.etaDjibouti, 'Ocean handoff dates are still incomplete.');

  pushIf(validations, isInvalidDateValue(shipment?.etd || ''), `ETD format looks invalid: ${shipment?.etd}.`);
  pushIf(validations, isInvalidDateValue(shipment?.etaDjibouti || ''), `ETA Djibouti format looks invalid: ${shipment?.etaDjibouti}.`);
  pushIf(validations, totalGross > 28000, `Gross weight plan is above the 28-ton planning limit at ${totalGross.toLocaleString()} kg.`);
  pushIf(validations, !shipment?.assignedAgent, 'Assigned supplier agent is empty.');
  pushIf(validations, shipment?.finalDestination === 'Customer delivery location', 'Final delivery location is still generic and should be clarified.');

  if (docs.some((item: any) => item.type === 'Final BL' && item.status === 'missing')) risks.push({ label: 'Final BL is not uploaded yet.', tone: 'watch' });
  if (totalGross > 26000) risks.push({ label: 'Cargo weight is close to the operational limit.', tone: 'watch' });
  if (shipment?.currentStage === 'Ready for vessel handoff') risks.push({ label: 'Origin file is ready. Delay now risks handoff slippage.', tone: 'info' });

  return {
    title: 'AI Origin Copilot',
    summary: nextAction?.helper || 'Origin file controls are being monitored for missing data, risky values, and handoff blockers.',
    nextAction: nextAction?.title || 'Review the origin file',
    blockers,
    validations,
    risks,
    draftMessage: `Origin file ${shipment?.bookingNumber || ''} for ${shipment?.customerName || 'the customer'} is at ${shipment?.currentStage || 'origin review'}. Next control: ${nextAction?.title || 'review the file'}.`,
    secureMode: 'AI suggestions are advisory only. Shipment creation, document upload, and vessel handoff still require operator confirmation.',
  };
}

export function buildDjiboutiAiBrief(record: any, nextAction: { title: string; helper: string }): OperationsAiBrief {
  const blockers: string[] = [];
  const validations: string[] = [];
  const risks: OperationsAiBrief['risks'] = [];

  pushIf(blockers, !record?.vesselArrival, 'Vessel arrival has not been confirmed.');
  pushIf(blockers, !record?.dischargeTime, 'Discharge confirmation is still missing.');
  pushIf(blockers, !record?.lineReleaseReceived, 'Shipping line release is still blocking gate-out.');
  pushIf(blockers, !record?.customsTransit?.customsCleared, 'Customs clearance is not complete.');
  pushIf(blockers, !record?.customsTransit?.transitPacketComplete, 'Transit packet is still incomplete.');

  pushIf(validations, isInvalidDateValue(record?.vesselArrival || ''), `Vessel arrival timestamp looks invalid: ${record?.vesselArrival}.`);
  pushIf(validations, !record?.blNumber, 'BL reference is missing.');
  pushIf(validations, !record?.containerNumber, 'Container reference is missing.');
  pushIf(validations, record?.finalDestination === 'Customer delivery location', 'Final destination is still generic and should be clarified for inland routing.');

  risks.push({ label: `Storage risk is ${record?.storageRisk || 'Safe'}.`, tone: toneForRisk(record?.storageRisk) });
  (record?.exceptions || []).slice(0, 2).forEach((item: any) => {
    risks.push({ label: item.issueText, tone: toneForRisk(item.severity) });
  });

  return {
    title: 'AI Release Copilot',
    summary: nextAction.helper,
    nextAction: nextAction.title,
    blockers,
    validations,
    risks,
    draftMessage: `Djibouti release file ${record?.bookingNumber || ''} is waiting on ${nextAction.title.toLowerCase()}. Current stage: ${record?.currentStage || 'release review'}.`,
    secureMode: 'AI can draft reminders and detect blockers, but release, customs, and gate-out still require desk approval.',
  };
}

export function buildDispatchAiBrief(trip: any, nextActionTitle: string): OperationsAiBrief {
  const blockers: string[] = [];
  const validations: string[] = [];
  const risks: OperationsAiBrief['risks'] = [];
  const latestCheckpoint = trip?.checkpoints?.[trip.checkpoints.length - 1];

  pushIf(blockers, trip?.assignedTruck === 'Not assigned', 'Truck assignment is still open.');
  pushIf(blockers, trip?.assignedDriver === 'Not assigned' || trip?.assignedDriver === 'Pending driver', 'Driver assignment is still open.');
  pushIf(blockers, !trip?.transitPack?.packetComplete, 'Transit pack is incomplete.');
  pushIf(blockers, !trip?.arrivalReadiness?.arrivalNoticeSent, 'Arrival notice has not been sent to yard.');
  pushIf(blockers, !trip?.arrivalReadiness?.unloadContactConfirmed, 'Unload contact is not confirmed.');

  pushIf(validations, !trip?.containerNumber, 'Container number is missing from the dispatch file.');
  pushIf(validations, !trip?.sealNumber, 'Seal number is missing from the dispatch file.');
  pushIf(validations, isInvalidDateValue(trip?.expectedArrivalTime || ''), `Expected arrival time looks invalid: ${trip?.expectedArrivalTime}.`);
  pushIf(validations, !latestCheckpoint, 'No checkpoint timeline exists yet.');

  risks.push({ label: `Delay risk is ${trip?.delayRisk || 'Safe'}.`, tone: toneForRisk(trip?.delayRisk) });
  if (latestCheckpoint?.sealConfirmed === false) risks.push({ label: 'Latest checkpoint did not confirm the seal as intact.', tone: 'urgent' });
  (trip?.issues || []).slice(0, 2).forEach((issue: any) => {
    risks.push({ label: issue.issueText, tone: toneForRisk(issue.severity) });
  });

  return {
    title: 'AI Dispatch Copilot',
    summary: 'Dispatch is monitoring trip readiness, mobile sync, checkpoint continuity, and yard handoff readiness.',
    nextAction: nextActionTitle,
    blockers,
    validations,
    risks,
    draftMessage: `Trip ${trip?.tripId || ''} for booking ${trip?.bookingNumber || ''} is currently ${trip?.currentTripStatus || 'under dispatch review'}. Next action: ${nextActionTitle}.`,
    secureMode: 'AI can recommend dispatch actions and draft driver/customer messages, but route changes, departure, and handoff still require explicit operator approval.',
  };
}

export function buildYardAiBrief(record: any, receipt: any, nextAction: { title: string; helper: string }): OperationsAiBrief {
  const blockers: string[] = [];
  const validations: string[] = [];
  const risks: OperationsAiBrief['risks'] = [];

  pushIf(blockers, !record?.arrivalControl?.actualArrivalTime, 'Inland arrival is not confirmed.');
  pushIf(blockers, !record?.unloadStatus?.unloadCompleted, 'Unload is not complete.');
  pushIf(blockers, receipt?.podStatus === 'pending', 'POD is still pending.');
  pushIf(blockers, !['received_clean', 'customer_confirmed', 'resolved'].includes(receipt?.status), 'Customer confirmation is still open or under review.');
  pushIf(blockers, !record?.emptyReturn?.emptyReleaseGranted, 'Empty release has not been granted.');
  pushIf(blockers, !record?.emptyReturn?.returnReceiptAvailable, 'Return receipt is still missing.');

  pushIf(validations, isInvalidDateValue(record?.arrivalControl?.actualArrivalTime || ''), `Actual arrival time looks invalid: ${record?.arrivalControl?.actualArrivalTime}.`);
  pushIf(validations, record?.podReadiness?.consigneeContact?.toLowerCase?.().includes('pending'), 'Receiving contact is still pending.');
  pushIf(validations, receipt?.status === 'received_clean' && receipt?.signatureCaptured !== true, 'Clean receipt is marked complete without signature capture.');
  pushIf(validations, receipt?.status === 'received_clean' && receipt?.photoProofCaptured !== true, 'Clean receipt is marked complete without receiving photo proof.');

  risks.push({ label: `Detention risk is ${record?.emptyReturn?.detentionRiskOpen ? 'open' : 'closed'}.`, tone: record?.emptyReturn?.detentionRiskOpen ? 'urgent' : 'info' });
  if (record?.exceptions?.length) {
    record.exceptions.slice(0, 2).forEach((item: any) => risks.push({ label: item.issueText, tone: toneForRisk(item.severity) }));
  }

  return {
    title: 'AI Closure Copilot',
    summary: nextAction.helper,
    nextAction: nextAction.title,
    blockers,
    validations,
    risks,
    draftMessage: `Shipment ${record?.bookingNumber || ''} at ${record?.inlandNode || 'the yard'} is at ${record?.yardStage || 'yard review'}. Next closure step: ${nextAction.title}.`,
    secureMode: 'AI can draft customer notices and highlight demurrage or POD risks, but receipt confirmation, empty return, and cycle closure still require operator confirmation.',
  };
}

export function buildExecutiveAiBrief(shipment: any): OperationsAiBrief {
  const blockers: string[] = [];
  const validations: string[] = [];
  const risks: OperationsAiBrief['risks'] = [];
  const timeline = shipment?.timeline || [];
  const activeStage = timeline.find((item: any) => item.status === 'active')?.stage || shipment?.stage;

  pushIf(blockers, String(shipment?.stage || '').toLowerCase().includes('blocked'), 'The priority shipment still has an active blocker.');
  pushIf(blockers, String(shipment?.exception || '').toLowerCase().includes('pending'), 'The priority shipment still carries an unresolved pending note.');
  pushIf(validations, !shipment?.containerNumber, 'Container number is missing from the executive drilldown.');
  pushIf(validations, !shipment?.sealNumber, 'Seal number is missing from the executive drilldown.');

  risks.push({ label: `Priority shipment is at ${activeStage || 'an active stage'}.`, tone: String(shipment?.stage || '').toLowerCase().includes('closed') ? 'info' : 'watch' });
  if (String(shipment?.exception || '').length > 0) risks.push({ label: shipment.exception, tone: toneForRisk(shipment.exception) });

  return {
    title: 'AI Executive Copilot',
    summary: 'Executive AI condenses blockers, risk posture, and the next command decision for the corridor.',
    nextAction: 'Drive the highest-risk shipment or desk blocker now',
    blockers,
    validations,
    risks,
    draftMessage: `Executive attention should focus on ${shipment?.shipmentRef || 'the priority shipment'} which is currently at ${shipment?.stage || activeStage}.`,
    secureMode: 'AI summaries are read-only. They never auto-release shipments, auto-send customer messages, or override desk approvals.',
  };
}
