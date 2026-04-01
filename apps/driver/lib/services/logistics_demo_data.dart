class CustomerShipmentItem {
  const CustomerShipmentItem({
    required this.lineNumber,
    required this.description,
    required this.hsCode,
    required this.packageType,
    required this.packageCount,
    required this.grossWeightKg,
    required this.netWeightKg,
    required this.cbm,
    required this.invoiceRef,
    required this.packingListRef,
    required this.customsTransitRef,
    required this.remarks,
  });

  final String lineNumber;
  final String description;
  final String hsCode;
  final String packageType;
  final int packageCount;
  final int grossWeightKg;
  final int netWeightKg;
  final double cbm;
  final String invoiceRef;
  final String packingListRef;
  final String customsTransitRef;
  final String remarks;
}

class MobileDocumentRecord {
  const MobileDocumentRecord({
    required this.type,
    required this.reference,
    required this.date,
    required this.status,
  });

  final String type;
  final String reference;
  final String date;
  final String status;
}

class CustomerSupportThread {
  const CustomerSupportThread({
    required this.shipmentRef,
    required this.channel,
    required this.title,
    required this.preview,
    required this.timestamp,
    required this.status,
    required this.category,
  });

  final String shipmentRef;
  final String channel;
  final String title;
  final String preview;
  final String timestamp;
  final String status;
  final String category;
}

class CustomerPaymentRecord {
  const CustomerPaymentRecord({
    required this.invoiceNumber,
    required this.shipmentRef,
    required this.amount,
    required this.dueDate,
    required this.status,
    required this.receiptStatus,
  });

  final String invoiceNumber;
  final String shipmentRef;
  final String amount;
  final String dueDate;
  final String status;
  final String receiptStatus;
}

class CustomerTimelineEvent {
  const CustomerTimelineEvent({
    required this.label,
    required this.timestamp,
    required this.location,
    required this.note,
    required this.status,
  });

  final String label;
  final String timestamp;
  final String location;
  final String note;
  final String status;
}

class CustomerShipment {
  const CustomerShipment({
    required this.bookingNumber,
    required this.customerRef,
    required this.customer,
    required this.supplier,
    required this.serviceType,
    required this.blNumber,
    required this.containerNumber,
    required this.sealNumber,
    required this.route,
    required this.currentStage,
    required this.eta,
    required this.lastUpdated,
    required this.exceptionChip,
    required this.vesselEtaDjibouti,
    required this.gateOutStatus,
    required this.inlandStatus,
    required this.dryPortStatus,
    required this.podStatus,
    required this.emptyReturnStatus,
    required this.deliveryConfirmationStatus,
    required this.deliveryConfirmationNote,
    required this.shortageStatus,
    required this.damageStatus,
    required this.emptyReturnDeadline,
    required this.dryPortCollectionDeadline,
    required this.freeTimeStatus,
    required this.customsDeclarationRef,
    required this.transitType,
    required this.transitRef,
    required this.customsReleaseStatus,
    required this.inspectionStatus,
    required this.taxDutySummary,
    required this.releaseReadiness,
    required this.customsComment,
    required this.items,
    required this.documents,
    required this.timeline,
    required this.supportThreads,
  });

  final String bookingNumber;
  final String customerRef;
  final String customer;
  final String supplier;
  final String serviceType;
  final String blNumber;
  final String containerNumber;
  final String sealNumber;
  final String route;
  final String currentStage;
  final String eta;
  final String lastUpdated;
  final String exceptionChip;
  final String vesselEtaDjibouti;
  final String gateOutStatus;
  final String inlandStatus;
  final String dryPortStatus;
  final String podStatus;
  final String emptyReturnStatus;
  final String deliveryConfirmationStatus;
  final String deliveryConfirmationNote;
  final String shortageStatus;
  final String damageStatus;
  final String emptyReturnDeadline;
  final String dryPortCollectionDeadline;
  final String freeTimeStatus;
  final String customsDeclarationRef;
  final String transitType;
  final String transitRef;
  final String customsReleaseStatus;
  final String inspectionStatus;
  final String taxDutySummary;
  final String releaseReadiness;
  final String customsComment;
  final List<CustomerShipmentItem> items;
  final List<MobileDocumentRecord> documents;
  final List<CustomerTimelineEvent> timeline;
  final List<CustomerSupportThread> supportThreads;
}

