import 'package:flutter/material.dart';

import '../../services/customer_corridor_service.dart';
import '../../services/logistics_demo_data.dart';

class CustomerShipmentsScreen extends StatefulWidget {
  const CustomerShipmentsScreen({super.key});

  @override
  State<CustomerShipmentsScreen> createState() =>
      _CustomerShipmentsScreenState();
}

class _CustomerShipmentsScreenState extends State<CustomerShipmentsScreen> {
  int _selectedIndex = 0;
  int _tabIndex = 0;
  final Map<String, String> _confirmedReceipts = {};
  final Map<String, String> _confirmationNotes = {};
  final Map<String, String> _shortageStates = {};
  final Map<String, String> _damageStates = {};

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<CustomerLiveShipment>>(
      future: CustomerCorridorService.loadShipments(),
      builder: (context, snapshot) {
        if (!snapshot.hasData) {
          return const Center(child: CircularProgressIndicator());
        }
        final liveShipments = snapshot.data!;
        final safeIndex = _selectedIndex >= liveShipments.length ? 0 : _selectedIndex;
        final selected = liveShipments[safeIndex];
        final shipment = selected.shipment;
        final receiptConfirmation = _confirmedReceipts[shipment.bookingNumber];
        final confirmationStatus = receiptConfirmation ?? shipment.deliveryConfirmationStatus;
        final confirmationNote = _confirmationNotes[shipment.bookingNumber] ?? shipment.deliveryConfirmationNote;
        final shortageStatus = _shortageStates[shipment.bookingNumber] ?? shipment.shortageStatus;
        final damageStatus = _damageStates[shipment.bookingNumber] ?? shipment.damageStatus;

        return Column(
          children: [
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                children: [
              const _SectionTitle('My shipments'),
              const SizedBox(height: 12),
              ...List.generate(liveShipments.length, (index) {
                final item = liveShipments[index].shipment;
                final selected = index == _selectedIndex;
                return Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: InkWell(
                    borderRadius: BorderRadius.circular(20),
                    onTap: () => setState(() {
                      _selectedIndex = index;
                      _tabIndex = 0;
                    }),
                    child: Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color:
                            selected ? const Color(0xFFEEF4FB) : Colors.white,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                          color: selected
                              ? const Color(0xFF16324D)
                              : const Color(0xFFDCE4EE),
                        ),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Expanded(
                                child: Text(
                                  '${liveShipments[index].tripCode} · ${item.bookingNumber}',
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w800,
                                  ),
                                ),
                              ),
                              _StatusChip(
                                label: item.exceptionChip,
                                tone: item.exceptionChip
                                        .toLowerCase()
                                        .contains('pending')
                                    ? const Color(0xFFB7791F)
                                    : const Color(0xFF0F766E),
                              ),
                            ],
                          ),
                          const SizedBox(height: 6),
                          Text(
                            '${item.containerNumber} · ${item.route}',
                            style: const TextStyle(color: Color(0xFF5B677A)),
                          ),
                          const SizedBox(height: 8),
                          Row(
                            children: [
                              Expanded(child: Text(item.currentStage)),
                              Text(item.eta,
                                  style: const TextStyle(
                                    fontSize: 12,
                                    color: Color(0xFF5B677A),
                                  )),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              }),
              const SizedBox(height: 8),
              _ShipmentHeader(
                tripCode: selected.tripCode,
                shipment: shipment,
                receiptConfirmation: confirmationStatus,
              ),
              const SizedBox(height: 14),
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: List.generate(_tabs.length, (index) {
                    final selected = index == _tabIndex;
                    return Padding(
                      padding: EdgeInsets.only(
                          right: index == _tabs.length - 1 ? 0 : 10),
                      child: InkWell(
                        borderRadius: BorderRadius.circular(999),
                        onTap: () => setState(() => _tabIndex = index),
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 14,
                            vertical: 10,
                          ),
                          decoration: BoxDecoration(
                            color: selected
                                ? const Color(0xFF16324D)
                                : Colors.white,
                            borderRadius: BorderRadius.circular(999),
                            border: Border.all(color: const Color(0xFFDCE4EE)),
                          ),
                          child: Text(
                            _tabs[index],
                            style: TextStyle(
                              color: selected
                                  ? Colors.white
                                  : const Color(0xFF16324D),
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                      ),
                    );
                  }),
                ),
              ),
              const SizedBox(height: 14),
                _ShipmentTabContent(
                  tabIndex: _tabIndex,
                  shipment: shipment,
                receiptConfirmation: confirmationStatus,
                confirmationNote: confirmationNote,
                shortageStatus: shortageStatus,
                damageStatus: damageStatus,
                onSetConfirmation: (status, note) => setState(() {
                  _confirmedReceipts[shipment.bookingNumber] = status;
                  _confirmationNotes[shipment.bookingNumber] = note;
                  _shortageStates[shipment.bookingNumber] =
                      status.contains('shortage') ? 'reported' : 'none';
                  _damageStates[shipment.bookingNumber] =
                      status.contains('damage') ? 'reported' : 'none';
                }),
                ),
                ],
              ),
            ),
        ],
        );
      },
    );
  }
}

