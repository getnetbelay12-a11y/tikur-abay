export type TransitorDeskStatus =
  | 'transitor_assigned'
  | 'clearance_in_progress'
  | 'charges_pending'
  | 'charges_paid'
  | 't1_prepared'
  | 'clearance_ready';

export type TransitorClearanceRecord = {
  id: string;
  releaseRecordId: string;
  bookingNumber: string;
  blNumber: string;
  containerNumber: string;
  customerName: string;
  inlandDestination: string;
  transitorAssignedTo: string;
  transitorCompany: string;
  transitorPhone: string;
  transitorEmail: string;
  transitorClearanceNote: string;
  transitorAssignedAt?: string;
  transitDocumentRef: string;
  transitDocumentStatus: 'missing' | 'draft' | 'prepared' | 'approved';
  chargesPaymentStatus: 'pending' | 'cleared' | 'paid';
  clearancePacketStatus: 'incomplete' | 'review_pending' | 'complete';
  transportClearanceReady: boolean;
  clearanceCompletedAt: string;
  multimodalReceivedAt: string;
  storageRisk: 'Safe' | 'Approaching' | 'Urgent';
  status: TransitorDeskStatus;
  issues: string[];
  blockerType?: string;
  blockerNote?: string;
  blockerSubmittedAt?: string;
};

export const transitorClearanceStorageKey = 'tikur-abay:transitor-clearance:records';

export const seededTransitorRecords: TransitorClearanceRecord[] = [
  {
    id: 'transitor-001',
    releaseRecordId: 'dji-1',
    bookingNumber: 'TAB-DJI-260319-01',
    blNumber: 'MSKU-DJI-884211',
    containerNumber: 'MSCU 458912-7',
    customerName: 'East Gate Manufacturing PLC',
    inlandDestination: 'Modjo Dry Port',
    transitorAssignedTo: 'Biniyam Tarekegn',
    transitorCompany: 'Abay Transit Services',
    transitorPhone: '+251 911 552 201',
    transitorEmail: 'write2get@gmail.com',
    transitorClearanceNote: 'Primary transitor owner for Djibouti to Modjo customs packet.',
    transitorAssignedAt: '2026-03-19T18:43:00Z',
    transitDocumentRef: 'T1-DJI-99281',
    transitDocumentStatus: 'draft',
    chargesPaymentStatus: 'pending',
    clearancePacketStatus: 'review_pending',
    transportClearanceReady: false,
    clearanceCompletedAt: '',
    multimodalReceivedAt: '2026-03-19T18:43:00Z',
    storageRisk: 'Approaching',
    status: 'clearance_in_progress',
    issues: ['T1 draft is ready but charges are not marked paid yet.'],
    blockerType: '',
    blockerNote: '',
    blockerSubmittedAt: '',
  },
];