class DriverCheckpointEvent {
  const DriverCheckpointEvent({
    required this.location,
    required this.timestamp,
    required this.status,
    required this.sealIntact,
    required this.driverNote,
    required this.officerNote,
  });

  final String location;
  final String timestamp;
  final String status;
  final bool sealIntact;
  final String driverNote;
  final String officerNote;
}

class DriverIssueRecord {
  const DriverIssueRecord({
    required this.type,
    required this.note,
    required this.timestamp,
    required this.status,
  });

  final String type;
  final String note;
  final String timestamp;
  final String status;
}

class DriverTrip {
  const DriverTrip({
    required this.tripId,
    required this.bookingNumber,
    required this.customer,
    required this.route,
    required this.origin,
    required this.destination,
    required this.containerNumber,
    required this.sealNumber,
    required this.tripStatus,
    required this.etaSummary,
    required this.currentStage,
    required this.dispatchNote,
    required this.truckPlate,
    required this.trailerPlate,
    required this.driverName,
    required this.driverType,
    required this.partnerName,
    required this.blNumber,
    required this.packingListNumber,
    required this.invoiceNumber,
    required this.transitDocumentType,
    required this.transitDocumentNumber,
    required this.customsStatus,
    required this.itemSummary,
    required this.itemCount,
    required this.totalPackages,
    required this.totalWeightKg,
    required this.inlandArrivalConfirmed,
    required this.unloadCompleted,
    required this.emptyReleased,
    required this.emptyReturnStarted,
    required this.emptyReturned,
    required this.items,
    required this.documents,
    required this.checkpoints,
    required this.issues,
  });

  final String tripId;
  final String bookingNumber;
  final String customer;
  final String route;
  final String origin;
  final String destination;
  final String containerNumber;
  final String sealNumber;
  final String tripStatus;
  final String etaSummary;
  final String currentStage;
  final String dispatchNote;
  final String truckPlate;
  final String trailerPlate;
  final String driverName;
  final String driverType;
  final String partnerName;
  final String blNumber;
  final String packingListNumber;
  final String invoiceNumber;
  final String transitDocumentType;
  final String transitDocumentNumber;
  final String customsStatus;
  final String itemSummary;
  final int itemCount;
  final int totalPackages;
  final int totalWeightKg;
  final bool inlandArrivalConfirmed;
  final bool unloadCompleted;
  final bool emptyReleased;
  final bool emptyReturnStarted;
  final bool emptyReturned;
  final List<CustomerShipmentItem> items;
  final List<MobileDocumentRecord> documents;
  final List<DriverCheckpointEvent> checkpoints;
  final List<DriverIssueRecord> issues;
}

