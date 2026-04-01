import 'driver_api.dart';
import 'logistics_demo_data.dart';

class AssignedDriverTripService {
  static int _operationalTripWeight(Map<String, dynamic>? trip) {
    if (trip == null) return -1;
    final tripCode = (trip['tripCode']?.toString() ??
            trip['tripId']?.toString() ??
            trip['id']?.toString() ??
            '')
        .toUpperCase();
    final shipmentCode = (trip['shipmentCode']?.toString() ??
            trip['bookingNumber']?.toString() ??
            '')
        .toUpperCase();
    final combined = '$tripCode $shipmentCode';
    if (combined.contains('TRP-BK-') ||
        combined.contains('ERT-BK-') ||
        combined.contains(' BK-')) {
      return 100;
    }
    if (combined.contains('TRP-MANUAL') || combined.contains('TB-MANUAL')) {
      return 10;
    }
    if (tripCode.startsWith('TRP-') || tripCode.startsWith('ERT-')) {
      return 70;
    }
    return 40;
  }

  static DateTime _parseTripTimestamp(Map<String, dynamic>? trip) {
    if (trip == null) return DateTime.fromMillisecondsSinceEpoch(0);
    return DateTime.tryParse(
          trip['lastUpdate']?.toString() ??
              trip['updatedAt']?.toString() ??
              trip['lastPacketUpdate']?.toString() ??
              trip['createdAt']?.toString() ??
              '',
        ) ??
        DateTime.fromMillisecondsSinceEpoch(0);
  }

  static int _normalizedCodeScore(String code) {
    final cleaned = code.replaceAll(RegExp(r'[^0-9]'), '');
    if (cleaned.isEmpty) return -1;
    return int.tryParse(cleaned) ?? -1;
  }

  static bool _looksLikeOperationalTripCode(String code) {
    return code.startsWith('TRP-') ||
        code.startsWith('ERT-') ||
        code.startsWith('TB-') ||
        code.startsWith('BK-');
  }

  static int _tripRecordScore(Map<String, dynamic>? trip) {
    if (trip == null) return -1;
    final tripCode = trip['tripCode']?.toString() ??
        trip['tripId']?.toString() ??
        trip['id']?.toString() ??
        '';
    final shipmentCode = trip['shipmentCode']?.toString() ??
        trip['bookingNumber']?.toString() ??
        '';
    final tripScore = _normalizedCodeScore(tripCode);
    if (tripScore >= 0) return tripScore;
    final shipmentScore = _normalizedCodeScore(shipmentCode);
    if (shipmentScore >= 0) return shipmentScore;
    return -1;
  }

  static int _tripStatusWeight(Map<String, dynamic>? trip) {
    if (trip == null) return -1;
    final status = (trip['tripStatus']?.toString() ??
            trip['dispatchStatus']?.toString() ??
            trip['status']?.toString() ??
            '')
        .trim()
        .toLowerCase();
    switch (status) {
      case 'empty_returned':
      case 'empty returned':
        return 15;
      case 'empty_return_in_transit':
      case 'empty return in transit':
        return 72;
      case 'awaiting_empty_return_departure':
      case 'awaiting empty return departure':
        return 68;
      case 'awaiting_empty_return_assignment':
      case 'awaiting empty return assignment':
        return 25;
      case 'awaiting_unload_handoff':
      case 'awaiting unload handoff':
        return 90;
      case 'arrived_inland':
      case 'arrived inland':
      case 'handed_to_yard':
      case 'handed to yard':
        return 88;
      case 'ready_to_depart':
      case 'ready to depart':
        return 94;
      case 'in_transit':
      case 'in transit':
      case 'departed':
      case 'checkpoint_hold':
      case 'checkpoint hold':
      case 'delayed':
        return 92;
      case 'assigned':
        return 80;
      case 'awaiting_driver_assignment':
      case 'awaiting driver assignment':
        return 20;
      case 'awaiting_truck_assignment':
      case 'awaiting truck assignment':
        return 10;
      default:
        return 40;
    }
  }

