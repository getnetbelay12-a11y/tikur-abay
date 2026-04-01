import 'driver_api.dart';
import 'logistics_demo_data.dart';

class CustomerLiveShipment {
  const CustomerLiveShipment({
    required this.tripCode,
    required this.shipment,
  });

  final String tripCode;
  final CustomerShipment shipment;
}

class CustomerCorridorService {
  static Future<List<CustomerLiveShipment>> loadShipments() async {
    final portal = await DriverApi.fetchCorridorCustomerPortal().catchError((_) => null);
    final portalShipments = (portal?['shipments'] as List<dynamic>? ?? const <dynamic>[])
        .whereType<Map<String, dynamic>>()
        .toList();

    if (portalShipments.isEmpty) {
      return LogisticsDemoData.customerShipments
          .map((shipment) => CustomerLiveShipment(tripCode: shipment.bookingNumber.replaceFirst('TB-', 'TRP-'), shipment: shipment))
          .toList();
    }

    final live = <CustomerLiveShipment>[];
    for (final row in portalShipments) {
      final shipmentRef = row['shipmentRef']?.toString() ?? '';
      final detail = shipmentRef.isEmpty
          ? null
          : await DriverApi.fetchCorridorShipment(shipmentRef).catchError((_) => null);
      live.add(_mapShipment(row, detail));
    }
    return live;
  }

