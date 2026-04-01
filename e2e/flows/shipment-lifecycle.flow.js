const { DashboardPage } = require('../pages/dashboard.page');
const { ShipmentIntakePage } = require('../pages/shipment-intake.page');
const { ChinaDeskPage } = require('../pages/china-desk.page');
const { DjiboutiReleasePage } = require('../pages/djibouti-release.page');
const { ClearancePage } = require('../pages/clearance.page');
const { adminBaseUrl } = require('../helpers/environment');

async function createQuotedBooking({ page, fixture }) {
  const dashboard = new DashboardPage(page);
  const intake = new ShipmentIntakePage(page);

  await dashboard.open();
  await dashboard.startBooking();
  await page.waitForURL(`${adminBaseUrl}/shipments/intake?mode=booking`);
  await intake.fillShipmentDetails(fixture);
  await intake.generateQuote();

  await intake.approveQuoteByEmail();
  await intake.confirmBooking();
  return intake.latestRequestForCustomer(fixture.customerName);
}

async function handoffBookingToChinaDesk({ page, bookingId }) {
  const chinaDesk = new ChinaDeskPage(page);
  await chinaDesk.open(bookingId);
  await chinaDesk.selectShipment(bookingId);
  return chinaDesk;
}

async function handoffBookingToDjiboutiRelease({ page, bookingId }) {
  const djiboutiRelease = new DjiboutiReleasePage(page);
  await djiboutiRelease.open(bookingId);
  await djiboutiRelease.selectShipment(bookingId);
  return djiboutiRelease;
}

async function handoffBookingToClearance({ page, bookingId }) {
  const clearance = new ClearancePage(page);
  await clearance.open(bookingId);
  await clearance.selectShipment(bookingId);
  return clearance;
}

