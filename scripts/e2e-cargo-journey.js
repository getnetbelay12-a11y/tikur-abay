#!/usr/bin/env node

const fs = require('node:fs/promises');
const path = require('node:path');
const { existsSync, readFileSync } = require('node:fs');
const assert = require('node:assert/strict');

const projectRoot = path.join(__dirname, '..');
const localProdEnvPath = path.join(projectRoot, '.env.local-prod');
const rootEnvPath = path.join(projectRoot, '.env');
const backendEnvPath = path.join(projectRoot, 'apps/backend/.env');

if (existsSync(localProdEnvPath)) {
  const parsed = parseEnv(readFileSync(localProdEnvPath, 'utf8'));
  for (const [key, value] of Object.entries(parsed)) {
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

for (const envPath of [rootEnvPath, backendEnvPath]) {
  if (!existsSync(envPath)) {
    continue;
  }
  const parsed = parseEnv(readFileSync(envPath, 'utf8'));
  for (const key of ['LOCAL_MONGODB_URI', 'MONGODB_URI', 'MONGO_URI']) {
    if (parsed[key]) {
      process.env[key] = parsed[key];
    }
  }
}

process.env.MONGODB_URI =
  process.env.MONGODB_URI ||
  process.env.MONGO_URI ||
  'mongodb+srv://getnetbelay12_db_user:69UVhOKto7s4AmP7@cluster0.8yqhj1v.mongodb.net/tikur_abay?retryWrites=true&w=majority&appName=Cluster0';
process.env.MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

const {
  connectToDatabase,
  disconnectFromDatabase,
} = require('../apps/backend/dist/database/mongo');
const {
  CorridorShipmentModel,
  CorridorPartyAccessModel,
  CorridorCargoItemModel,
  CorridorDocumentModel,
  CorridorContainerModel,
  CorridorMilestoneModel,
  CorridorExceptionModel,
  CorridorTripAssignmentModel,
  CorridorCheckpointEventModel,
  CorridorEmptyReturnModel,
  UserModel,
} = require('../apps/backend/dist/database/models');

const API_BASE = process.env.API_BASE_URL || 'http://127.0.0.1:6012/api/v1';
const REPORTS_DIR = path.join(__dirname, '..', 'reports');
const argv = new Set(process.argv.slice(2));
const PREPARE_ONLY = argv.has('--prepare-only');
const RESET_ONLY = argv.has('--reset-only');
const WRITE_REPORT = !argv.has('--no-report');

const cargoLineBlueprint = [
  ['01', 'Electric motors', '8501.52', 'Crate', 12, 6400, 6120, 8.6],
  ['02', 'Industrial cables', '8544.49', 'Pallet', 18, 4820, 4550, 6.1],
  ['03', 'Control panels', '8537.10', 'Crate', 7, 2980, 2760, 4.4],
  ['04', 'Steel fittings', '7307.99', 'Carton', 24, 1760, 1620, 2.8],
  ['05', 'Packaging materials', '3923.90', 'Bundle', 15, 920, 860, 1.9],
];

function parseEnv(contents) {
  return contents
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .reduce((accumulator, line) => {
      const separatorIndex = line.indexOf('=');
      if (separatorIndex === -1) {
        return accumulator;
      }

      const key = line.slice(0, separatorIndex).trim();
      let value = line.slice(separatorIndex + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      accumulator[key] = value;
      return accumulator;
    }, {});
}

function buildCargoLines(config) {
  return cargoLineBlueprint.map(([lineNo, description, hsCode, packageType, packageQuantity, grossWeight, netWeight, cbm]) => ({
    cargoItemId: `${config.shipmentId}-ITEM-${lineNo}`,
    shipmentId: config.shipmentId,
    shipmentRef: config.shipmentRef,
    lineNumber: Number(lineNo),
    lineNo,
    containerNumber: config.containerNumber,
    description,
    hsCode,
    packageType,
    packageQty: packageQuantity,
    grossWeightKg: grossWeight,
    netWeightKg: netWeight,
    cbm,
    invoiceRef: config.invoiceRef,
    packingListRef: config.packingListRef,
    transitDocRef: config.transitRef,
    marksNumbers: `${config.bookingNumber}/L${lineNo}`,
    discrepancyStatus: config.scenario === 'customer_issue' && lineNo === '02' ? 'variance_flagged' : 'clear',
    inspectionStatus: config.scenario === 'clearance_risk' && lineNo === '01' ? 'under_review' : 'cleared',
    remarks:
      config.scenario === 'customer_issue' && lineNo === '02'
        ? 'Shortage and carton damage reported during final receipt.'
        : config.scenario === 'clearance_risk' && lineNo === '01'
          ? 'Customs note follow-up still open before dispatch release.'
          : 'Demo cargo line seeded for local validation.',
  }));
}

function createBaseShipment(config) {
  return {
    shipmentId: config.shipmentId,
    bookingNumber: config.bookingNumber,
    shipmentRef: config.shipmentRef,
    customerId: config.customerCode,
    customerCode: config.customerCode,
    serviceMode: 'multimodal',
    serviceType: 'multimodal',
    shipmentStatus: config.status,
    status: config.status,
    customerName: config.customerName,
    supplierName: 'Shanghai East Port Agent',
    supplierAgentId: 'supplier.agent@tikurabay.com',
    supplierLocation: 'Shanghai, China',
    consigneeName: config.consigneeName,
    carrierName: 'MSC',
    shippingLine: 'MSC',
    incoterm: 'CIF',
    commoditySummary: `${config.scenarioLabel}: Electric motors, industrial cables, control panels, steel fittings, packaging materials`,
    quoteId: config.quoteId,
    bookingId: config.bookingId,
    requestSource: config.requestSource,
    quoteStatus: config.quoteStatus,
    bookingStatus: config.bookingStatus,
    quoteAmount: config.quoteAmount,
    quoteCurrency: 'USD',
    acceptedAt: new Date(config.acceptedAt),
    convertedToShipmentId: config.shipmentId,
    assignedOriginAgentId: 'supplier.agent@tikurabay.com',
    assignedOriginAgentEmail: 'supplier.agent@tikurabay.com',
    originCountry: 'China',
    originPort: 'Shanghai',
    portOfLoading: 'Shanghai',
    dischargePort: 'Djibouti',
    portOfDischarge: 'Djibouti',
    destinationCountry: 'Ethiopia',
    destinationNode: config.inlandDestination,
    inlandDestination: config.inlandDestination,
    dryPortNode: config.inlandDestination,
    finalDeliveryLocation: config.finalDeliveryLocation,
    corridorRoute: config.corridorRoute,
    currentStage: config.currentStage,
    currentOwnerRole: config.currentOwnerRole,
    currentStatus: config.status,
    exceptionStatus: config.exceptionStatus,
    priority: config.priority,
    vesselName: 'MV Red Sea Bridge',
    voyageNumber: 'RSB-042W',
    etd: new Date('2026-03-19T08:00:00Z'),
    etaDjibouti: new Date('2026-03-27T06:00:00Z'),
    billOfLadingNumber: config.blNumber,
    masterBillOfLadingNumber: config.mblNumber,
    houseBillOfLadingNumber: config.hblNumber,
    containerIds: [config.containerId],
    activeContainerCount: 1,
    sealNumbers: [config.sealNumber],
    containerTypeSummary: '40HC',
    invoiceStatus: 'approved',
    packingListStatus: 'approved',
    blStatus: 'approved',
    customsDocStatus: config.currentStage === 'transitor_clearance' ? 'under_review' : 'approved',
    transitDocStatus: config.currentStage === 'transitor_clearance' ? 'uploaded' : 'approved',
    releaseNoteStatus: ['transitor_clearance', 'closed', 'empty_return'].includes(config.currentStage) ? 'approved' : 'uploaded',
    podStatus: config.podStatus,
    customerConfirmationStatus: config.customerConfirmationStatus,
    customerConfirmedAt: config.customerConfirmedAt ? new Date(config.customerConfirmedAt) : undefined,
    customerConfirmedBy: config.customerConfirmedBy,
    customerConfirmationNote: config.customerConfirmationNote,
    shortageStatus: config.shortageStatus,
    damageStatus: config.damageStatus,
    closureBlockedReason: config.closureBlockedReason,
    emptyReturnOpen: config.currentStage !== 'closed',
    returnReceiptStatus: config.returnReceiptStatus,
    originReady: true,
    djiboutiReleaseReady: true,
    dispatchReady: config.dispatchReady,
    inlandArrivalReady: config.inlandArrivalReady,
    yardClosureReady: config.yardClosureReady,
    emptyReturnClosed: config.emptyReturnClosed,
    invoiceIds: [config.invoiceRef],
    totalChargeAmount: config.quoteAmount,
    paymentStatus: config.paymentStatus,
    taxDutyStatus: config.taxDutyStatus,
    financeBlockReason: config.financeBlockReason,
    hasExceptions: config.hasExceptions,
    activeExceptionCount: config.activeExceptionCount,
    latestExceptionSummary: config.latestExceptionSummary,
    riskLevel: config.riskLevel,
    originFileSentAt: new Date(config.originFileSentAt),
    originFileSentBy: 'supplier.agent@tikurabay.com',
    multimodalReceivedAt: new Date(config.multimodalReceivedAt),
    transitorAssignedTo: config.transitorAssignedTo,
    transitorAssignedAt: config.transitorAssignedAt ? new Date(config.transitorAssignedAt) : undefined,
    transitDocumentRef: config.transitRef,
    transitDocumentStatus: config.transitDocumentStatus,
    chargesPaymentStatus: config.chargesPaymentStatus,
    clearancePacketStatus: config.clearancePacketStatus,
    transportClearanceReady: config.transportClearanceReady,
    clearanceReadyAt: config.clearanceReadyAt ? new Date(config.clearanceReadyAt) : undefined,
    clearanceCompletedAt: config.clearanceCompletedAt ? new Date(config.clearanceCompletedAt) : undefined,
    fullOutDjiboutiAt: config.lifecycle.fullOutDjiboutiAt ? new Date(config.lifecycle.fullOutDjiboutiAt) : undefined,
    fullInDryPortAt: config.lifecycle.fullInDryPortAt ? new Date(config.lifecycle.fullInDryPortAt) : undefined,
    fullOutCustomerAt: config.lifecycle.fullOutCustomerAt ? new Date(config.lifecycle.fullOutCustomerAt) : undefined,
    emptyInDryPortAt: config.lifecycle.emptyInDryPortAt ? new Date(config.lifecycle.emptyInDryPortAt) : undefined,
    emptyOutDryPortAt: config.lifecycle.emptyOutDryPortAt ? new Date(config.lifecycle.emptyOutDryPortAt) : undefined,
    emptyInDjiboutiAt: config.lifecycle.emptyInDjiboutiAt ? new Date(config.lifecycle.emptyInDjiboutiAt) : undefined,
    container: {
      containerNumber: config.containerNumber,
      sealNumber: config.sealNumber,
      status: config.containerStatus,
    },
    taxDutySummary: config.taxDutySummary,
    releaseReadiness: config.releaseReadiness,
    emptyReturnSummary: config.emptyReturnSummary,
  };
}

async function main() {
  console.log(RESET_ONLY ? 'Removing demo logistics scenarios...' : 'Preparing demo logistics scenarios...');
  await connectToDatabase();

  const customerOne = await UserModel.findOne({ email: 'customer1@tikurabay.com' }).lean();
  const customerTwo = await UserModel.findOne({ email: 'customer2@tikurabay.com' }).lean();
  const driverUser = await UserModel.findOne({ email: 'driver.demo@tikurabay.com' }).lean();

  assert.ok(customerOne?._id, 'customer1@tikurabay.com is required');
  assert.ok(customerTwo?._id, 'customer2@tikurabay.com is required');
  assert.ok(driverUser?._id, 'driver.demo@tikurabay.com is required');

  const scenarios = buildScenarioConfigs({
    driverId: String(driverUser._id),
    customerCodes: {
      customer1: String(customerOne.customerCode || 'CUST-0001'),
      customer2: String(customerTwo.customerCode || 'CUST-0002'),
    },
  });

  if (RESET_ONLY) {
    for (const scenario of scenarios) {
      await resetScenario(scenario);
    }
    console.log('Demo logistics scenarios removed.');
    await disconnectFromDatabase();
    return;
  }

  for (const scenario of scenarios) {
    await prepareScenario(scenario);
  }

  const manifest = buildManualManifest({
    driverId: String(driverUser._id),
    customerCodes: {
      customer1: String(customerOne.customerCode || 'CUST-0001'),
      customer2: String(customerTwo.customerCode || 'CUST-0002'),
    },
    scenarios,
  });

  const prepared = {
    mode: PREPARE_ONLY ? 'prepare-only' : 'prepare',
    preparedAt: new Date().toISOString(),
    apiBase: API_BASE,
    manifest,
  };

  if (WRITE_REPORT) {
    await writeReport('demo-scenario-manifest.json', prepared);
  }

  console.log('\nPrepared Tikur Abay demo scenarios');
  console.log(JSON.stringify(prepared, null, 2));
  await disconnectFromDatabase();
}

async function resetScenario(config) {
  const sharedFilter = {
    $or: [{ shipmentId: config.shipmentId }, { shipmentRef: config.shipmentRef }, { bookingNumber: config.bookingNumber }],
  };

  await Promise.all([
    CorridorCargoItemModel.deleteMany({ shipmentId: config.shipmentId }),
    CorridorDocumentModel.deleteMany({ shipmentId: config.shipmentId }),
    CorridorContainerModel.deleteMany({ shipmentId: config.shipmentId }),
    CorridorMilestoneModel.deleteMany({ shipmentId: config.shipmentId }),
    CorridorExceptionModel.deleteMany({ shipmentId: config.shipmentId }),
    CorridorTripAssignmentModel.deleteMany({ shipmentId: config.shipmentId }),
    CorridorCheckpointEventModel.deleteMany({ shipmentId: config.shipmentId }),
    CorridorEmptyReturnModel.deleteMany({ shipmentId: config.shipmentId }),
    CorridorPartyAccessModel.deleteMany({ shipmentId: config.shipmentId }),
    CorridorShipmentModel.deleteMany(sharedFilter),
  ]);
}

async function prepareScenario(config) {
  await resetScenario(config);

  await CorridorShipmentModel.create(createBaseShipment(config));

  await CorridorContainerModel.create({
    containerId: config.containerId,
    shipmentId: config.shipmentId,
    shipmentRef: config.shipmentRef,
    containerNumber: config.containerNumber,
    containerType: '40HC',
    sealNumber: config.sealNumber,
    status: config.containerStatus,
    stuffingStatus: 'confirmed',
    dischargeStatus: ['transitor_clearance', 'empty_return', 'closed'].includes(config.currentStage) ? 'confirmed' : 'pending',
    releaseStatus: config.currentStage === 'transitor_clearance' ? 'pending_clearance' : 'released',
    inlandTripStatus: config.tripStatus || 'awaiting_assignment',
    unloadStatus: ['empty_return', 'closed'].includes(config.currentStage) ? 'completed' : 'pending',
    emptyReturnStatus: config.emptyReturnStatus,
    freeTimeStart: new Date(config.freeTimeStart),
    freeTimeEnd: new Date(config.freeTimeEnd),
    storageRiskLevel: config.storageRiskLevel,
    fullOutDjiboutiAt: config.lifecycle.fullOutDjiboutiAt ? new Date(config.lifecycle.fullOutDjiboutiAt) : undefined,
    fullInDryPortAt: config.lifecycle.fullInDryPortAt ? new Date(config.lifecycle.fullInDryPortAt) : undefined,
    fullOutCustomerAt: config.lifecycle.fullOutCustomerAt ? new Date(config.lifecycle.fullOutCustomerAt) : undefined,
    emptyInDryPortAt: config.lifecycle.emptyInDryPortAt ? new Date(config.lifecycle.emptyInDryPortAt) : undefined,
    emptyOutDryPortAt: config.lifecycle.emptyOutDryPortAt ? new Date(config.lifecycle.emptyOutDryPortAt) : undefined,
    emptyInDjiboutiAt: config.lifecycle.emptyInDjiboutiAt ? new Date(config.lifecycle.emptyInDjiboutiAt) : undefined,
    emptyReturnDeadline: config.emptyReturnDeadline ? new Date(config.emptyReturnDeadline) : undefined,
    demurrageRiskLevel: config.demurrageRiskLevel,
  });

  await CorridorCargoItemModel.insertMany(buildCargoLines(config));

  await CorridorPartyAccessModel.insertMany(buildAccessRows(config));
  await CorridorDocumentModel.insertMany(buildDocuments(config));
  await CorridorMilestoneModel.insertMany(buildMilestones(config));

  if (config.exceptions.length) {
    await CorridorExceptionModel.insertMany(
      config.exceptions.map((item, index) => ({
        exceptionId: `${config.shipmentId}-EX-${String(index + 1).padStart(2, '0')}`,
        shipmentId: config.shipmentId,
        shipmentRef: config.shipmentRef,
        containerNumber: config.containerNumber,
        tripId: config.tripId || undefined,
        category: item.category,
        type: item.type,
        severity: item.severity,
        title: item.title,
        status: item.status,
        detectedAt: new Date(item.detectedAt),
        summary: item.summary,
        details: item.details,
        ownerRole: item.ownerRole,
        visibilityScope: item.visibilityScope,
        reportedBy: item.reportedBy,
      })),
    );
  }

  if (config.tripStatus) {
    await CorridorTripAssignmentModel.create({
      tripId: config.tripId,
      shipmentId: config.shipmentId,
      shipmentRef: config.shipmentRef,
      containerId: config.containerId,
      containerNumber: config.containerNumber,
      driverId: config.driverId,
      vehicleId: config.vehicleId,
      driverType: 'internal_driver',
      driverName: 'Biniyam Haile',
      driverPhone: '+251900000015',
      truckPlate: config.truckPlate,
      trailerPlate: config.trailerPlate,
      route: config.dispatchRoute,
      routeName: config.dispatchRoute,
      originPoint: config.tripOrigin,
      destinationPoint: config.tripDestination,
      dispatchStatus: config.dispatchStatus,
      eta: new Date(config.tripEta),
      actualDeparture: config.actualDeparture ? new Date(config.actualDeparture) : undefined,
      actualArrival: config.actualArrival ? new Date(config.actualArrival) : undefined,
      currentCheckpoint: config.currentCheckpoint,
      gpsStatus: 'synced',
      issueStatus: config.tripIssueStatus,
      dispatchAt: config.dispatchAt ? new Date(config.dispatchAt) : undefined,
      gateOutAt: config.gateOutAt ? new Date(config.gateOutAt) : undefined,
      arrivalAt: config.arrivalAt ? new Date(config.arrivalAt) : undefined,
      tripStatus: config.tripStatus,
      podStatus: config.podStatus,
    });

    if (config.checkpoints.length) {
      await CorridorCheckpointEventModel.insertMany(
        config.checkpoints.map((item) => ({
          tripId: config.tripId,
          shipmentId: config.shipmentId,
          shipmentRef: config.shipmentRef,
          containerNumber: config.containerNumber,
          checkpointName: item.location,
          eventType: item.status,
          sealVerified: item.sealVerified,
          officerName: item.officerName,
          note: item.note,
          eventAt: new Date(item.at),
          latitude: item.latitude,
          longitude: item.longitude,
        })),
      );
    }
  }

  if (config.emptyReturnStatus !== 'not_released') {
    await CorridorEmptyReturnModel.create({
      shipmentId: config.shipmentId,
      containerId: config.containerId,
      shipmentRef: config.shipmentRef,
      containerNumber: config.containerNumber,
      returnDepot: 'Djibouti Empty Depot',
      emptyReleaseAt: config.emptyReleaseAt ? new Date(config.emptyReleaseAt) : undefined,
      returnedAt: config.lifecycle.emptyInDjiboutiAt ? new Date(config.lifecycle.emptyInDjiboutiAt) : undefined,
      receiptNumber: config.returnReceiptRef,
      detentionClosed: config.emptyReturnClosed,
      status: config.emptyReturnStatus,
    });
  }
}

function buildAccessRows(config) {
  const base = [
    {
      shipmentId: config.shipmentId,
      shipmentRef: config.shipmentRef,
      role: 'supplier_agent',
      actorCode: 'supplier.agent@tikurabay.com',
      actorName: 'China Port Agent',
      stageAccess: ['booking', 'origin_preparation', 'ocean_in_transit'],
      visibilityScopes: ['supplier_visible', 'customer_visible'],
    },
    {
      shipmentId: config.shipmentId,
      shipmentRef: config.shipmentRef,
      role: 'djibouti_release_agent',
      actorCode: 'djibouti.release@tikurabay.com',
      actorName: 'Djibouti Release Team',
      stageAccess: ['djibouti_release'],
      visibilityScopes: ['djibouti_visible'],
    },
    {
      shipmentId: config.shipmentId,
      shipmentRef: config.shipmentRef,
      role: 'djibouti_clearing_agent',
      actorCode: 'clearance.agent@tikurabay.com',
      actorName: 'Transitor / Clearance Desk',
      stageAccess: ['transitor_clearance'],
      visibilityScopes: ['internal_only', 'djibouti_visible'],
    },
    {
      shipmentId: config.shipmentId,
      shipmentRef: config.shipmentRef,
      role: 'corridor_dispatch_agent',
      actorCode: 'dispatch.agent@tikurabay.com',
      actorName: 'Dispatch Desk',
      stageAccess: ['inland_dispatch', 'inland_arrival'],
      visibilityScopes: ['internal_only', 'driver_visible', 'customer_visible'],
    },
    {
      shipmentId: config.shipmentId,
      shipmentRef: config.shipmentRef,
      role: 'dry_port_yard_agent',
      actorCode: 'yard.agent@tikurabay.com',
      actorName: 'Dry Port / Yard Desk',
      stageAccess: ['yard_processing', 'delivery_pod', 'empty_return', 'closed'],
      visibilityScopes: ['yard_visible', 'customer_visible'],
    },
    {
      shipmentId: config.shipmentId,
      shipmentRef: config.shipmentRef,
      role: 'customer_user',
      actorCode: config.customerCode,
      actorName: config.customerName,
      stageAccess: ['booking', 'origin_preparation', 'ocean_in_transit', 'djibouti_release', 'transitor_clearance', 'inland_dispatch', 'inland_arrival', 'yard_processing', 'delivery_pod', 'empty_return', 'closed'],
      visibilityScopes: ['customer_visible'],
    },
  ];

  if (config.tripStatus) {
    base.push({
      shipmentId: config.shipmentId,
      shipmentRef: config.shipmentRef,
      role: 'internal_driver',
      actorUserId: config.driverId,
      actorCode: config.driverId,
      actorName: 'Biniyam Haile',
      stageAccess: ['inland_dispatch', 'inland_arrival', 'empty_return'],
      visibilityScopes: ['driver_visible'],
    });
  }

  return base;
}

function buildDocuments(config) {
  const docs = [
    ['commercial_invoice', config.invoiceRef, 'approved', 'customer_visible', 'Commercial invoice'],
    ['packing_list', config.packingListRef, 'approved', 'customer_visible', 'Packing list'],
    ['bl_draft', config.blDraftRef, 'approved', 'supplier_visible', 'BL draft'],
    ['final_bl', config.blNumber, 'approved', 'customer_visible', 'Final BL'],
    ['transit_document', config.transitRef, config.currentStage === 'transitor_clearance' ? 'under_review' : 'approved', 'customer_visible', 'T1 transit document'],
    ['release_note', config.releaseNoteRef, ['transitor_clearance', 'empty_return', 'closed'].includes(config.currentStage) ? 'approved' : 'uploaded', 'customer_visible', 'Release note'],
    ['pod', config.podRef, config.podStatus === 'missing' ? 'missing' : 'approved', 'customer_visible', 'Proof of delivery'],
    ['return_receipt', config.returnReceiptRef, config.returnReceiptStatus === 'approved' ? 'approved' : 'missing', 'yard_visible', 'Return receipt'],
  ];

  return docs.map(([documentType, referenceNo, status, visibilityScope, label], index) => ({
    shipmentDocumentId: `${config.shipmentId}-DOC-${String(index + 1).padStart(2, '0')}`,
    shipmentId: config.shipmentId,
    shipmentRef: config.shipmentRef,
    containerId: config.containerId,
    containerNumber: config.containerNumber,
    documentType,
    referenceNo,
    issueDate: new Date(`2026-03-${String(18 + index).padStart(2, '0')}T08:00:00Z`),
    uploadedDate: status === 'missing' ? undefined : new Date(`2026-03-${String(18 + index).padStart(2, '0')}T10:00:00Z`),
    status,
    sourceRole: index < 4 ? 'supplier_agent' : index < 6 ? 'djibouti_release_agent' : 'dry_port_yard_agent',
    visibilityScope,
    uploadedByUserId: index < 4 ? 'supplier.agent@tikurabay.com' : index < 6 ? 'djibouti.release@tikurabay.com' : 'yard.agent@tikurabay.com',
    fileName: `${documentType}-${config.bookingNumber}.pdf`,
    fileUrl: `/demo/${config.shipmentId}/${documentType}.pdf`,
    fileKey: `${config.shipmentId}/${documentType}.pdf`,
    metadata: { demo: true, label },
  }));
}

function buildMilestones(config) {
  return config.milestones.map((item, index) => ({
    milestoneId: `${config.shipmentId}-MS-${String(index + 1).padStart(2, '0')}`,
    shipmentId: config.shipmentId,
    shipmentRef: config.shipmentRef,
    tripId: item.tripLinked ? config.tripId : undefined,
    stage: item.stage,
    containerNumber: config.containerNumber,
    code: item.code,
    label: item.label,
    status: 'done',
    occurredAt: new Date(item.at),
    location: item.location,
    sourceRole: item.sourceRole,
    sourceUserId: item.sourceUserId,
    note: item.note,
    visibilityScope: item.visibilityScope,
  }));
}

function buildScenarioConfigs({ driverId, customerCodes }) {
  return [
    {
      scenario: 'happy_path',
      scenarioLabel: 'Scenario A - Happy Path',
      bookingNumber: 'TB-DEMO-0001',
      quoteId: 'QTE-DEMO-0001',
      bookingId: 'BKG-DEMO-0001',
      shipmentId: 'SHP-DEMO-0001',
      shipmentRef: 'SHP-DEMO-0001',
      tripId: 'TRP-DEMO-0001',
      containerId: 'CTR-DEMO-0001',
      containerNumber: 'MSCU1111111',
      sealNumber: 'SL-111111',
      blNumber: 'BL-DJI-DEMO-0001',
      mblNumber: 'MBL-DJI-DEMO-0001',
      hblNumber: 'HBL-DJI-DEMO-0001',
      invoiceRef: 'INV-DEMO-0001',
      packingListRef: 'PL-DEMO-0001',
      blDraftRef: 'BLD-DEMO-0001',
      transitRef: 'T1-DEMO-0001',
      releaseNoteRef: 'REL-DEMO-0001',
      podRef: 'POD-DEMO-0001',
      returnReceiptRef: 'RET-DEMO-0001',
      requestSource: 'customer',
      quoteStatus: 'quote_accepted',
      bookingStatus: 'assigned_to_origin',
      quoteAmount: 1825000,
      acceptedAt: '2026-03-18T09:20:00Z',
      customerCode: customerCodes.customer1,
      customerName: 'Alem Logistics PLC',
      consigneeName: 'Alem Logistics PLC',
      currentStage: 'closed',
      currentOwnerRole: 'dry_port_yard_agent',
      status: 'closed',
      exceptionStatus: 'clear',
      priority: 'medium',
      inlandDestination: 'Adama Dry Port',
      finalDeliveryLocation: 'Alem Logistics PLC, Adama',
      corridorRoute: 'Shanghai -> Djibouti -> Adama Dry Port -> Alem Logistics PLC',
      releaseReadiness: 'Closed after clean receipt and empty return.',
      emptyReturnSummary: 'Empty returned to Djibouti and detention closed.',
      podStatus: 'approved',
      customerConfirmationStatus: 'received_clean',
      customerConfirmedAt: '2026-03-31T12:45:00Z',
      customerConfirmedBy: 'Lidya Getachew',
      customerConfirmationNote: 'Goods received cleanly and accepted in full.',
      shortageStatus: 'clear',
      damageStatus: 'clear',
      closureBlockedReason: '',
      returnReceiptStatus: 'approved',
      dispatchReady: true,
      inlandArrivalReady: true,
      yardClosureReady: true,
      emptyReturnClosed: true,
      paymentStatus: 'paid',
      taxDutyStatus: 'cleared',
      financeBlockReason: '',
      hasExceptions: false,
      activeExceptionCount: 0,
      latestExceptionSummary: 'Happy-path demo shipment closed cleanly.',
      riskLevel: 'normal',
      originFileSentAt: '2026-03-20T05:00:00Z',
      multimodalReceivedAt: '2026-03-27T06:30:00Z',
      transitorAssignedTo: 'clearance.agent@tikurabay.com',
      transitorAssignedAt: '2026-03-27T09:00:00Z',
      transitDocumentStatus: 'approved',
      chargesPaymentStatus: 'paid',
      clearancePacketStatus: 'complete',
      transportClearanceReady: true,
      clearanceReadyAt: '2026-03-27T11:15:00Z',
      clearanceCompletedAt: '2026-03-27T11:15:00Z',
      taxDutySummary: 'All line charges, T1 fees, and release costs cleared.',
      freeTimeStart: '2026-03-27T06:00:00Z',
      freeTimeEnd: '2026-04-06T06:00:00Z',
      storageRiskLevel: 'normal',
      demurrageRiskLevel: 'normal',
      emptyReturnDeadline: '2026-04-03T18:00:00Z',
      containerStatus: 'closed',
      emptyReturnStatus: 'empty_returned',
      driverId,
      vehicleId: 'TRK-DEMO-0001',
      truckPlate: 'ET-3-55678',
      trailerPlate: 'TRL-9001',
      dispatchRoute: 'Djibouti Port -> Adama Dry Port -> Alem Logistics PLC',
      tripOrigin: 'Djibouti Port',
      tripDestination: 'Alem Logistics PLC, Adama',
      tripEta: '2026-03-29T14:00:00Z',
      dispatchStatus: 'closed',
      tripStatus: 'closed',
      tripIssueStatus: 'clear',
      currentCheckpoint: 'Closed',
      dispatchAt: '2026-03-28T04:00:00Z',
      gateOutAt: '2026-03-28T04:15:00Z',
      actualDeparture: '2026-03-28T04:20:00Z',
      actualArrival: '2026-03-29T09:30:00Z',
      arrivalAt: '2026-03-29T09:30:00Z',
      emptyReleaseAt: '2026-03-31T15:10:00Z',
      lifecycle: {
        fullOutDjiboutiAt: '2026-03-28T04:15:00Z',
        fullInDryPortAt: '2026-03-29T09:30:00Z',
        fullOutCustomerAt: '2026-03-30T08:20:00Z',
        emptyInDryPortAt: '2026-03-31T15:10:00Z',
        emptyOutDryPortAt: '2026-04-01T06:40:00Z',
        emptyInDjiboutiAt: '2026-04-02T14:25:00Z',
      },
      checkpoints: [
        { location: 'Galafi checkpoint', status: 'passed', sealVerified: true, officerName: 'Officer Tesfaye', note: 'Transit pack accepted.', at: '2026-03-28T09:20:00Z', latitude: 11.1002, longitude: 42.3411 },
        { location: 'Mille corridor gate', status: 'passed', sealVerified: true, officerName: 'Officer Ruth', note: 'No variance recorded.', at: '2026-03-28T15:55:00Z', latitude: 11.5011, longitude: 40.7551 },
      ],
      milestones: [
        { code: 'booking_created', label: 'Booking created', stage: 'booking', at: '2026-03-18T09:00:00Z', location: 'Customer portal', sourceRole: 'customer_user', sourceUserId: customerCodes.customer1, note: 'Quote accepted and booking converted.', visibilityScope: 'customer_visible' },
        { code: 'quote_accepted', label: 'Quote accepted', stage: 'booking', at: '2026-03-18T09:20:00Z', location: 'Addis Ababa HQ', sourceRole: 'customer_support_agent', sourceUserId: 'support.agent@tikurabay.com', note: 'Accepted quote routed to China Port Agent.', visibilityScope: 'customer_visible' },
        { code: 'origin_completed', label: 'Origin file completed', stage: 'origin_preparation', at: '2026-03-20T04:30:00Z', location: 'Shanghai', sourceRole: 'supplier_agent', sourceUserId: 'supplier.agent@tikurabay.com', note: 'BL, invoice, packing list, container, seal, stuffing, and gate-in completed.', visibilityScope: 'customer_visible' },
        { code: 'origin_file_sent_to_multimodal', label: 'Origin file sent to multimodal', stage: 'origin_preparation', at: '2026-03-20T05:00:00Z', location: 'Shanghai', sourceRole: 'supplier_agent', sourceUserId: 'supplier.agent@tikurabay.com', note: 'Handoff notification issued to djibouti.release@tikurabay.com.', visibilityScope: 'internal_only' },
        { code: 'vessel_departed', label: 'Vessel departed', stage: 'ocean_in_transit', at: '2026-03-20T08:00:00Z', location: 'Shanghai', sourceRole: 'supplier_agent', sourceUserId: 'supplier.agent@tikurabay.com', note: 'Ocean leg started.', visibilityScope: 'customer_visible' },
        { code: 'multimodal_received', label: 'Multimodal received', stage: 'djibouti_release', at: '2026-03-27T06:30:00Z', location: 'Djibouti Port', sourceRole: 'djibouti_release_agent', sourceUserId: 'djibouti.release@tikurabay.com', note: 'Full origin file received.', visibilityScope: 'internal_only' },
        { code: 'discharge_confirmed', label: 'Discharge confirmed', stage: 'djibouti_release', at: '2026-03-27T07:10:00Z', location: 'Djibouti Port', sourceRole: 'djibouti_release_agent', sourceUserId: 'djibouti.release@tikurabay.com', note: 'Container discharged.', visibilityScope: 'customer_visible' },
        { code: 'line_release_received', label: 'Line release received', stage: 'djibouti_release', at: '2026-03-27T08:20:00Z', location: 'Djibouti Port', sourceRole: 'djibouti_release_agent', sourceUserId: 'djibouti.release@tikurabay.com', note: 'Line release posted.', visibilityScope: 'customer_visible' },
        { code: 'clearance_ready', label: 'Clearance ready', stage: 'transitor_clearance', at: '2026-03-27T11:15:00Z', location: 'Djibouti', sourceRole: 'djibouti_clearing_agent', sourceUserId: 'clearance.agent@tikurabay.com', note: 'T1 and charges completed. Dispatch unblocked.', visibilityScope: 'customer_visible' },
        { code: 'trip_created', label: 'Trip created', stage: 'inland_dispatch', at: '2026-03-28T03:45:00Z', location: 'Djibouti Port', sourceRole: 'corridor_dispatch_agent', sourceUserId: 'dispatch.agent@tikurabay.com', note: 'Trip TRP-DEMO-0001 created and assigned.', visibilityScope: 'driver_visible', tripLinked: true },
        { code: 'full_out_djibouti', label: 'Full Out - Djibouti', stage: 'inland_dispatch', at: '2026-03-28T04:15:00Z', location: 'Djibouti Port', sourceRole: 'corridor_dispatch_agent', sourceUserId: 'dispatch.agent@tikurabay.com', note: 'Container released from Djibouti.', visibilityScope: 'customer_visible', tripLinked: true },
        { code: 'full_in_dry_port', label: 'Full In - Dry Port', stage: 'inland_arrival', at: '2026-03-29T09:30:00Z', location: 'Adama Dry Port', sourceRole: 'dry_port_yard_agent', sourceUserId: 'yard.agent@tikurabay.com', note: 'Full container arrived at dry port.', visibilityScope: 'customer_visible' },
        { code: 'full_out_customer', label: 'Full Out - Customer', stage: 'delivery_pod', at: '2026-03-30T08:20:00Z', location: 'Alem Logistics PLC, Adama', sourceRole: 'dry_port_yard_agent', sourceUserId: 'yard.agent@tikurabay.com', note: 'Delivered to customer.', visibilityScope: 'customer_visible' },
        { code: 'customer_confirmed', label: 'Customer confirmed clean receipt', stage: 'delivery_pod', at: '2026-03-31T12:45:00Z', location: 'Alem Logistics PLC, Adama', sourceRole: 'customer_user', sourceUserId: customerCodes.customer1, note: 'Customer confirmed goods received cleanly.', visibilityScope: 'customer_visible' },
        { code: 'empty_in_dry_port', label: 'Empty In - Dry Port', stage: 'empty_return', at: '2026-03-31T15:10:00Z', location: 'Adama Dry Port', sourceRole: 'dry_port_yard_agent', sourceUserId: 'yard.agent@tikurabay.com', note: 'Empty container returned to dry port.', visibilityScope: 'customer_visible' },
        { code: 'empty_out_dry_port', label: 'Empty Out - Dry Port', stage: 'empty_return', at: '2026-04-01T06:40:00Z', location: 'Adama Dry Port', sourceRole: 'dry_port_yard_agent', sourceUserId: 'yard.agent@tikurabay.com', note: 'Empty container departed for Djibouti.', visibilityScope: 'internal_only' },
        { code: 'empty_in_djibouti', label: 'Empty In - Djibouti', stage: 'empty_return', at: '2026-04-02T14:25:00Z', location: 'Djibouti Empty Depot', sourceRole: 'dry_port_yard_agent', sourceUserId: 'yard.agent@tikurabay.com', note: 'Empty return closed at Djibouti.', visibilityScope: 'customer_visible' },
        { code: 'shipment_cycle_closed', label: 'Shipment cycle closed', stage: 'closed', at: '2026-04-02T15:00:00Z', location: 'Addis Ababa HQ', sourceRole: 'dry_port_yard_agent', sourceUserId: 'yard.agent@tikurabay.com', note: 'Happy-path shipment fully closed.', visibilityScope: 'customer_visible' },
      ],
      exceptions: [],
    },
    {
      scenario: 'customer_issue',
      scenarioLabel: 'Scenario B - Customer Issue',
      bookingNumber: 'TB-DEMO-0002',
      quoteId: 'QTE-DEMO-0002',
      bookingId: 'BKG-DEMO-0002',
      shipmentId: 'SHP-DEMO-0002',
      shipmentRef: 'SHP-DEMO-0002',
      tripId: 'TRP-DEMO-0002',
      containerId: 'CTR-DEMO-0002',
      containerNumber: 'MSCU2222222',
      sealNumber: 'SL-222222',
      blNumber: 'BL-DJI-DEMO-0002',
      mblNumber: 'MBL-DJI-DEMO-0002',
      hblNumber: 'HBL-DJI-DEMO-0002',
      invoiceRef: 'INV-DEMO-0002',
      packingListRef: 'PL-DEMO-0002',
      blDraftRef: 'BLD-DEMO-0002',
      transitRef: 'T1-DEMO-0002',
      releaseNoteRef: 'REL-DEMO-0002',
      podRef: 'POD-DEMO-0002',
      returnReceiptRef: 'RET-DEMO-0002',
      requestSource: 'head_office',
      quoteStatus: 'quote_accepted',
      bookingStatus: 'assigned_to_origin',
      quoteAmount: 1942000,
      acceptedAt: '2026-03-18T10:00:00Z',
      customerCode: customerCodes.customer2,
      customerName: 'Selam Freight Trading',
      consigneeName: 'Selam Freight Trading',
      currentStage: 'empty_return',
      currentOwnerRole: 'dry_port_yard_agent',
      status: 'active',
      exceptionStatus: 'open',
      priority: 'high',
      inlandDestination: 'Modjo Dry Port',
      finalDeliveryLocation: 'Selam Freight Trading, Addis Ababa',
      corridorRoute: 'Shanghai -> Djibouti -> Modjo Dry Port -> Selam Freight Trading',
      releaseReadiness: 'Release and clearance completed. Final issue remains open.',
      emptyReturnSummary: 'Empty return is moving while customer issue remains unresolved.',
      podStatus: 'approved',
      customerConfirmationStatus: 'received_with_damage',
      customerConfirmedAt: '2026-03-31T16:20:00Z',
      customerConfirmedBy: 'Mahi Deressa',
      customerConfirmationNote: 'Customer reported carton shortage and visible damage on one crate.',
      shortageStatus: 'reported',
      damageStatus: 'reported',
      closureBlockedReason: 'Customer issue remains open after POD. Closure blocked until shortage/damage review is resolved.',
      returnReceiptStatus: 'missing',
      dispatchReady: true,
      inlandArrivalReady: true,
      yardClosureReady: false,
      emptyReturnClosed: false,
      paymentStatus: 'paid',
      taxDutyStatus: 'cleared',
      financeBlockReason: '',
      hasExceptions: true,
      activeExceptionCount: 1,
      latestExceptionSummary: 'Customer shortage/damage issue is open and blocking closure.',
      riskLevel: 'high',
      originFileSentAt: '2026-03-20T06:15:00Z',
      multimodalReceivedAt: '2026-03-27T06:45:00Z',
      transitorAssignedTo: 'clearance.agent@tikurabay.com',
      transitorAssignedAt: '2026-03-27T09:20:00Z',
      transitDocumentStatus: 'approved',
      chargesPaymentStatus: 'paid',
      clearancePacketStatus: 'complete',
      transportClearanceReady: true,
      clearanceReadyAt: '2026-03-27T12:05:00Z',
      clearanceCompletedAt: '2026-03-27T12:05:00Z',
      taxDutySummary: 'All corridor and customs charges settled.',
      freeTimeStart: '2026-03-27T06:00:00Z',
      freeTimeEnd: '2026-04-04T18:00:00Z',
      storageRiskLevel: 'watch',
      demurrageRiskLevel: 'watch',
      emptyReturnDeadline: '2026-04-03T18:00:00Z',
      containerStatus: 'empty_return_in_progress',
      emptyReturnStatus: 'empty_return_in_progress',
      driverId,
      vehicleId: 'TRK-DEMO-0002',
      truckPlate: 'ET-3-66789',
      trailerPlate: 'TRL-9002',
      dispatchRoute: 'Modjo Dry Port -> Addis Ababa -> Djibouti Empty Depot',
      tripOrigin: 'Modjo Dry Port',
      tripDestination: 'Djibouti Empty Depot',
      tripEta: '2026-04-02T19:00:00Z',
      dispatchStatus: 'departed',
      tripStatus: 'in_transit',
      tripIssueStatus: 'active',
      currentCheckpoint: 'Awash checkpoint',
      dispatchAt: '2026-04-01T07:30:00Z',
      gateOutAt: '2026-04-01T07:35:00Z',
      actualDeparture: '2026-04-01T07:40:00Z',
      actualArrival: undefined,
      arrivalAt: undefined,
      emptyReleaseAt: '2026-04-01T07:20:00Z',
      lifecycle: {
        fullOutDjiboutiAt: '2026-03-28T05:10:00Z',
        fullInDryPortAt: '2026-03-29T13:00:00Z',
        fullOutCustomerAt: '2026-03-31T10:45:00Z',
        emptyInDryPortAt: '2026-04-01T06:50:00Z',
        emptyOutDryPortAt: '2026-04-01T07:35:00Z',
        emptyInDjiboutiAt: undefined,
      },
      checkpoints: [
        { location: 'Galafi checkpoint', status: 'passed', sealVerified: true, officerName: 'Officer Tsegaye', note: 'Loaded movement completed.', at: '2026-03-28T11:05:00Z', latitude: 11.1002, longitude: 42.3411 },
        { location: 'Modjo Dry Port', status: 'arrived', sealVerified: true, officerName: 'Officer Yonas', note: 'POD captured before issue notice.', at: '2026-03-29T13:00:00Z', latitude: 8.604, longitude: 39.12 },
        { location: 'Awash checkpoint', status: 'inspection', sealVerified: true, officerName: 'Officer Sara', note: 'Empty return moving while customer issue review remains open.', at: '2026-04-01T15:40:00Z', latitude: 8.983, longitude: 40.166 },
      ],
      milestones: [
        { code: 'booking_created', label: 'Booking created', stage: 'booking', at: '2026-03-18T09:35:00Z', location: 'Head office', sourceRole: 'customer_support_agent', sourceUserId: 'support.agent@tikurabay.com', note: 'Head office created quote and booking for customer.', visibilityScope: 'customer_visible' },
        { code: 'quote_accepted', label: 'Quote accepted', stage: 'booking', at: '2026-03-18T10:00:00Z', location: 'Head office', sourceRole: 'customer_support_agent', sourceUserId: 'support.agent@tikurabay.com', note: 'Quote accepted and routed to China Port Agent.', visibilityScope: 'customer_visible' },
        { code: 'origin_completed', label: 'Origin file completed', stage: 'origin_preparation', at: '2026-03-20T05:40:00Z', location: 'Shanghai', sourceRole: 'supplier_agent', sourceUserId: 'supplier.agent@tikurabay.com', note: 'Origin-side documentation completed.', visibilityScope: 'customer_visible' },
        { code: 'origin_file_sent_to_multimodal', label: 'Origin file sent to multimodal', stage: 'origin_preparation', at: '2026-03-20T06:15:00Z', location: 'Shanghai', sourceRole: 'supplier_agent', sourceUserId: 'supplier.agent@tikurabay.com', note: 'Origin file pushed to Djibouti release team.', visibilityScope: 'internal_only' },
        { code: 'vessel_departed', label: 'Vessel departed', stage: 'ocean_in_transit', at: '2026-03-20T08:15:00Z', location: 'Shanghai', sourceRole: 'supplier_agent', sourceUserId: 'supplier.agent@tikurabay.com', note: 'Ocean leg started.', visibilityScope: 'customer_visible' },
        { code: 'multimodal_received', label: 'Multimodal received', stage: 'djibouti_release', at: '2026-03-27T06:45:00Z', location: 'Djibouti Port', sourceRole: 'djibouti_release_agent', sourceUserId: 'djibouti.release@tikurabay.com', note: 'Full file received.', visibilityScope: 'internal_only' },
        { code: 'clearance_ready', label: 'Clearance ready', stage: 'transitor_clearance', at: '2026-03-27T12:05:00Z', location: 'Djibouti', sourceRole: 'djibouti_clearing_agent', sourceUserId: 'clearance.agent@tikurabay.com', note: 'Dispatch released after clearance.', visibilityScope: 'customer_visible' },
        { code: 'trip_created', label: 'Trip created', stage: 'inland_dispatch', at: '2026-03-28T04:50:00Z', location: 'Djibouti Port', sourceRole: 'corridor_dispatch_agent', sourceUserId: 'dispatch.agent@tikurabay.com', note: 'Trip TRP-DEMO-0002 created.', visibilityScope: 'driver_visible', tripLinked: true },
        { code: 'full_out_djibouti', label: 'Full Out - Djibouti', stage: 'inland_dispatch', at: '2026-03-28T05:10:00Z', location: 'Djibouti Port', sourceRole: 'corridor_dispatch_agent', sourceUserId: 'dispatch.agent@tikurabay.com', note: 'Container departed Djibouti.', visibilityScope: 'customer_visible', tripLinked: true },
        { code: 'full_in_dry_port', label: 'Full In - Dry Port', stage: 'inland_arrival', at: '2026-03-29T13:00:00Z', location: 'Modjo Dry Port', sourceRole: 'dry_port_yard_agent', sourceUserId: 'yard.agent@tikurabay.com', note: 'Full container arrived inland.', visibilityScope: 'customer_visible' },
        { code: 'full_out_customer', label: 'Full Out - Customer', stage: 'delivery_pod', at: '2026-03-31T10:45:00Z', location: 'Selam Freight Trading, Addis Ababa', sourceRole: 'dry_port_yard_agent', sourceUserId: 'yard.agent@tikurabay.com', note: 'Delivery completed and POD captured.', visibilityScope: 'customer_visible' },
        { code: 'customer_issue_recorded', label: 'Customer confirmed shortage / damage', stage: 'delivery_pod', at: '2026-03-31T16:20:00Z', location: 'Selam Freight Trading, Addis Ababa', sourceRole: 'customer_user', sourceUserId: customerCodes.customer2, note: 'Customer confirmed damage and shortage. Issue remains open.', visibilityScope: 'customer_visible' },
        { code: 'empty_in_dry_port', label: 'Empty In - Dry Port', stage: 'empty_return', at: '2026-04-01T06:50:00Z', location: 'Modjo Dry Port', sourceRole: 'dry_port_yard_agent', sourceUserId: 'yard.agent@tikurabay.com', note: 'Empty returned to dry port.', visibilityScope: 'customer_visible' },
        { code: 'empty_out_dry_port', label: 'Empty Out - Dry Port', stage: 'empty_return', at: '2026-04-01T07:35:00Z', location: 'Modjo Dry Port', sourceRole: 'dry_port_yard_agent', sourceUserId: 'yard.agent@tikurabay.com', note: 'Empty container left dry port for Djibouti.', visibilityScope: 'internal_only' },
      ],
      exceptions: [
        {
          category: 'delivery_issue',
          type: 'shortage_damage',
          severity: 'high',
          title: 'Customer shortage / damage confirmation',
          status: 'open',
          detectedAt: '2026-03-31T16:20:00Z',
          summary: 'Issue remains open after customer confirmation.',
          details: 'POD exists but the consignee reported shortage and damage. Closure must remain blocked while empty return may continue.',
          ownerRole: 'dry_port_yard_agent',
          visibilityScope: 'customer_visible',
          reportedBy: 'customer2@tikurabay.com',
        },
      ],
    },
    {
      scenario: 'clearance_risk',
      scenarioLabel: 'Scenario C - Clearance Risk',
      bookingNumber: 'TB-DEMO-0003',
      quoteId: 'QTE-DEMO-0003',
      bookingId: 'BKG-DEMO-0003',
      shipmentId: 'SHP-DEMO-0003',
      shipmentRef: 'SHP-DEMO-0003',
      tripId: null,
      containerId: 'CTR-DEMO-0003',
      containerNumber: 'MSCU3333333',
      sealNumber: 'SL-333333',
      blNumber: 'BL-DJI-DEMO-0003',
      mblNumber: 'MBL-DJI-DEMO-0003',
      hblNumber: 'HBL-DJI-DEMO-0003',
      invoiceRef: 'INV-DEMO-0003',
      packingListRef: 'PL-DEMO-0003',
      blDraftRef: 'BLD-DEMO-0003',
      transitRef: 'T1-DEMO-0003',
      releaseNoteRef: 'REL-DEMO-0003',
      podRef: 'POD-DEMO-0003',
      returnReceiptRef: 'RET-DEMO-0003',
      requestSource: 'port_agent',
      quoteStatus: 'quote_accepted',
      bookingStatus: 'assigned_to_origin',
      quoteAmount: 2018000,
      acceptedAt: '2026-03-18T11:10:00Z',
      customerCode: customerCodes.customer1,
      customerName: 'Alem Logistics PLC',
      consigneeName: 'Alem Logistics PLC',
      currentStage: 'transitor_clearance',
      currentOwnerRole: 'djibouti_clearing_agent',
      status: 'active',
      exceptionStatus: 'open',
      priority: 'critical',
      inlandDestination: 'Kombolcha Dry Port',
      finalDeliveryLocation: 'Alem Logistics PLC, Kombolcha',
      corridorRoute: 'Shanghai -> Djibouti -> Kombolcha Dry Port -> Alem Logistics PLC',
      releaseReadiness: 'Release partly ready but dispatch blocked pending T1 and charge clearance.',
      emptyReturnSummary: 'Not started. Shipment is still before dispatch.',
      podStatus: 'missing',
      customerConfirmationStatus: 'pending',
      customerConfirmedAt: undefined,
      customerConfirmedBy: '',
      customerConfirmationNote: '',
      shortageStatus: 'clear',
      damageStatus: 'clear',
      closureBlockedReason: 'Dispatch blocked until transport clearance is ready and T1 is approved.',
      returnReceiptStatus: 'missing',
      dispatchReady: false,
      inlandArrivalReady: false,
      yardClosureReady: false,
      emptyReturnClosed: false,
      paymentStatus: 'pending',
      taxDutyStatus: 'pending',
      financeBlockReason: 'Transit-related charges and guarantees are not yet cleared.',
      hasExceptions: true,
      activeExceptionCount: 1,
      latestExceptionSummary: 'Clearance packet incomplete. Dispatch remains blocked.',
      riskLevel: 'high',
      originFileSentAt: '2026-03-20T06:45:00Z',
      multimodalReceivedAt: '2026-03-27T07:10:00Z',
      transitorAssignedTo: 'clearance.agent@tikurabay.com',
      transitorAssignedAt: '2026-03-27T10:00:00Z',
      transitDocumentStatus: 'draft',
      chargesPaymentStatus: 'pending',
      clearancePacketStatus: 'review_pending',
      transportClearanceReady: false,
      clearanceReadyAt: undefined,
      clearanceCompletedAt: undefined,
      taxDutySummary: 'Transit note and charges still pending approval.',
      freeTimeStart: '2026-03-27T06:00:00Z',
      freeTimeEnd: '2026-03-30T18:00:00Z',
      storageRiskLevel: 'high',
      demurrageRiskLevel: 'high',
      emptyReturnDeadline: undefined,
      containerStatus: 'release_pending',
      emptyReturnStatus: 'not_released',
      driverId,
      vehicleId: '',
      truckPlate: '',
      trailerPlate: '',
      dispatchRoute: '',
      tripOrigin: '',
      tripDestination: '',
      tripEta: '',
      dispatchStatus: '',
      tripStatus: '',
      tripIssueStatus: '',
      currentCheckpoint: '',
      dispatchAt: undefined,
      gateOutAt: undefined,
      actualDeparture: undefined,
      actualArrival: undefined,
      arrivalAt: undefined,
      emptyReleaseAt: undefined,
      lifecycle: {
        fullOutDjiboutiAt: undefined,
        fullInDryPortAt: undefined,
        fullOutCustomerAt: undefined,
        emptyInDryPortAt: undefined,
        emptyOutDryPortAt: undefined,
        emptyInDjiboutiAt: undefined,
      },
      checkpoints: [],
      milestones: [
        { code: 'booking_created', label: 'Booking created', stage: 'booking', at: '2026-03-18T10:50:00Z', location: 'China Port Agent Desk', sourceRole: 'supplier_agent', sourceUserId: 'supplier.agent@tikurabay.com', note: 'Port agent initiated quote and booking intake.', visibilityScope: 'customer_visible' },
        { code: 'quote_accepted', label: 'Quote accepted', stage: 'booking', at: '2026-03-18T11:10:00Z', location: 'China Port Agent Desk', sourceRole: 'supplier_agent', sourceUserId: 'supplier.agent@tikurabay.com', note: 'Quote accepted and routed to origin.', visibilityScope: 'customer_visible' },
        { code: 'origin_completed', label: 'Origin file completed', stage: 'origin_preparation', at: '2026-03-20T06:10:00Z', location: 'Shanghai', sourceRole: 'supplier_agent', sourceUserId: 'supplier.agent@tikurabay.com', note: 'Origin docs complete and cargo file ready.', visibilityScope: 'customer_visible' },
        { code: 'origin_file_sent_to_multimodal', label: 'Origin file sent to multimodal', stage: 'origin_preparation', at: '2026-03-20T06:45:00Z', location: 'Shanghai', sourceRole: 'supplier_agent', sourceUserId: 'supplier.agent@tikurabay.com', note: 'Origin file sent to djibouti.release@tikurabay.com.', visibilityScope: 'internal_only' },
        { code: 'vessel_departed', label: 'Vessel departed', stage: 'ocean_in_transit', at: '2026-03-20T08:40:00Z', location: 'Shanghai', sourceRole: 'supplier_agent', sourceUserId: 'supplier.agent@tikurabay.com', note: 'Ocean movement started.', visibilityScope: 'customer_visible' },
        { code: 'multimodal_received', label: 'Multimodal received', stage: 'djibouti_release', at: '2026-03-27T07:10:00Z', location: 'Djibouti Port', sourceRole: 'djibouti_release_agent', sourceUserId: 'djibouti.release@tikurabay.com', note: 'Djibouti release team received the file.', visibilityScope: 'internal_only' },
        { code: 'discharge_confirmed', label: 'Discharge confirmed', stage: 'djibouti_release', at: '2026-03-27T08:05:00Z', location: 'Djibouti Port', sourceRole: 'djibouti_release_agent', sourceUserId: 'djibouti.release@tikurabay.com', note: 'Container discharge confirmed.', visibilityScope: 'customer_visible' },
        { code: 'line_release_received', label: 'Line release received', stage: 'djibouti_release', at: '2026-03-27T09:00:00Z', location: 'Djibouti Port', sourceRole: 'djibouti_release_agent', sourceUserId: 'djibouti.release@tikurabay.com', note: 'Line release posted but clearance packet still incomplete.', visibilityScope: 'customer_visible' },
        { code: 'customs_review_pending', label: 'Customs review pending', stage: 'transitor_clearance', at: '2026-03-27T11:10:00Z', location: 'Djibouti', sourceRole: 'djibouti_clearing_agent', sourceUserId: 'clearance.agent@tikurabay.com', note: 'T1 is still draft and charges remain pending. Dispatch blocked.', visibilityScope: 'customer_visible' },
      ],
      exceptions: [
        {
          category: 'clearance_hold',
          type: 'customs_hold',
          severity: 'high',
          title: 'T1 and charges still pending',
          status: 'open',
          detectedAt: '2026-03-27T11:15:00Z',
          summary: 'Clearance risk is active and dispatch is blocked.',
          details: 'Release is partially ready, but transport clearance is not ready, required charges are unpaid, and the T1 reference remains draft.',
          ownerRole: 'djibouti_clearing_agent',
          visibilityScope: 'internal_only',
          reportedBy: 'clearance.agent@tikurabay.com',
        },
      ],
    },
  ];
}

function buildManualManifest({ driverId, customerCodes, scenarios }) {
  return {
    purpose: 'One-click demo loader for the Tikur Abay booking-to-closure logistics journey.',
    environment: {
      adminConsole: 'http://127.0.0.1:6010',
      customerPortal: 'http://127.0.0.1:6011',
      backendApi: API_BASE,
      mobileApp: 'apps/driver Flutter app',
    },
    accounts: {
      supplierAgent: { email: 'supplier.agent@tikurabay.com', password: 'ChangeMe123!' },
      djiboutiReleaseAgent: { email: 'djibouti.release@tikurabay.com', password: 'ChangeMe123!' },
      clearanceAgent: { email: 'clearance.agent@tikurabay.com', password: 'ChangeMe123!' },
      dispatchAgent: { email: 'dispatch.agent@tikurabay.com', password: 'ChangeMe123!' },
      yardAgent: { email: 'yard.agent@tikurabay.com', password: 'ChangeMe123!' },
      customer1: { email: 'customer1@tikurabay.com', password: 'ChangeMe123!', customerCode: customerCodes.customer1 },
      customer2: { email: 'customer2@tikurabay.com', password: 'ChangeMe123!', customerCode: customerCodes.customer2 },
      driverUser: { email: 'driver.demo@tikurabay.com', phone: '+251900000015', password: 'ChangeMe123!', debugOtp: '246810', driverUserId: driverId },
    },
    walkthroughOrder: [
      'Executive dashboard',
      'China Port Agent',
      'Djibouti Release / Multimodal',
      'Transitor / Clearance',
      'Dispatch',
      'Driver mobile',
      'Dry Port / Yard',
      'Customer portal',
      'Empty return and closure review',
    ],
    scenarios: scenarios.map((scenario) => ({
      label: scenario.scenarioLabel,
      bookingNumber: scenario.bookingNumber,
      shipmentId: scenario.shipmentId,
      tripId: scenario.tripId,
      customerCode: scenario.customerCode,
      containerNumber: scenario.containerNumber,
      sealNumber: scenario.sealNumber,
      blNumber: scenario.blNumber,
      currentStage: scenario.currentStage,
      requestSource: scenario.requestSource,
      expectedOutcome:
        scenario.scenario === 'happy_path'
          ? 'Shipment is fully closed after clean customer confirmation and empty return.'
          : scenario.scenario === 'customer_issue'
            ? 'Shipment remains open in empty return with closure blocked by shortage/damage.'
            : 'Shipment remains blocked in transitor / clearance until T1 and charges are completed.',
    })),
  };
}

async function writeReport(fileName, payload) {
  await fs.mkdir(REPORTS_DIR, { recursive: true });
  await fs.writeFile(path.join(REPORTS_DIR, fileName), `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

main().catch(async (error) => {
  console.error('\nDemo cargo journey preparation failed.');
  console.error(error.stack || error.message);
  try {
    await disconnectFromDatabase();
  } catch {}
  process.exit(1);
});