  static CustomerLiveShipment _mapShipment(
    Map<String, dynamic> row,
    Map<String, dynamic>? detail,
  ) {
    final route = detail?['route'] as Map<String, dynamic>? ?? const {};
    final ocean = detail?['ocean'] as Map<String, dynamic>? ?? const {};
    final documentsSummary = detail?['documentsSummary'] as Map<String, dynamic>? ?? const {};
    final customerConfirmation = detail?['customerConfirmation'] as Map<String, dynamic>? ?? const {};
    final trips = (detail?['trips'] as List<dynamic>? ?? const <dynamic>[])
        .whereType<Map<String, dynamic>>()
        .toList();
    final documents = (detail?['documents'] as List<dynamic>? ?? const <dynamic>[])
        .whereType<Map<String, dynamic>>()
        .toList();
    final cargoItems = (detail?['cargoItems'] as List<dynamic>? ?? const <dynamic>[])
        .whereType<Map<String, dynamic>>()
        .toList();
    final milestones = (detail?['milestones'] as List<dynamic>? ?? const <dynamic>[])
        .whereType<Map<String, dynamic>>()
        .toList();
    final supportThreads = (detail?['supportThreads'] as List<dynamic>? ?? const <dynamic>[])
        .whereType<Map<String, dynamic>>()
        .toList();
    final container = row['container'] as Map<String, dynamic>? ?? const {};
    final firstTrip = trips.isNotEmpty ? trips.first : const <String, dynamic>{};
    final tripCode = firstTrip['tripId']?.toString().isNotEmpty == true
        ? firstTrip['tripId'].toString()
        : row['shipmentRef']?.toString().replaceFirst('TB-', 'TRP-') ?? 'Pending trip';

    final shipment = CustomerShipment(
      bookingNumber: row['shipmentRef']?.toString() ?? '',
      customerRef: row['shipmentRef']?.toString() ?? '',
      customer: row['customerName']?.toString() ?? 'Customer',
      supplier: row['supplierName']?.toString() ?? 'Supplier',
      serviceType: row['serviceMode']?.toString() ?? 'multimodal',
      blNumber: ocean['billOfLadingNumber']?.toString() ?? '',
      containerNumber: container['containerNumber']?.toString() ?? '',
      sealNumber: container['sealNumber']?.toString() ?? '',
      route: '${route['portOfLoading'] ?? 'Origin'} -> ${route['portOfDischarge'] ?? 'Djibouti'} -> ${route['inlandDestination'] ?? row['destinationNode'] ?? 'Destination'}',
      currentStage: row['currentStage']?.toString() ?? 'Pending',
      eta: container['currentEta']?.toString().isNotEmpty == true ? _formatDateTime(container['currentEta']?.toString()) : 'Pending',
      lastUpdated: _formatDateTime(row['updatedAt']?.toString()),
      exceptionChip: row['exceptionChip']?['title']?.toString() ?? '',
      vesselEtaDjibouti: ocean['etaDjibouti']?.toString().isNotEmpty == true ? _formatDateTime(ocean['etaDjibouti']?.toString()) : 'Pending',
      gateOutStatus: row['currentStatus']?.toString() ?? 'Pending',
      inlandStatus: firstTrip['tripStatus']?.toString() ?? 'Pending',
      dryPortStatus: container['dryPortStatus']?.toString() ?? 'Pending',
      podStatus: documentsSummary['podStatus']?.toString() ?? 'pending',
      emptyReturnStatus: row['emptyReturnSummary']?.toString() ?? 'Pending',
      deliveryConfirmationStatus: customerConfirmation['status']?.toString() ?? 'pending',
      deliveryConfirmationNote: customerConfirmation['note']?.toString() ?? 'Awaiting customer confirmation.',
      shortageStatus: customerConfirmation['shortageStatus']?.toString() ?? 'none',
      damageStatus: customerConfirmation['damageStatus']?.toString() ?? 'none',
      emptyReturnDeadline: container['freeTimeEndAt']?.toString().isNotEmpty == true ? _formatDateTime(container['freeTimeEndAt']?.toString()) : 'Pending',
      dryPortCollectionDeadline: container['currentEta']?.toString().isNotEmpty == true ? _formatDateTime(container['currentEta']?.toString()) : 'Pending',
      freeTimeStatus: 'Detention ${container['detentionRiskLevel'] ?? 'pending'} · Demurrage ${container['demurrageRiskLevel'] ?? 'pending'}',
      customsDeclarationRef: row['shipmentRef']?.toString() ?? '',
      transitType: 'T1',
      transitRef: documents.firstWhere(
        (item) => item['documentType']?.toString() == 'transit_document',
        orElse: () => const <String, dynamic>{},
      )['referenceNo']?.toString() ?? '',
      customsReleaseStatus: documentsSummary['customsDocStatus']?.toString() ?? 'pending',
      inspectionStatus: row['exceptionStatus']?.toString() ?? 'clear',
      taxDutySummary: row['taxDutySummary']?.toString() ?? 'Pending',
      releaseReadiness: row['releaseReadiness']?.toString() ?? 'Pending',
      customsComment: 'Track Djibouti release, inland dispatch, and customer handoff from the live corridor milestones.',
      items: cargoItems.map((item) => CustomerShipmentItem(
        lineNumber: item['lineNo']?.toString() ?? item['lineNumber']?.toString() ?? '',
        description: item['description']?.toString() ?? 'Cargo item',
        hsCode: item['hsCode']?.toString() ?? 'Pending',
        packageType: item['packageType']?.toString() ?? 'Package',
        packageCount: (item['packageQty'] as num?)?.toInt() ?? 0,
        grossWeightKg: (item['grossWeightKg'] as num?)?.toInt() ?? 0,
        netWeightKg: (item['netWeightKg'] as num?)?.toInt() ?? 0,
        cbm: (item['cbm'] as num?)?.toDouble() ?? 0,
        invoiceRef: item['invoiceRef']?.toString() ?? '',
        packingListRef: item['packingListRef']?.toString() ?? '',
        customsTransitRef: item['transitDocRef']?.toString() ?? '',
        remarks: item['remarks']?.toString() ?? '',
      )).toList(),
      documents: documents.map((doc) => MobileDocumentRecord(
        type: doc['documentType']?.toString() ?? 'Document',
        reference: doc['referenceNo']?.toString() ?? '',
        date: _formatDateTime(doc['uploadedDate']?.toString()),
        status: doc['status']?.toString() ?? 'pending',
      )).toList(),
      timeline: milestones.map((event) => CustomerTimelineEvent(
        label: event['label']?.toString() ?? 'Milestone',
        timestamp: _formatDateTime(event['timestamp']?.toString()),
        location: event['location']?.toString() ?? 'Corridor update',
        note: event['note']?.toString() ?? '',
        status: event['status']?.toString() ?? 'pending',
      )).toList(),
      supportThreads: supportThreads.map((thread) => CustomerSupportThread(
        shipmentRef: row['shipmentRef']?.toString() ?? '',
        channel: thread['channel']?.toString() ?? 'Chat',
        title: thread['title']?.toString() ?? 'Support thread',
        preview: thread['preview']?.toString() ?? '',
        timestamp: _formatDateTime(thread['timestamp']?.toString()),
        status: thread['status']?.toString() ?? 'pending',
        category: thread['category']?.toString() ?? 'support',
      )).toList(),
    );

    return CustomerLiveShipment(tripCode: tripCode, shipment: shipment);
  }

  static String _formatDateTime(String? value) {
    if (value == null || value.isEmpty) return 'Pending';
    final parsed = DateTime.tryParse(value);
    if (parsed == null) return value;
    final month = _month(parsed.month);
    final minute = parsed.minute.toString().padLeft(2, '0');
    final hour = parsed.hour % 12 == 0 ? 12 : parsed.hour % 12;
    final meridiem = parsed.hour >= 12 ? 'PM' : 'AM';
    return '$month ${parsed.day}, $hour:$minute $meridiem';
  }

  static String _month(int month) {
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];
    return months[(month - 1).clamp(0, 11)];
  }
}