const _tabs = [
  'Overview',
  'Cargo Items',
  'Documents',
  'Customs & Tax',
  'Timeline',
  'Support',
];

class _ShipmentHeader extends StatelessWidget {
  const _ShipmentHeader({
    required this.tripCode,
    required this.shipment,
    required this.receiptConfirmation,
  });

  final String tripCode;
  final CustomerShipment shipment;
  final String? receiptConfirmation;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              shipment.bookingNumber,
              style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 10),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                _InfoPill(label: 'BL', value: shipment.blNumber),
                _InfoPill(label: 'Container', value: shipment.containerNumber),
                _InfoPill(label: 'Seal', value: shipment.sealNumber),
                _InfoPill(label: 'Service', value: shipment.serviceType),
              ],
            ),
            const SizedBox(height: 12),
            _InfoRow(label: 'Trip', value: tripCode),
            _InfoRow(label: 'Customer', value: shipment.customer),
            _InfoRow(label: 'Supplier', value: shipment.supplier),
            _InfoRow(label: 'Route', value: shipment.route),
            _InfoRow(label: 'Current stage', value: shipment.currentStage),
            _InfoRow(
              label: 'Customer confirmation',
              value: receiptConfirmation ?? 'Awaiting receipt confirmation',
            ),
            _InfoRow(label: 'Last updated', value: shipment.lastUpdated),
          ],
        ),
      ),
    );
  }
}

class _ShipmentTabContent extends StatelessWidget {
  const _ShipmentTabContent({
    required this.tabIndex,
    required this.shipment,
    required this.receiptConfirmation,
    required this.confirmationNote,
    required this.shortageStatus,
    required this.damageStatus,
    required this.onSetConfirmation,
  });

  final int tabIndex;
  final CustomerShipment shipment;
  final String? receiptConfirmation;
  final String confirmationNote;
  final String shortageStatus;
  final String damageStatus;
  final void Function(String status, String note) onSetConfirmation;