  static DriverTrip _emptyAssignedTrip() {
    return const DriverTrip(
      tripId: 'UNASSIGNED',
      bookingNumber: 'UNASSIGNED',
      customer: 'No customer assigned',
      route: 'No active route assigned',
      origin: 'Pending dispatch',
      destination: 'Pending dispatch',
      containerNumber: '',
      sealNumber: '',
      tripStatus: 'Awaiting assignment',
      etaSummary: 'ETA pending',
      currentStage: 'Awaiting dispatch',
      dispatchNote:
          'No active trip is currently assigned to this driver. Dispatch will push the transit pack when a live trip is ready.',
      truckPlate: 'Pending truck',
      trailerPlate: 'Pending trailer',
      driverName: 'Assigned driver',
      driverType: 'Internal Driver',
      partnerName: 'Tikur Abay Fleet',
      blNumber: '',
      packingListNumber: '',
      invoiceNumber: '',
      transitDocumentType: 'T1',
      transitDocumentNumber: '',
      customsStatus: 'Pending assignment',
      itemSummary: 'No active trip items available yet.',
      itemCount: 0,
      totalPackages: 0,
      totalWeightKg: 0,
      inlandArrivalConfirmed: false,
      unloadCompleted: false,
      emptyReleased: false,
      emptyReturnStarted: false,
      emptyReturned: false,
      items: [],
      documents: [],
      checkpoints: [],
      issues: [],
    );
  }