class LogisticsDemoData {
  static const customerShipments = [
    CustomerShipment(
      bookingNumber: 'TAB-IM-240319-07',
      customerRef: 'ABI-PO-8841',
      customer: 'Abyssinia Industrial Imports PLC',
      supplier: 'Shenzhen Hanway Machinery Co., Ltd.',
      serviceType: 'Multimodal',
      blNumber: 'MSKU-DJI-784511',
      containerNumber: 'MSCU 458912-7',
      sealNumber: 'SEAL-ET-44821',
      route:
          'Shanghai -> Djibouti -> Adama Dry Port -> Adama customer delivery',
      currentStage: 'Inland Transit',
      eta: 'Mar 21, 2026 09:40',
      lastUpdated: 'Mar 19, 2026 18:12',
      exceptionChip: 'Customs note pending',
      vesselEtaDjibouti: 'MSC Darina / 042W · Mar 18, 2026 05:20',
      gateOutStatus: 'Gate-out confirmed Mar 18, 2026 14:00',
      inlandStatus: 'Moving via Galafi checkpoint',
      dryPortStatus: 'Unload slot reserved at Adama Bay 4',
      podStatus: 'Pending inland arrival',
      emptyReturnStatus: 'Open after unload',
      deliveryConfirmationStatus: 'awaiting_customer_confirmation',
      deliveryConfirmationNote:
          'Customer confirmation opens after unload and POD upload.',
      shortageStatus: 'none',
      damageStatus: 'none',
      emptyReturnDeadline: 'Mar 23, 2026 12:00',
      dryPortCollectionDeadline: 'Mar 21, 2026 14:00',
      freeTimeStatus: 'Djibouti free time watch',
      customsDeclarationRef: 'ECD-260318-99124',
      transitType: 'Transit declaration',
      transitRef: 'TRN-DJI-99281',
      customsReleaseStatus: 'Released',
      inspectionStatus: 'Partial inspection completed',
      taxDutySummary: 'ETB 2.18M settled, ETB 230.2K corridor balance open',
      releaseReadiness: 'Released for inland transport',
      customsComment: 'Final customs note is still pending on line 01.',
      items: [
        CustomerShipmentItem(
          lineNumber: '01',
          description: 'Factory machine spare parts',
          hsCode: '8483.40',
          packageType: 'Crate',
          packageCount: 18,
          grossWeightKg: 12850,
          netWeightKg: 11940,
          cbm: 17.6,
          invoiceRef: 'INV-7845',
          packingListRef: 'PL-7845-A',
          customsTransitRef: 'TRN-DJI-99281',
          remarks: '2 crates selected for customs inspection.',
        ),
        CustomerShipmentItem(
          lineNumber: '02',
          description: 'Industrial cable rolls',
          hsCode: '8544.49',
          packageType: 'Roll',
          packageCount: 22,
          grossWeightKg: 6420,
          netWeightKg: 6035,
          cbm: 8.3,
          invoiceRef: 'INV-7845',
          packingListRef: 'PL-7845-B',
          customsTransitRef: 'TRN-DJI-99281',
          remarks: 'Released with no shortage recorded.',
        ),
      ],
      documents: [
        MobileDocumentRecord(
            type: 'BL',
            reference: 'MSKU-DJI-784511',
            date: 'Mar 14, 2026',
            status: 'Ready'),
        MobileDocumentRecord(
            type: 'Invoice',
            reference: 'INV-7845',
            date: 'Mar 13, 2026',
            status: 'Ready'),
        MobileDocumentRecord(
            type: 'Packing List',
            reference: 'PL-7845-A/B',
            date: 'Mar 13, 2026',
            status: 'Ready'),
        MobileDocumentRecord(
            type: 'Transit / Customs',
            reference: 'TRN-DJI-99281',
            date: 'Mar 18, 2026',
            status: 'Ready'),
        MobileDocumentRecord(
            type: 'Release Note',
            reference: 'REL-DJI-8812',
            date: 'Mar 18, 2026',
            status: 'Ready'),
        MobileDocumentRecord(
            type: 'POD',
            reference: 'POD-MDJ-240321',
            date: 'Pending',
            status: 'Pending'),
        MobileDocumentRecord(
            type: 'Receipt',
            reference: 'RCT-240319-775',
            date: 'Mar 19, 2026',
            status: 'Shared'),
      ],
      timeline: [
        CustomerTimelineEvent(
            label: 'Booking created',
            timestamp: 'Mar 12, 08:00',
            location: 'Addis Ababa',
            note: 'Booking confirmed.',
            status: 'done'),
        CustomerTimelineEvent(
            label: 'Cargo items entered',
            timestamp: 'Mar 13, 10:10',
            location: 'Shanghai',
            note: 'Packing list linked.',
            status: 'done'),
        CustomerTimelineEvent(
            label: 'Docs uploaded',
            timestamp: 'Mar 13, 16:20',
            location: 'Shanghai',
            note: 'Invoice and BL linked.',
            status: 'done'),
        CustomerTimelineEvent(
            label: 'Vessel departed',
            timestamp: 'Mar 14, 17:15',
            location: 'Shanghai',
            note: 'Loaded on MSC Darina.',
            status: 'done'),
        CustomerTimelineEvent(
            label: 'Vessel arrived Djibouti',
            timestamp: 'Mar 17, 05:20',
            location: 'Djibouti',
            note: 'Arrival confirmed.',
            status: 'done'),
        CustomerTimelineEvent(
            label: 'Release cleared',
            timestamp: 'Mar 18, 10:10',
            location: 'Djibouti',
            note: 'Transit packet cleared.',
            status: 'done'),
        CustomerTimelineEvent(
            label: 'Gate-out',
            timestamp: 'Mar 18, 14:00',
            location: 'Djibouti Port Gate 3',
            note: 'Truck handoff confirmed.',
            status: 'done'),
        CustomerTimelineEvent(
            label: 'Inland transit',
            timestamp: 'Mar 19, 17:40',
            location: 'Galafi',
            note: 'Checkpoint note reviewed.',
            status: 'active'),
        CustomerTimelineEvent(
            label: 'Inland arrival',
            timestamp: 'Mar 20, 08:40',
            location: 'Adama',
            note: 'Arrival expected.',
            status: 'next'),
      ],
      supportThreads: [
        CustomerSupportThread(
          shipmentRef: 'TAB-IM-240319-07',
          channel: 'Chat',
          title: 'Dry-port arrival ETA confirmation',
          preview: 'Operations shared the latest Galafi checkpoint update.',
          timestamp: 'Mar 19, 18:04',
          status: 'Open',
          category: 'delay',
        ),
      ],
    ),
    CustomerShipment(
      bookingNumber: 'TAB-IM-240318-02',
      customerRef: 'ABI-PO-8804',
      customer: 'Abyssinia Industrial Imports PLC',
      supplier: 'Ningbo Green Energy Components',
      serviceType: 'Multimodal',
      blNumber: 'OOLU-DJI-663901',
      containerNumber: 'OOLU 114820-3',
      sealNumber: 'SEAL-MDJ-55104',
      route: 'Ningbo -> Djibouti -> Galafi -> Adama',
      currentStage: 'Dry Port',
      eta: 'Mar 20, 2026 14:10',
      lastUpdated: 'Mar 19, 2026 12:18',
      exceptionChip: 'Pickup pending',
      vesselEtaDjibouti: 'OOCL Harmony / 117E · Mar 17, 2026 07:30',
      gateOutStatus: 'Gate-out confirmed Mar 18, 2026 06:20',
      inlandStatus: 'Arrived Adama and unload complete',
      dryPortStatus: 'Stored in Warehouse 2 / Bay 03',
      podStatus: 'Awaiting consignee signature',
      emptyReturnStatus: 'Ready for empty release',
      deliveryConfirmationStatus: 'under_review',
      deliveryConfirmationNote:
          'Unload complete. Customer review and POD signature are still pending.',
      shortageStatus: 'none',
      damageStatus: 'none',
      emptyReturnDeadline: 'Mar 22, 2026 17:00',
      dryPortCollectionDeadline: 'Mar 20, 2026 10:00',
      freeTimeStatus: 'Djibouti free time safe',
      customsDeclarationRef: 'ECD-260317-55110',
      transitType: 'Customs transit permit',
      transitRef: 'CTP-DJI-55110',
      customsReleaseStatus: 'Released',
      inspectionStatus: 'No inspection selected',
      taxDutySummary: 'ETB 1.84M settled, no customs balance open',
      releaseReadiness: 'Clear for delivery handoff',
      customsComment: 'Release note and receipt already linked.',
      items: [
        CustomerShipmentItem(
          lineNumber: '01',
          description: 'Solar inverter units',
          hsCode: '8504.40',
          packageType: 'Carton',
          packageCount: 64,
          grossWeightKg: 4880,
          netWeightKg: 4512,
          cbm: 12.4,
          invoiceRef: 'INV-5510',
          packingListRef: 'PL-5510-A',
          customsTransitRef: 'CTP-DJI-55110',
          remarks: 'All cartons received intact.',
        ),
      ],
      documents: [
        MobileDocumentRecord(
            type: 'BL',
            reference: 'OOLU-DJI-663901',
            date: 'Mar 12, 2026',
            status: 'Ready'),
        MobileDocumentRecord(
            type: 'Invoice',
            reference: 'INV-5510',
            date: 'Mar 12, 2026',
            status: 'Ready'),
        MobileDocumentRecord(
            type: 'Packing List',
            reference: 'PL-5510-A/B',
            date: 'Mar 12, 2026',
            status: 'Ready'),
        MobileDocumentRecord(
            type: 'Transit / Customs',
            reference: 'CTP-DJI-55110',
            date: 'Mar 18, 2026',
            status: 'Ready'),
        MobileDocumentRecord(
            type: 'POD',
            reference: 'POD-ADA-240320',
            date: 'Pending',
            status: 'Pending'),
      ],
      timeline: [
        CustomerTimelineEvent(
            label: 'Booking created',
            timestamp: 'Mar 10, 09:10',
            location: 'Addis Ababa',
            note: 'Customer booking accepted.',
            status: 'done'),
        CustomerTimelineEvent(
            label: 'Vessel departed',
            timestamp: 'Mar 13, 18:10',
            location: 'Ningbo',
            note: 'Loaded on OOCL Harmony.',
            status: 'done'),
        CustomerTimelineEvent(
            label: 'Release cleared',
            timestamp: 'Mar 18, 09:20',
            location: 'Djibouti',
            note: 'Transit permit attached.',
            status: 'done'),
        CustomerTimelineEvent(
            label: 'Inland arrival',
            timestamp: 'Mar 19, 06:28',
            location: 'Adama',
            note: 'Arrival confirmed.',
            status: 'done'),
        CustomerTimelineEvent(
            label: 'Unload complete',
            timestamp: 'Mar 19, 10:45',
            location: 'Adama',
            note: 'Stored in Warehouse 2.',
            status: 'active'),
      ],
      supportThreads: [
        CustomerSupportThread(
          shipmentRef: 'TAB-IM-240318-02',
          channel: 'Telegram',
          title: 'Pickup slot confirmation',
          preview:
              'Support asked consignee to confirm tomorrow morning handoff slot.',
          timestamp: 'Mar 19, 12:05',
          status: 'Open',
          category: 'delivery',
        ),
      ],
    ),
  ];