  @override
  Widget build(BuildContext context) {
    switch (tabIndex) {
      case 1:
        final totalPackages = shipment.items.fold<int>(
          0,
          (sum, item) => sum + item.packageCount,
        );
        final totalGross = shipment.items.fold<int>(
          0,
          (sum, item) => sum + item.grossWeightKg,
        );
        final totalCbm = shipment.items.fold<double>(
          0,
          (sum, item) => sum + item.cbm,
        );
        return Card(
          child: Padding(
            padding: const EdgeInsets.all(18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Cargo items',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 14),
                ...shipment.items.map(
                  (item) => Container(
                    margin: const EdgeInsets.only(bottom: 12),
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF7FAFC),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: const Color(0xFFE3EAF2)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Line ${item.lineNumber} · ${item.description}',
                          style: const TextStyle(fontWeight: FontWeight.w800),
                        ),
                        const SizedBox(height: 8),
                        Text(
                            '${item.packageCount} ${item.packageType} · HS ${item.hsCode}'),
                        Text(
                          'Gross ${item.grossWeightKg} kg · Net ${item.netWeightKg} kg · ${item.cbm.toStringAsFixed(1)} CBM',
                        ),
                        Text(
                            'Invoice ${item.invoiceRef} · Packing ${item.packingListRef}'),
                        Text('Transit ${item.customsTransitRef}'),
                        const SizedBox(height: 6),
                        Text(
                          item.remarks,
                          style: const TextStyle(color: Color(0xFF5B677A)),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  'Totals · ${shipment.items.length} lines · $totalPackages packages · $totalGross kg gross · ${totalCbm.toStringAsFixed(1)} CBM',
                  style: const TextStyle(
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF16324D),
                  ),
                ),
              ],
            ),
          ),
        );
      case 2:
        return Card(
          child: Padding(
            padding: const EdgeInsets.all(18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '${shipment.documents.where((doc) => doc.status != 'Pending').length} of ${shipment.documents.length} linked shipment documents available',
                  style: const TextStyle(
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF16324D),
                  ),
                ),
                const SizedBox(height: 14),
                ...shipment.documents.map(
                  (doc) => ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: const CircleAvatar(
                      radius: 18,
                      backgroundColor: Color(0xFFEAF1F8),
                      child: Icon(Icons.description_outlined,
                          color: Color(0xFF16324D)),
                    ),
                    title: Text(doc.type,
                        style: const TextStyle(fontWeight: FontWeight.w700)),
                    subtitle: Text('${doc.reference} · ${doc.date}'),
                    trailing: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        _StatusChip(
                          label: doc.status,
                          tone: doc.status == 'Pending'
                              ? const Color(0xFFB7791F)
                              : const Color(0xFF0F766E),
                        ),
                        const SizedBox(height: 6),
                        const Text('View',
                            style: TextStyle(fontWeight: FontWeight.w700)),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      case 3:
        return Card(
          child: Padding(
            padding: const EdgeInsets.all(18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _InfoRow(
                    label: 'Customs declaration',
                    value: shipment.customsDeclarationRef),
                _InfoRow(
                    label: 'Transit document',
                    value: '${shipment.transitType} · ${shipment.transitRef}'),
                _InfoRow(
                    label: 'Customs release',
                    value: shipment.customsReleaseStatus),
                _InfoRow(label: 'Inspection', value: shipment.inspectionStatus),
                _InfoRow(label: 'Tax / duty', value: shipment.taxDutySummary),
                _InfoRow(
                    label: 'Release readiness',
                    value: shipment.releaseReadiness),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF7FAFC),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Text(
                    shipment.customsComment,
                    style: const TextStyle(height: 1.4),
                  ),
                ),
              ],
            ),
          ),
        );
      case 4:
        return Card(
          child: Padding(
            padding: const EdgeInsets.all(18),
            child: Column(
              children: shipment.timeline
                  .map(
                    (event) => Padding(
                      padding: const EdgeInsets.only(bottom: 14),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Icon(
                            event.status == 'done'
                                ? Icons.check_circle
                                : event.status == 'active'
                                    ? Icons.radio_button_checked
                                    : Icons.circle_outlined,
                            size: 18,
                            color: event.status == 'done'
                                ? const Color(0xFF0F766E)
                                : event.status == 'active'
                                    ? const Color(0xFF16324D)
                                    : const Color(0xFF94A3B8),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(event.label,
                                    style: const TextStyle(
                                        fontWeight: FontWeight.w700)),
                                Text(
                                  '${event.timestamp} · ${event.location}',
                                  style:
                                      const TextStyle(color: Color(0xFF5B677A)),
                                ),
                                Text(event.note,
                                    style: const TextStyle(height: 1.35)),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  )
                  .toList(),
            ),
          ),
        );
      case 5:
        return Card(
          child: Padding(
            padding: const EdgeInsets.all(18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                FilledButton.tonal(
                  onPressed: () => ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                        content: Text('Support request composer coming next.')),
                  ),
                  child: const Text('New support request'),
                ),
                const SizedBox(height: 14),
                ...shipment.supportThreads.map(
                  (thread) => Container(
                    margin: const EdgeInsets.only(bottom: 12),
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF7FAFC),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            _StatusChip(
                                label: thread.channel,
                                tone: const Color(0xFF16324D)),
                            const SizedBox(width: 8),
                            _StatusChip(
                              label: thread.status,
                              tone: thread.status
                                      .toLowerCase()
                                      .contains('pending')
                                  ? const Color(0xFFB7791F)
                                  : const Color(0xFF0F766E),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Text(thread.title,
                            style:
                                const TextStyle(fontWeight: FontWeight.w800)),
                        const SizedBox(height: 4),
                        Text(thread.preview,
                            style: const TextStyle(height: 1.35)),
                        const SizedBox(height: 6),
                        Text(
                          '${thread.timestamp} · ${thread.category}',
                          style: const TextStyle(color: Color(0xFF5B677A)),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      default:
        return Card(
          child: Padding(
            padding: const EdgeInsets.all(18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _InfoRow(
                    label: 'Vessel / ETA Djibouti',
                    value: shipment.vesselEtaDjibouti),
                _InfoRow(label: 'Gate-out', value: shipment.gateOutStatus),
                _InfoRow(
                    label: 'Inland transport', value: shipment.inlandStatus),
                _InfoRow(label: 'Dry-port', value: shipment.dryPortStatus),
                _InfoRow(label: 'POD', value: shipment.podStatus),
                _InfoRow(label: 'Shortage status', value: shortageStatus),
                _InfoRow(label: 'Damage status', value: damageStatus),
                _InfoRow(
                    label: 'Empty return', value: shipment.emptyReturnStatus),
                _InfoRow(
                    label: 'Free-time / risk', value: shipment.freeTimeStatus),
                _InfoRow(
                    label: 'Dry-port deadline',
                    value: shipment.dryPortCollectionDeadline),
                _InfoRow(
                    label: 'Empty return deadline',
                    value: shipment.emptyReturnDeadline),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF7FAFC),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Text(
                    'Expected next step: ${shipment.currentStage == 'Dry Port' ? 'Consignee handoff and POD capture.' : 'Dry-port arrival confirmation and unload slot check.'}',
                  ),
                ),
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF7FAFC),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFFE3EAF2)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Customer confirmation',
                        style: TextStyle(
                          fontWeight: FontWeight.w800,
                          color: Color(0xFF16324D),
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        confirmationNote,
                        style: const TextStyle(height: 1.35),
                      ),
                      const SizedBox(height: 10),
                      Wrap(
                        spacing: 10,
                        runSpacing: 10,
                        children: [
                          FilledButton(
                            onPressed: () => onSetConfirmation(
                              'received_clean',
                              'Goods received and accepted by customer.',
                            ),
                            child: const Text('Confirm goods received'),
                          ),
                          FilledButton.tonal(
                            onPressed: () => onSetConfirmation(
                              'received_with_shortage',
                              'Shortage reported by customer and review opened.',
                            ),
                            child: const Text('Report shortage'),
                          ),
                          FilledButton.tonal(
                            onPressed: () => onSetConfirmation(
                              'received_with_damage',
                              'Damage reported by customer and photo review requested.',
                            ),
                            child: const Text('Report damage'),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        );
    }
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 130,
            child: Text(
              label,
              style: const TextStyle(
                fontWeight: FontWeight.w700,
                color: Color(0xFF5B677A),
              ),
            ),
          ),
          Expanded(
            child: Text(value,
                style: const TextStyle(fontWeight: FontWeight.w600)),
          ),
        ],
      ),
    );
  }
}

class _InfoPill extends StatelessWidget {
  const _InfoPill({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
      decoration: BoxDecoration(
        color: const Color(0xFFF7FAFC),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Text(
        '$label: $value',
        style: const TextStyle(fontWeight: FontWeight.w700),
      ),
    );
  }
}

class _StatusChip extends StatelessWidget {
  const _StatusChip({required this.label, required this.tone});

  final String label;
  final Color tone;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: tone.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: tone,
          fontSize: 11,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle(this.title);

  final String title;

  @override
  Widget build(BuildContext context) {
    return Text(
      title,
      style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
    );
  }
}