async function seedClearanceFromBooking({ page, bookingRecord }) {
  await page.goto(`${adminBaseUrl}/operations/transitor-clearance?booking=${encodeURIComponent(bookingRecord.bookingId)}`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(({ bookingId, customerName }) => {
    const clearanceKey = 'tikur-abay:transitor-clearance:records';
    const now = new Date().toISOString();

    const read = (key) => {
      const raw = window.localStorage.getItem(key);
      if (!raw) return [];
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    };

    const write = (key, value) => {
      window.localStorage.setItem(key, JSON.stringify(value));
      window.dispatchEvent(new StorageEvent('storage', { key, newValue: JSON.stringify(value) }));
      window.dispatchEvent(new CustomEvent('tikur-abay:manual-corridor:storage-updated', { detail: { key, bookingNumber: bookingId } }));
    };

    const record = {
      id: `transitor-manual-e2e-${bookingId}`,
      releaseRecordId: `manual-release-e2e-${bookingId}`,
      bookingNumber: bookingId,
      blNumber: `BL-${bookingId}`,
      containerNumber: 'MSCU4444444',
      customerName,
      inlandDestination: 'Adama Dry Port',
      transitorAssignedTo: 'Pending transitor owner',
      transitorCompany: '',
      transitorPhone: '',
      transitorEmail: '',
      transitorClearanceNote: '',
      transitDocumentRef: `T1-${bookingId}`,
      transitDocumentStatus: 'prepared',
      chargesPaymentStatus: 'pending',
      clearancePacketStatus: 'review_pending',
      transportClearanceReady: false,
      clearanceCompletedAt: '',
      multimodalReceivedAt: now,
      storageRisk: 'Approaching',
      status: 'transitor_assigned',
      issues: ['E2E seeded clearance file created from Djibouti handoff.'],
      blockerType: '',
      blockerNote: '',
      blockerSubmittedAt: '',
    };

    write(clearanceKey, [record, ...read(clearanceKey).filter((item) => item.bookingNumber !== bookingId)]);
  }, { bookingId: bookingRecord.bookingId, customerName: bookingRecord.customerName });
}

async function seedDjiboutiReleaseFromBooking({ page, bookingRecord }) {
  await page.goto(`${adminBaseUrl}/operations/djibouti-release?booking=${encodeURIComponent(bookingRecord.bookingId)}`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(({ bookingId, customerName }) => {
    const releaseKey = 'tikur-abay:manual-corridor:djibouti-release';
    const now = new Date().toISOString();

    const read = (key) => {
      const raw = window.localStorage.getItem(key);
      if (!raw) return [];
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    };

    const write = (key, value) => {
      window.localStorage.setItem(key, JSON.stringify(value));
      window.dispatchEvent(new StorageEvent('storage', { key, newValue: JSON.stringify(value) }));
      window.dispatchEvent(new CustomEvent('tikur-abay:manual-corridor:storage-updated', { detail: { key, bookingNumber: bookingId } }));
    };

    const record = {
      id: `manual-release-e2e-${bookingId}`,
      bookingNumber: bookingId,
      blNumber: `BL-${bookingId}`,
      containerNumber: 'MSCU4444444',
      sealNumber: 'SL-444444',
      customerName,
      serviceType: 'multimodal',
      vesselName: 'MV Test Horizon',
      voyageNumber: 'VH-100',
      dischargePort: 'Djibouti Port',
      finalDestination: 'Adama Dry Port',
      currentStage: 'Vessel arrived',
      assignedAgent: 'Manual Djibouti desk',
      lastUpdated: now,
      vesselArrival: '',
      dischargeTime: '',
      etaSummary: 'Origin handoff received · ready for Djibouti release processing',
      releaseStatus: 'Awaiting release',
      customsStatus: 'Pending',
      storageRisk: 'Approaching',
      lineReleaseReceived: false,
      terminalReleaseReady: false,
      customsHold: false,
      releaseNoteUploaded: true,
      gateOutReady: false,
      inlandHandoffSent: false,
      releaseOwner: 'Manual Djibouti desk',
      releaseDeadline: now,
      expectedGateOutTime: now,
      releaseBlockers: 'Vessel arrival, discharge, customs clearance, and gate pass still need confirmation.',
      customsTransit: {
        declarationReference: 'Pending declaration',
        transitType: 'T1',
        transitNumber: `T1-${bookingId}`,
        inspectionStatus: 'Pending',
        customsNoteStatus: 'Uploaded',
        customsCleared: false,
        dutyTaxNote: 'Customer final destination remains customer location.',
        bondGuaranteeNote: 'Transit bond note pending.',
        transitPacketComplete: false,
      },
      storage: {
        terminalDepot: 'Djibouti Port Terminal',
        freeTimeStart: now,
        freeTimeEnd: now,
        timeRemainingHours: 48,
        warningText: 'Free-time window created. Gate-out should complete before detention exposure.',
        gatePassStatus: 'Pending',
        terminalPickupStatus: 'Pickup blocked until release controls are complete.',
      },
      handoff: {
        destinationCorridor: 'Djibouti -> Galafi -> Adama',
        inlandDestination: 'Adama Dry Port',
        dispatchOwner: 'Adama Corridor Control',
        truckAssignmentStatus: 'Awaiting transitor / clearance desk',
        tripCreationStatus: 'Not created',
        handoffPacketComplete: true,
        packetItems: [
          { label: 'BL', complete: true },
          { label: 'Invoice', complete: true },
          { label: 'Packing list', complete: true },
          { label: 'Transit/customs doc', complete: true },
          { label: 'Release note', complete: true },
          { label: 'Container + seal', complete: true },
          { label: 'Customer contact', complete: true },
          { label: 'Special handling notes', complete: true },
        ],
      },
      exceptions: [
        {
          id: `manual-release-exception-${bookingId}`,
          severity: 'Medium',
          issueText: 'Manual release file created from origin handoff for E2E lifecycle.',
          actionLabel: 'Process release',
        },
      ],
    };

    write(releaseKey, [record, ...read(releaseKey).filter((item) => item.bookingNumber !== bookingId)]);
  }, { bookingId: bookingRecord.bookingId, customerName: bookingRecord.customerName });
}

async function seedCorridorAndYardFromBooking({ page, bookingRecord }) {
  await page.goto(`${adminBaseUrl}/china-desk/queue?booking=${encodeURIComponent(bookingRecord.bookingId)}`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(({ bookingId, customerName }) => {
    const dispatchKey = 'tikur-abay:manual-corridor:dispatch-trips';
    const yardKey = 'tikur-abay:manual-corridor:yard-records';
    const releaseControlsKey = 'tikur-abay:shipping-phase4:release-controls';
    const now = new Date().toISOString();

    const read = (key) => {
      const raw = window.localStorage.getItem(key);
      if (!raw) return [];
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    };

    const write = (key, value) => {
      const serialized = JSON.stringify(value);
      window.localStorage.setItem(key, serialized);
      window.dispatchEvent(new CustomEvent('tikur-abay:shipping-phase1:updated', { detail: { key } }));
      window.dispatchEvent(new StorageEvent('storage', { key, newValue: serialized }));
    };

    const dispatch = {
      id: `e2e-dispatch-${bookingId}`,
      tripId: `TRP-${bookingId}`,
      bookingNumber: bookingId,
      blNumber: `BL-${bookingId}`,
      containerNumber: 'MSCU4444444',
      sealNumber: 'SL-444444',
      customerName,
      serviceType: 'multimodal',
      corridorRoute: 'Djibouti -> Galafi -> Adama Dry Port',
      originHandoffPoint: 'Djibouti Gate',
      inlandDestination: 'Adama Dry Port',
      currentTripStatus: 'Awaiting truck assignment',
      assignedDispatchOwner: 'Adama Corridor Control',
      assignedTruck: 'Pending truck',
      assignedTrailer: 'Pending trailer',
      assignedDriver: 'Pending driver',
      driverType: 'Internal',
      partnerName: 'Tikur Abay Fleet',
      plannedDepartureTime: now,
      expectedArrivalTime: now,
      routeType: 'Djibouti to Adama corridor',
      dispatchNote: 'E2E dispatch record created from accepted booking path.',
      handoffSource: 'China Port Agent Desk',
      etaSummary: 'Awaiting inland departure',
      driverStatus: 'Awaiting assignment',
      issueChip: null,
      delayRisk: 'Low',
      lastGpsTimestamp: 'Not started',
      lastUpdated: now,
      transitPack: {
        packetComplete: true,
        mobileSyncStatus: 'Pending sync',
        driverAcknowledgement: 'Waiting driver assignment',
        lastPacketUpdate: now,
        qrGenerated: false,
        packetItems: [
          { label: 'BL', complete: true },
          { label: 'Packing list', complete: true },
          { label: 'Invoice summary', complete: true },
          { label: 'Transit/customs document', complete: true },
          { label: 'Release note', complete: true },
          { label: 'Container number', complete: true },
          { label: 'Seal number', complete: true },
          { label: 'Consignee/contact', complete: true },
        ],
      },
      liveMovement: {
        currentLocation: 'Djibouti Gate',
        corridorName: 'Djibouti -> Galafi -> Adama',
        distanceToDestinationKm: 780,
        eta: now,
        speedSummary: 'No movement yet',
        movementHealth: 'On schedule',
      },
      checkpoints: [
        {
          id: `cp-${bookingId}-1`,
          label: 'Gate-out from Djibouti',
          timestamp: '',
          location: 'Djibouti Gate',
          status: 'Pending',
          driverNote: '',
          sealConfirmed: false,
          officerNote: '',
        },
      ],
      exceptions: [],
      issues: [],
      arrivalReadiness: {
        destinationNode: 'Adama Dry Port',
        unloadHandoffOwner: 'Adama Yard Control',
        yardContact: 'Adama Dry Port Desk',
        specialHandlingInstructions: 'Standard inland handoff',
        podExpectation: 'POD required after unload',
        emptyReturnInstructionAvailable: true,
        arrivalNoticeSent: false,
        unloadContactConfirmed: false,
      },
    };

    write(dispatchKey, [dispatch, ...read(dispatchKey).filter((item) => item.bookingNumber !== bookingId)]);
    write(yardKey, read(yardKey).filter((item) => item.bookingNumber !== bookingId));
    write(releaseControlsKey, {
      ...(() => {
        const raw = window.localStorage.getItem(releaseControlsKey);
        if (!raw) return {};
        try {
          const parsed = JSON.parse(raw);
          return parsed && typeof parsed === 'object' ? parsed : {};
        } catch {
          return {};
        }
      })(),
      [bookingId]: {
        bookingId,
        quoteId: bookingId.replace(/^BK-/, 'QT-'),
        customerName,
        bankBillReceivedAt: now,
        bankBillReference: `EBILL-${bookingId.replace(/^BK-/, '')}`,
        customerBankSlipReceivedAt: now,
        customerBankSlipReference: `BANKSLIP-${bookingId.replace(/^BK-/, '')}`,
        cFeeInvoiceIssuedAt: now,
        cFeeInvoiceReference: `INV-${bookingId.replace(/^BK-/, '')}-C-FEE`,
        portClearanceInvoiceIssuedAt: now,
        portClearanceInvoiceReference: `INV-${bookingId.replace(/^BK-/, '')}-PORT`,
        transportInvoiceIssuedAt: now,
        transportInvoiceReference: `INV-${bookingId.replace(/^BK-/, '')}-TRANSPORT`,
        customerReceiptsReceivedAt: now,
        customerReceiptReference: `PAYREC-${bookingId.replace(/^BK-/, '')}`,
        tikurFinanceReceiptIssuedAt: now,
        tikurFinanceReceiptReference: `TABREC-${bookingId.replace(/^BK-/, '')}`,
        cargoReleaseAuthorizedAt: now,
        cargoReleaseReference: `REL-${bookingId.replace(/^BK-/, '')}`,
        releaseSentToDryPortAt: now,
        customsDocumentsHandedOverAt: now,
        fullContainerInterchangeIssuedAt: now,
        emptyReturnInterchangeReceivedAt: '',
        releaseNote: 'E2E local seed authorized cargo release and posted the release note to the dry-port desk.',
      },
    });
  }, { bookingId: bookingRecord.bookingId, customerName: bookingRecord.customerName });
}

module.exports = {
  createQuotedBooking,
  handoffBookingToChinaDesk,
  handoffBookingToDjiboutiRelease,
  handoffBookingToClearance,
  seedDjiboutiReleaseFromBooking,
  seedClearanceFromBooking,
  seedCorridorAndYardFromBooking,
};