  static const payments = [
    CustomerPaymentRecord(
      invoiceNumber: 'INV-7845',
      shipmentRef: 'TAB-IM-240319-07',
      amount: 'ETB 1.22M',
      dueDate: 'Mar 18, 2026',
      status: 'Paid',
      receiptStatus: 'Receipt shared',
    ),
    CustomerPaymentRecord(
      invoiceNumber: 'INV-7851',
      shipmentRef: 'TAB-IM-240319-07',
      amount: 'ETB 984K',
      dueDate: 'Mar 21, 2026',
      status: 'Under review',
      receiptStatus: 'Pending review',
    ),
    CustomerPaymentRecord(
      invoiceNumber: 'INV-5510',
      shipmentRef: 'TAB-IM-240318-02',
      amount: 'ETB 1.84M',
      dueDate: 'Mar 18, 2026',
      status: 'Paid',
      receiptStatus: 'Receipt shared',
    ),
  ];

  static const supportThreads = [
    CustomerSupportThread(
      shipmentRef: 'TAB-IM-240319-07',
      channel: 'Chat',
      title: 'Dry-port arrival ETA confirmation',
      preview: 'Operations shared the latest Galafi checkpoint update.',
      timestamp: 'Mar 19, 18:04',
      status: 'Open',
      category: 'delay',
    ),
    CustomerSupportThread(
      shipmentRef: 'TAB-IM-240318-02',
      channel: 'Email',
      title: 'Consignee pickup timing',
      preview: 'Support is waiting on the consignee pickup slot confirmation.',
      timestamp: 'Mar 19, 12:22',
      status: 'Pending customer',
      category: 'delivery',
    ),
  ];