  static Future<DriverTrip> loadAssignedTrip() async {
    await DriverApi.hydrateSession();

    final trips = await DriverApi.fetchTrips().catchError((_) => <dynamic>[]);
    Map<String, dynamic>? transitPack;
    try {
      transitPack = await DriverApi.fetchCorridorDriverTransitPack();
    } catch (_) {
      transitPack = null;
    }

    bool isRealE2eTrip(Map<String, dynamic> trip) {
      final tripCode =
          trip['tripCode']?.toString() ?? trip['id']?.toString() ?? '';
      final shipmentCode = trip['shipmentCode']?.toString() ??
          trip['bookingNumber']?.toString() ??
          transitPack?['bookingNumber']?.toString() ??
          '';
      return _looksLikeOperationalTripCode(tripCode) ||
          _looksLikeOperationalTripCode(shipmentCode);
    }

    final allLiveTrips = trips.whereType<Map<String, dynamic>>().toList();

    final prioritizedTrips = allLiveTrips.any(isRealE2eTrip)
        ? allLiveTrips.where(isRealE2eTrip).toList()
        : allLiveTrips;

    final liveTripCandidates = prioritizedTrips
      ..sort((left, right) {
        final rightOperationalWeight = _operationalTripWeight(right);
        final leftOperationalWeight = _operationalTripWeight(left);
        if (rightOperationalWeight != leftOperationalWeight) {
          return rightOperationalWeight.compareTo(leftOperationalWeight);
        }

        final rightStatusWeight = _tripStatusWeight(right);
        final leftStatusWeight = _tripStatusWeight(left);
        if (rightStatusWeight != leftStatusWeight) {
          return rightStatusWeight.compareTo(leftStatusWeight);
        }

        final leftUpdated = DateTime.tryParse(
              left['lastUpdate']?.toString() ??
                  left['updatedAt']?.toString() ??
                  left['createdAt']?.toString() ??
                  '',
            ) ??
            DateTime.fromMillisecondsSinceEpoch(0);
        final rightUpdated = DateTime.tryParse(
              right['lastUpdate']?.toString() ??
                  right['updatedAt']?.toString() ??
                  right['createdAt']?.toString() ??
                  '',
            ) ??
            DateTime.fromMillisecondsSinceEpoch(0);
        final updatedCompare = rightUpdated.compareTo(leftUpdated);
        if (updatedCompare != 0) return updatedCompare;

        int tripCodeDateScore(Map<String, dynamic> trip) {
          final tripCode =
              trip['tripCode']?.toString() ?? trip['id']?.toString() ?? '';
          final shipmentCode = trip['shipmentCode']?.toString() ??
              trip['bookingNumber']?.toString() ??
              '';
          final tripScore = _normalizedCodeScore(tripCode);
          if (tripScore >= 0) return tripScore;
          final shipmentScore = _normalizedCodeScore(shipmentCode);
          if (shipmentScore >= 0) return shipmentScore;
          return -1;
        }

        final tripCodeCompare =
            tripCodeDateScore(right).compareTo(tripCodeDateScore(left));
        if (tripCodeCompare != 0) return tripCodeCompare;

        final leftTripCode =
            left['tripCode']?.toString() ?? left['id']?.toString() ?? '';
        final rightTripCode =
            right['tripCode']?.toString() ?? right['id']?.toString() ?? '';
        return rightTripCode.compareTo(leftTripCode);
      });

    final liveTrip =
        liveTripCandidates.cast<Map<String, dynamic>?>().firstWhere(
      (trip) {
        if (trip == null) return false;
        final tripCode = trip['tripCode']?.toString() ?? '';
        final shipmentCode = trip['shipmentCode']?.toString() ??
            trip['bookingNumber']?.toString() ??
            '';
        return _looksLikeOperationalTripCode(tripCode) ||
            _looksLikeOperationalTripCode(shipmentCode);
      },
      orElse: () => null,
    );

    final transitPackScore = _tripRecordScore(transitPack);
    final liveTripScore = _tripRecordScore(liveTrip);
    final transitPackTripId = transitPack?['tripId']?.toString() ?? '';
    final transitPackBooking = transitPack?['bookingNumber']?.toString() ?? '';
    final liveTripId = liveTrip?['tripCode']?.toString() ??
        liveTrip?['tripId']?.toString() ??
        '';
    final liveTripBooking = liveTrip?['shipmentCode']?.toString() ??
        liveTrip?['bookingNumber']?.toString() ??
        '';
    final sameOperationalTrip = transitPackTripId.isNotEmpty &&
            liveTripId.isNotEmpty &&
            transitPackTripId == liveTripId ||
        (transitPackBooking.isNotEmpty &&
            liveTripBooking.isNotEmpty &&
            transitPackBooking == liveTripBooking);
    final transitPackUpdatedAt = _parseTripTimestamp(transitPack);
    final liveTripUpdatedAt = _parseTripTimestamp(liveTrip);
    final transitPackOperationalWeight = _operationalTripWeight(transitPack);
    final liveTripOperationalWeight = _operationalTripWeight(liveTrip);
    final transitPackStatusWeight = _tripStatusWeight(transitPack);
    final liveTripStatusWeight = _tripStatusWeight(liveTrip);
    final shouldPreferTransitPack = transitPack != null &&
        transitPack.isNotEmpty &&
        (_looksLikeOperationalTripCode(
                transitPack['tripId']?.toString() ?? '') ||
            _looksLikeOperationalTripCode(
                transitPack['bookingNumber']?.toString() ?? '')) &&
        (liveTrip == null ||
            liveTripScore < 0 ||
            transitPackOperationalWeight > liveTripOperationalWeight ||
            (transitPackOperationalWeight == liveTripOperationalWeight &&
                transitPackStatusWeight > liveTripStatusWeight) ||
            (sameOperationalTrip &&
                !transitPackUpdatedAt.isBefore(liveTripUpdatedAt) &&
                transitPackScore >= liveTripScore));

    if (shouldPreferTransitPack) {
      final liveTransitPack = transitPack;
      final itemDetails = (liveTransitPack['itemDetails'] as List<dynamic>? ??
          const <dynamic>[]);
      final origin = liveTransitPack['origin']?.toString() ?? 'Djibouti Port';
      final destination =
          liveTransitPack['destination']?.toString() ?? 'Adama Dry Port';

      return DriverTrip(
        tripId: liveTransitPack['tripId']?.toString() ?? 'UNASSIGNED',
        bookingNumber:
            liveTransitPack['bookingNumber']?.toString().isNotEmpty == true
                ? liveTransitPack['bookingNumber'].toString()
                : 'UNASSIGNED',
        customer: liveTransitPack['customerName']?.toString().isNotEmpty == true
            ? liveTransitPack['customerName'].toString()
            : 'Assigned customer',
        route: liveTransitPack['route']?.toString() ??
            'Djibouti Port -> Galafi -> Adama Dry Port',
        origin: origin,
        destination: destination,
        containerNumber: liveTransitPack['containerNumber']?.toString() ?? '',
        sealNumber: liveTransitPack['sealNumber']?.toString() ?? '',
        tripStatus:
            _labelize(liveTransitPack['tripStatus']?.toString() ?? 'assigned'),
        etaSummary: _buildEtaSummary(liveTransitPack),
        currentStage:
            _buildCurrentStage(liveTransitPack['tripStatus']?.toString()),
        dispatchNote:
            'Live transit pack loaded from corridor operations with BL, container, seal, T1, route, and checkpoint actions.',
        truckPlate:
            liveTransitPack['truckPlate']?.toString() ?? 'Pending truck',
        trailerPlate:
            liveTransitPack['trailerPlate']?.toString() ?? 'Pending trailer',
        driverName:
            liveTransitPack['driverName']?.toString() ?? 'Assigned driver',
        driverType: 'Internal Driver',
        partnerName: 'Tikur Abay Fleet',
        blNumber: liveTransitPack['blNumber']?.toString() ?? '',
        packingListNumber:
            liveTransitPack['packingListNumber']?.toString() ?? '',
        invoiceNumber: liveTransitPack['invoiceNumber']?.toString() ?? '',
        transitDocumentType: _labelize(
            liveTransitPack['transitDocumentSubtype']?.toString() ?? 't1'),
        transitDocumentNumber:
            liveTransitPack['transitDocumentNumber']?.toString() ?? '',
        customsStatus: _labelize(
            liveTransitPack['customsStatus']?.toString() ?? 'pending'),
        itemSummary:
            '${liveTransitPack['totalPackages'] ?? 0} packages across ${liveTransitPack['itemCount'] ?? 0} line items',
        itemCount: (liveTransitPack['itemCount'] as num?)?.toInt() ??
            itemDetails.length,
        totalPackages: (liveTransitPack['totalPackages'] as num?)?.toInt() ?? 0,
        totalWeightKg:
            (liveTransitPack['totalGrossWeightKg'] as num?)?.toInt() ?? 0,
        inlandArrivalConfirmed:
            liveTransitPack['inlandArrivalConfirmed'] == true,
        unloadCompleted: liveTransitPack['unloadCompleted'] == true,
        emptyReleased: liveTransitPack['emptyReleased'] == true,
        emptyReturnStarted: liveTransitPack['emptyReturnStarted'] == true,
        emptyReturned: liveTransitPack['emptyReturned'] == true,
        items: itemDetails.map((dynamic item) {
          final row = item as Map<String, dynamic>;
          return CustomerShipmentItem(
            lineNumber: row['lineNo']?.toString() ?? '',
            description: row['description']?.toString() ?? 'Cargo item',
            hsCode: 'Pending',
            packageType: row['packageType']?.toString() ?? 'Package',
            packageCount: (row['packageCount'] as num?)?.toInt() ?? 0,
            grossWeightKg: (row['weightKg'] as num?)?.toInt() ?? 0,
            netWeightKg: (row['weightKg'] as num?)?.toInt() ?? 0,
            cbm: 0,
            invoiceRef: liveTransitPack['invoiceNumber']?.toString() ?? '',
            packingListRef:
                liveTransitPack['packingListNumber']?.toString() ?? '',
            customsTransitRef:
                liveTransitPack['transitDocumentNumber']?.toString() ?? '',
            remarks: row['remarks']?.toString() ?? '',
          );
        }).toList(),
        documents: [
          MobileDocumentRecord(
              type: 'BL',
              reference: liveTransitPack['blNumber']?.toString() ?? '',
              date: 'Live',
              status: 'Ready'),
          MobileDocumentRecord(
              type: 'Packing List',
              reference: liveTransitPack['packingListNumber']?.toString() ?? '',
              date: 'Live',
              status: 'Ready'),
          MobileDocumentRecord(
              type: 'Invoice Summary',
              reference: liveTransitPack['invoiceNumber']?.toString() ?? '',
              date: 'Live',
              status: 'Ready'),
          MobileDocumentRecord(
              type: 'Transit / Customs',
              reference:
                  liveTransitPack['transitDocumentNumber']?.toString() ?? '',
              date: 'Live',
              status: 'Ready'),
        ],
        checkpoints: _buildLiveCheckpoints(
          tripStatus: liveTransitPack['tripStatus']?.toString() ?? 'assigned',
          currentCheckpoint:
              liveTransitPack['currentCheckpoint']?.toString() ?? origin,
          actualDeparture: liveTransitPack['actualDeparture']?.toString(),
          actualArrival: liveTransitPack['actualArrival']?.toString(),
          destination: destination,
        ),
        issues: const [],
      );
    }

    if (liveTrip != null) {
      final fallbackTransitPack = transitPack ?? const <String, dynamic>{};
      final tripId = liveTrip['tripCode']?.toString() ??
          liveTrip['id']?.toString() ??
          'UNASSIGNED';
      final tripStatus = liveTrip['tripStatus']?.toString() ??
          liveTrip['dispatchStatus']?.toString() ??
          liveTrip['status']?.toString() ??
          'assigned';
      final route = liveTrip['route']?.toString() ??
          'Djibouti Port -> Galafi -> Adama Dry Port';
      final origin = liveTrip['origin']?.toString() ?? 'Djibouti Port';
      final destination =
          liveTrip['destination']?.toString() ?? 'Adama Dry Port';
      final currentCheckpoint =
          liveTrip['currentCheckpoint']?.toString() ?? origin;
      final actualDeparture = liveTrip['actualDeparture']?.toString();
      final actualArrival = liveTrip['actualArrival']?.toString();
      final bookingNumber = liveTrip['shipmentCode']?.toString() ??
          liveTrip['bookingNumber']?.toString() ??
          fallbackTransitPack['bookingNumber']?.toString() ??
          'UNASSIGNED';
      final blNumber = liveTrip['blNumber']?.toString().isNotEmpty == true
          ? liveTrip['blNumber'].toString()
          : fallbackTransitPack['blNumber']?.toString().isNotEmpty == true
              ? fallbackTransitPack['blNumber'].toString()
              : 'BL-$bookingNumber';
      final transitDocumentNumber =
          liveTrip['transitDocumentNumber']?.toString().isNotEmpty == true
              ? liveTrip['transitDocumentNumber'].toString()
              : fallbackTransitPack['transitDocumentNumber']
                          ?.toString()
                          .isNotEmpty ==
                      true
                  ? fallbackTransitPack['transitDocumentNumber'].toString()
                  : 'T1-$bookingNumber';
      final packingListNumber =
          liveTrip['packingListNumber']?.toString().isNotEmpty == true
              ? liveTrip['packingListNumber'].toString()
              : fallbackTransitPack['packingListNumber']
                          ?.toString()
                          .isNotEmpty ==
                      true
                  ? fallbackTransitPack['packingListNumber'].toString()
                  : 'PL-$bookingNumber';
      final invoiceNumber = liveTrip['invoiceNumber']?.toString().isNotEmpty ==
              true
          ? liveTrip['invoiceNumber'].toString()
          : fallbackTransitPack['invoiceNumber']?.toString().isNotEmpty == true
              ? fallbackTransitPack['invoiceNumber'].toString()
              : 'INV-$bookingNumber';
      return DriverTrip(
        tripId: tripId,
        bookingNumber: bookingNumber,
        customer: liveTrip['customer']?.toString() ??
            liveTrip['customerName']?.toString() ??
            'Assigned customer',
        route: route,
        origin: origin,
        destination: destination,
        containerNumber:
            liveTrip['containerNumber']?.toString().isNotEmpty == true
                ? liveTrip['containerNumber'].toString()
                : fallbackTransitPack['containerNumber']?.toString() ?? '',
        sealNumber: liveTrip['sealNumber']?.toString().isNotEmpty == true
            ? liveTrip['sealNumber'].toString()
            : fallbackTransitPack['sealNumber']?.toString() ?? '',
        tripStatus: _labelize(tripStatus),
        etaSummary: _buildEtaSummary(liveTrip),
        currentStage: _buildCurrentStage(tripStatus),
        dispatchNote:
            'Live assigned trip loaded from operations with BL, container, seal, T1, route, and checkpoint actions.',
        truckPlate: liveTrip['truckPlate']?.toString().isNotEmpty == true
            ? liveTrip['truckPlate'].toString()
            : fallbackTransitPack['truckPlate']?.toString() ?? 'Pending truck',
        trailerPlate: liveTrip['trailerPlate']?.toString().isNotEmpty == true
            ? liveTrip['trailerPlate'].toString()
            : fallbackTransitPack['trailerPlate']?.toString() ??
                'Pending trailer',
        driverName: liveTrip['driverName']?.toString().isNotEmpty == true
            ? liveTrip['driverName'].toString()
            : fallbackTransitPack['driverName']?.toString() ??
                'Assigned driver',
        driverType: 'Internal Driver',
        partnerName: liveTrip['partnerName']?.toString() ?? 'Tikur Abay Fleet',
        blNumber: blNumber,
        packingListNumber: packingListNumber,
        invoiceNumber: invoiceNumber,
        transitDocumentType: 'T1',
        transitDocumentNumber: transitDocumentNumber,
        customsStatus: 'Ready for border / customs inspection',
        itemSummary:
            'Driver border packet is ready with BL, T1, packing list, and invoice summary.',
        itemCount: 0,
        totalPackages: 0,
        totalWeightKg: 0,
        inlandArrivalConfirmed: tripStatus.toLowerCase().contains('arrived'),
        unloadCompleted: false,
        emptyReleased: false,
        emptyReturnStarted: false,
        emptyReturned: false,
        items: const [],
        documents: [
          MobileDocumentRecord(
              type: 'T1 Transit Document',
              reference: transitDocumentNumber,
              date: 'Live',
              status: 'Ready'),
          MobileDocumentRecord(
              type: 'BL', reference: blNumber, date: 'Live', status: 'Ready'),
          MobileDocumentRecord(
              type: 'Packing List',
              reference: packingListNumber,
              date: 'Live',
              status: 'Ready'),
          MobileDocumentRecord(
              type: 'Invoice Summary',
              reference: invoiceNumber,
              date: 'Live',
              status: 'Ready'),
        ],
        checkpoints: _buildLiveCheckpoints(
          tripStatus: tripStatus,
          currentCheckpoint: currentCheckpoint,
          actualDeparture: actualDeparture,
          actualArrival: actualArrival,
          destination: destination,
        ),
        issues: const [],
      );
    }

    if (transitPack != null && transitPack.isNotEmpty) {
      final liveTransitPack = transitPack;
      final itemDetails = (liveTransitPack['itemDetails'] as List<dynamic>? ??
          const <dynamic>[]);
      final origin = liveTransitPack['origin']?.toString() ?? 'Djibouti Port';
      final destination =
          liveTransitPack['destination']?.toString() ?? 'Adama Dry Port';

      return DriverTrip(
        tripId: liveTransitPack['tripId']?.toString() ?? 'UNASSIGNED',
        bookingNumber:
            liveTransitPack['bookingNumber']?.toString().isNotEmpty == true
                ? liveTransitPack['bookingNumber'].toString()
                : 'UNASSIGNED',
        customer: liveTransitPack['customerName']?.toString().isNotEmpty == true
            ? liveTransitPack['customerName'].toString()
            : 'Assigned customer',
        route: liveTransitPack['route']?.toString() ??
            'Djibouti Port -> Galafi -> Adama Dry Port',
        origin: origin,
        destination: destination,
        containerNumber: liveTransitPack['containerNumber']?.toString() ?? '',
        sealNumber: liveTransitPack['sealNumber']?.toString() ?? '',
        tripStatus:
            _labelize(liveTransitPack['tripStatus']?.toString() ?? 'assigned'),
        etaSummary: _buildEtaSummary(liveTransitPack),
        currentStage:
            _buildCurrentStage(liveTransitPack['tripStatus']?.toString()),
        dispatchNote:
            'Live transit pack loaded from corridor operations with BL, container, seal, T1, route, and checkpoint actions.',
        truckPlate:
            liveTransitPack['truckPlate']?.toString() ?? 'Pending truck',
        trailerPlate:
            liveTransitPack['trailerPlate']?.toString() ?? 'Pending trailer',
        driverName:
            liveTransitPack['driverName']?.toString() ?? 'Assigned driver',
        driverType: 'Internal Driver',
        partnerName: 'Tikur Abay Fleet',
        blNumber: liveTransitPack['blNumber']?.toString() ?? '',
        packingListNumber:
            liveTransitPack['packingListNumber']?.toString() ?? '',
        invoiceNumber: liveTransitPack['invoiceNumber']?.toString() ?? '',
        transitDocumentType: _labelize(
            liveTransitPack['transitDocumentSubtype']?.toString() ?? 't1'),
        transitDocumentNumber:
            liveTransitPack['transitDocumentNumber']?.toString() ?? '',
        customsStatus: _labelize(
            liveTransitPack['customsStatus']?.toString() ?? 'pending'),
        itemSummary:
            '${liveTransitPack['totalPackages'] ?? 0} packages across ${liveTransitPack['itemCount'] ?? 0} line items',
        itemCount: (liveTransitPack['itemCount'] as num?)?.toInt() ??
            itemDetails.length,
        totalPackages: (liveTransitPack['totalPackages'] as num?)?.toInt() ?? 0,
        totalWeightKg:
            (liveTransitPack['totalGrossWeightKg'] as num?)?.toInt() ?? 0,
        inlandArrivalConfirmed:
            liveTransitPack['inlandArrivalConfirmed'] == true,
        unloadCompleted: liveTransitPack['unloadCompleted'] == true,
        emptyReleased: liveTransitPack['emptyReleased'] == true,
        emptyReturnStarted: liveTransitPack['emptyReturnStarted'] == true,
        emptyReturned: liveTransitPack['emptyReturned'] == true,
        items: itemDetails.map((dynamic item) {
          final row = item as Map<String, dynamic>;
          return CustomerShipmentItem(
            lineNumber: row['lineNo']?.toString() ?? '',
            description: row['description']?.toString() ?? 'Cargo item',
            hsCode: 'Pending',
            packageType: row['packageType']?.toString() ?? 'Package',
            packageCount: (row['packageCount'] as num?)?.toInt() ?? 0,
            grossWeightKg: (row['weightKg'] as num?)?.toInt() ?? 0,
            netWeightKg: (row['weightKg'] as num?)?.toInt() ?? 0,
            cbm: 0,
            invoiceRef: liveTransitPack['invoiceNumber']?.toString() ?? '',
            packingListRef:
                liveTransitPack['packingListNumber']?.toString() ?? '',
            customsTransitRef:
                liveTransitPack['transitDocumentNumber']?.toString() ?? '',
            remarks: row['remarks']?.toString() ?? '',
          );
        }).toList(),
        documents: [
          MobileDocumentRecord(
              type: 'BL',
              reference: liveTransitPack['blNumber']?.toString() ?? '',
              date: 'Live',
              status: 'Ready'),
          MobileDocumentRecord(
              type: 'Packing List',
              reference: liveTransitPack['packingListNumber']?.toString() ?? '',
              date: 'Live',
              status: 'Ready'),
          MobileDocumentRecord(
              type: 'Invoice Summary',
              reference: liveTransitPack['invoiceNumber']?.toString() ?? '',
              date: 'Live',
              status: 'Ready'),
          MobileDocumentRecord(
              type: 'Transit / Customs',
              reference:
                  liveTransitPack['transitDocumentNumber']?.toString() ?? '',
              date: 'Live',
              status: 'Ready'),
        ],
        checkpoints: _buildLiveCheckpoints(
          tripStatus: liveTransitPack['tripStatus']?.toString() ?? 'assigned',
          currentCheckpoint:
              liveTransitPack['currentCheckpoint']?.toString() ?? origin,
          actualDeparture: liveTransitPack['actualDeparture']?.toString(),
          actualArrival: liveTransitPack['actualArrival']?.toString(),
          destination: destination,
        ),
        issues: const [],
      );
    }

    return _emptyAssignedTrip();
  }

  static String _buildEtaSummary(Map<String, dynamic>? trip) {
    final eta = trip?['eta']?.toString();
    if (eta == null || eta.isEmpty) return 'ETA pending';
    return 'ETA $eta';
  }

  static String _buildCurrentStage(String? status) {
    final normalized = status?.toLowerCase() ?? '';
    if (normalized.contains('arrived')) return 'Dry port arrival';
    if (normalized.contains('depart')) return 'Truck transit';
    if (normalized.contains('transit')) return 'Truck transit';
    return 'Dispatch assigned';
  }

  static String _labelize(String value) {
    if (value.isEmpty) return 'Pending';
    return value.replaceAll('_', ' ').split(' ').map((part) {
      if (part.isEmpty) return part;
      return part[0].toUpperCase() + part.substring(1);
    }).join(' ');
  }

  static List<DriverCheckpointEvent> _buildLiveCheckpoints({
    required String tripStatus,
    required String currentCheckpoint,
    required String? actualDeparture,
    required String? actualArrival,
    required String destination,
  }) {
    final normalizedStatus = tripStatus.toLowerCase();
    final destinationGate = destination.toLowerCase().contains('combolcha')
        ? 'Combolcha Dry Port gate'
        : 'Adama Dry Port gate';
    final checkpoints = [
      (
        'Djibouti Port Gate',
        'Departure confirmed from port gate.',
        'Release handoff packet prepared.'
      ),
      (
        'PK12 corridor exit',
        'Departed Djibouti gate clean, seal intact.',
        'Dispatch recorded first inland movement here.'
      ),
      (
        'Ali Sabieh weighbridge',
        'Weight verified, no exception.',
        'Transit and release documents checked.'
      ),
      (
        'Galafi border checkpoint',
        'T1 and BL presented, customs cleared.',
        'Border packet inspected and released.'
      ),
      (
        'Awash checkpoint',
        'Corridor movement normal, no delay.',
        'Proceeding to inland dry port.'
      ),
      (
        destinationGate,
        'Arrived for yard handoff, seal intact.',
        'Arrival confirmed for yard handoff.'
      ),
    ];

    int passedIndex = -1;
    if (normalizedStatus.contains('handed_to_yard') ||
        normalizedStatus.contains('arrived_inland')) {
      passedIndex = checkpoints.length - 1;
    } else if (normalizedStatus.contains('checkpoint_hold') ||
        normalizedStatus.contains('delayed') ||
        normalizedStatus.contains('transit') ||
        normalizedStatus.contains('departed')) {
      final currentIndex = checkpoints.indexWhere(
        (item) => item.$1.toLowerCase() == currentCheckpoint.toLowerCase(),
      );
      passedIndex = currentIndex >= 0 ? currentIndex : 1;
    } else if (normalizedStatus.contains('ready_to_depart') ||
        normalizedStatus.contains('assigned')) {
      passedIndex = 0;
    }

    String timestampForIndex(int index) {
      if (index == 0) {
        if (actualDeparture?.isNotEmpty == true) return actualDeparture!;
        return index <= passedIndex
            ? 'Departure confirmed'
            : 'Departure pending';
      }
      if (index == checkpoints.length - 1) {
        if (actualArrival?.isNotEmpty == true) return actualArrival!;
        return index <= passedIndex ? 'Arrival confirmed' : 'Arrival pending';
      }
      if (index <= passedIndex) return 'Passed';
      return 'Pending';
    }

    return List<DriverCheckpointEvent>.generate(checkpoints.length, (index) {
      final checkpoint = checkpoints[index];
      final isPassed = index <= passedIndex;
      final isCurrent = !isPassed && index == passedIndex + 1;
      return DriverCheckpointEvent(
        location: checkpoint.$1,
        timestamp: timestampForIndex(index),
        status: isPassed
            ? 'Passed'
            : isCurrent
                ? 'Current'
                : 'Pending',
        sealIntact: true,
        driverNote: checkpoint.$2,
        officerNote: checkpoint.$3,
      );
    });
  }
}