  static const driverTrips = [
    DriverTrip(
      tripId: 'TRP-260320-003',
      bookingNumber: 'TB-260320-003',
      customer: 'Current Manual Test Shipment',
      route: 'Djibouti Port -> Galafi -> Adama Dry Port',
      origin: 'Djibouti Port Gate',
      destination: 'Adama Dry Port',
      containerNumber: 'MSCU3344556',
      sealNumber: 'SL-260320-003',
      tripStatus: 'In transit',
      etaSummary: 'ETA Adama Mar 29, 02:30',
      currentStage: 'Checkpoint progress',
      dispatchNote:
          'Manual release handoff from Djibouti for the current manual test shipment. Final customer location remains customer site after dry-port release.',
      truckPlate: 'ET-TRK-46291',
      trailerPlate: 'Pending trailer',
      driverName: 'Abel Hailu',
      driverType: 'Internal Driver',
      partnerName: 'Tikur Abay Fleet',
      blNumber: 'final-bl-sample.pdf',
      packingListNumber: 'PL-MANUAL-0001',
      invoiceNumber: 'INV-MANUAL-0001',
      transitDocumentType: 'T1',
      transitDocumentNumber: 'T1-DJI-MANUAL-0001',
      customsStatus: 'Transit cleared and ready for inland departure',
      itemSummary: '150 packages across 4 line items',
      itemCount: 4,
      totalPackages: 150,
      totalWeightKg: 9100,
      inlandArrivalConfirmed: false,
      unloadCompleted: false,
      emptyReleased: false,
      emptyReturnStarted: false,
      emptyReturned: false,
      items: [
        CustomerShipmentItem(
          lineNumber: '01',
          description: 'Construction hardware and fasteners',
          hsCode: '7318.15',
          packageType: 'Carton',
          packageCount: 50,
          grossWeightKg: 2400,
          netWeightKg: 2280,
          cbm: 3.6,
          invoiceRef: 'INV-MANUAL-0001',
          packingListRef: 'PL-MANUAL-0001',
          customsTransitRef: 'T1-DJI-MANUAL-0001',
          remarks: 'Origin seal and stuffing verified before departure.',
        ),
        CustomerShipmentItem(
          lineNumber: '02',
          description: 'Steel fittings',
          hsCode: '7307.99',
          packageType: 'Carton',
          packageCount: 40,
          grossWeightKg: 1900,
          netWeightKg: 1810,
          cbm: 3.1,
          invoiceRef: 'INV-MANUAL-0001',
          packingListRef: 'PL-MANUAL-0001',
          customsTransitRef: 'T1-DJI-MANUAL-0001',
          remarks: 'Carton count and marks verified against packing list.',
        ),
        CustomerShipmentItem(
          lineNumber: '03',
          description: 'Photovoltaic solar panels',
          hsCode: '8541.43',
          packageType: 'Pallet',
          packageCount: 20,
          grossWeightKg: 2900,
          netWeightKg: 2740,
          cbm: 7.8,
          invoiceRef: 'INV-MANUAL-0001',
          packingListRef: 'PL-MANUAL-0001',
          customsTransitRef: 'T1-DJI-MANUAL-0001',
          remarks: 'Panels loaded on pallets and strapped for inland transit.',
        ),
        CustomerShipmentItem(
          lineNumber: '04',
          description: 'Steel fittings',
          hsCode: '7307.99',
          packageType: 'Carton',
          packageCount: 40,
          grossWeightKg: 1900,
          netWeightKg: 1810,
          cbm: 3.1,
          invoiceRef: 'INV-MANUAL-0001',
          packingListRef: 'PL-MANUAL-0001',
          customsTransitRef: 'T1-DJI-MANUAL-0001',
          remarks: 'Additional fittings carton batch verified and sealed.',
        ),
      ],
      documents: [
        MobileDocumentRecord(
            type: 'BL',
            reference: 'final-bl-sample.pdf',
            date: 'Mar 20, 2026',
            status: 'Ready'),
        MobileDocumentRecord(
            type: 'Packing List',
            reference: 'PL-MANUAL-0001',
            date: 'Mar 20, 2026',
            status: 'Ready'),
        MobileDocumentRecord(
            type: 'Invoice Summary',
            reference: 'INV-MANUAL-0001',
            date: 'Mar 20, 2026',
            status: 'Ready'),
        MobileDocumentRecord(
            type: 'Transit / Customs',
            reference: 'T1-DJI-MANUAL-0001',
            date: 'Mar 20, 2026',
            status: 'Ready'),
        MobileDocumentRecord(
            type: 'Release Note',
            reference: 'REL-DJI-MANUAL-0001',
            date: 'Mar 20, 2026',
            status: 'Ready'),
        MobileDocumentRecord(
            type: 'Special Handling Note',
            reference: 'OPS-MANUAL-0001',
            date: 'Mar 20, 2026',
            status: 'Ready'),
      ],
      checkpoints: [
        DriverCheckpointEvent(
          location: 'Djibouti Port Gate',
          timestamp: 'Mar 19, 3:00 PM',
          status: 'Passed',
          sealIntact: true,
          driverNote: 'Departure confirmed by dispatch.',
          officerNote: 'Release handoff packet prepared.',
        ),
        DriverCheckpointEvent(
          location: 'PK12 corridor exit',
          timestamp: 'Pending',
          status: 'Pending',
          sealIntact: true,
          driverNote: 'Confirm corridor exit after departure from port gate.',
          officerNote: 'Dispatch should record first inland movement here.',
        ),
        DriverCheckpointEvent(
          location: 'Ali Sabieh weighbridge',
          timestamp: 'Pending',
          status: 'Pending',
          sealIntact: true,
          driverNote: 'Submit weight and vehicle inspection note if requested.',
          officerNote: 'Keep transit and release documents ready.',
        ),
        DriverCheckpointEvent(
          location: 'Galafi border checkpoint',
          timestamp: 'Pending',
          status: 'Pending',
          sealIntact: true,
          driverNote: 'Border checkpoint note and seal verification required.',
          officerNote: 'Transit packet cross-check happens here.',
        ),
        DriverCheckpointEvent(
          location: 'Awash checkpoint',
          timestamp: 'Pending',
          status: 'Pending',
          sealIntact: true,
          driverNote: 'Update ETA and route condition after Awash.',
          officerNote: 'Notify dispatch if delay risk opens.',
        ),
        DriverCheckpointEvent(
          location: 'Adama Dry Port gate',
          timestamp: 'Pending',
          status: 'Pending',
          sealIntact: true,
          driverNote: 'Confirm arrival and gate queue status.',
          officerNote: 'Arrival handoff should move to yard desk from here.',
        ),
        DriverCheckpointEvent(
          location: 'Customer delivery site',
          timestamp: 'Pending',
          status: 'Pending',
          sealIntact: true,
          driverNote: 'Customer handoff follows dry-port release when cleared.',
          officerNote: 'Customer receipt is a separate confirmation step.',
        ),
      ],
      issues: [],
    ),
    DriverTrip(
      tripId: 'TRP-240319-16',
      bookingNumber: 'TAB-DJI-260319-02',
      customer: 'Abay Agro Processing',
      route: 'Djibouti Port -> Galafi -> Combolcha Dry Port',
      origin: 'Doraleh Terminal',
      destination: 'Combolcha Dry Port',
      containerNumber: 'OOLU 621500-2',
      sealNumber: 'OOL-ET-22019',
      tripStatus: 'Checkpoint hold',
      etaSummary: 'Hold at Galafi · ETA under review',
      currentStage: 'Checkpoint hold',
      dispatchNote: 'Wait for customs note before continuing inland.',
      truckPlate: 'AF-4-11028',
      trailerPlate: 'TRL-2231',
      driverName: 'Hassen Nur',
      driverType: 'External Driver',
      partnerName: 'Afar Corridor Carriers',
      blNumber: 'OOLU-DJI-621500',
      packingListNumber: 'PL-6215-B',
      invoiceNumber: 'INV-6215',
      transitDocumentType: 'Customs transit permit',
      transitDocumentNumber: 'CTP-DJI-62150',
      customsStatus: 'Hold at checkpoint pending customs note',
      itemSummary: '31 packages across 2 line items',
      itemCount: 2,
      totalPackages: 31,
      totalWeightKg: 14980,
      inlandArrivalConfirmed: false,
      unloadCompleted: false,
      emptyReleased: false,
      emptyReturnStarted: false,
      emptyReturned: false,
      items: [
        CustomerShipmentItem(
          lineNumber: '01',
          description: 'Agro pump assemblies',
          hsCode: '8413.70',
          packageType: 'Crate',
          packageCount: 9,
          grossWeightKg: 9840,
          netWeightKg: 9310,
          cbm: 12.8,
          invoiceRef: 'INV-6215',
          packingListRef: 'PL-6215-A',
          customsTransitRef: 'CTP-DJI-62150',
          remarks: 'Customs wants line 01 note revalidated.',
        ),
        CustomerShipmentItem(
          lineNumber: '02',
          description: 'Pipe coupling kits',
          hsCode: '7307.99',
          packageType: 'Carton',
          packageCount: 22,
          grossWeightKg: 5140,
          netWeightKg: 4820,
          cbm: 6.4,
          invoiceRef: 'INV-6215',
          packingListRef: 'PL-6215-B',
          customsTransitRef: 'CTP-DJI-62150',
          remarks: 'No visible variance on cartons.',
        ),
      ],
      documents: [
        MobileDocumentRecord(
            type: 'BL',
            reference: 'OOLU-DJI-621500',
            date: 'Mar 15, 2026',
            status: 'Ready'),
        MobileDocumentRecord(
            type: 'Packing List',
            reference: 'PL-6215-A/B',
            date: 'Mar 15, 2026',
            status: 'Ready'),
        MobileDocumentRecord(
            type: 'Invoice Summary',
            reference: 'INV-6215',
            date: 'Mar 15, 2026',
            status: 'Ready'),
        MobileDocumentRecord(
            type: 'Transit / Customs',
            reference: 'CTP-DJI-62150',
            date: 'Mar 18, 2026',
            status: 'Ready'),
        MobileDocumentRecord(
            type: 'Release Note',
            reference: 'REL-62150',
            date: 'Mar 18, 2026',
            status: 'Ready'),
      ],
      checkpoints: [
        DriverCheckpointEvent(
          location: 'Doraleh Terminal',
          timestamp: 'Mar 19, 06:05',
          status: 'Passed',
          sealIntact: true,
          driverNote: 'Trip started from release yard.',
          officerNote: 'Release packet complete.',
        ),
        DriverCheckpointEvent(
          location: 'Galafi checkpoint',
          timestamp: 'Mar 19, 16:18',
          status: 'Hold',
          sealIntact: true,
          driverNote: 'Waiting on customs note validation.',
          officerNote: 'Hold until customs note is reissued.',
        ),
      ],
      issues: [
        DriverIssueRecord(
          type: 'customs hold',
          note: 'Checkpoint customs requested updated note before release.',
          timestamp: 'Mar 19, 16:20',
          status: 'Escalated',
        ),
      ],
    ),
  ];
}
