import 'package:flutter/material.dart';

import 'customer_book_screen.dart';
import '../../services/customer_corridor_service.dart';
import '../../services/logistics_demo_data.dart';

class CustomerHomeScreen extends StatelessWidget {
  const CustomerHomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<CustomerLiveShipment>>(
      future: CustomerCorridorService.loadShipments(),
      builder: (context, snapshot) {
        if (!snapshot.hasData) {
          return const Center(child: CircularProgressIndicator());
        }
        final shipments = snapshot.data!;
        final primary = shipments.first.shipment;
        final primaryTripCode = shipments.first.tripCode;
        final supportOpen = primary.supportThreads
            .where((thread) => thread.status.toLowerCase() != 'resolved')
            .length;

        return ListView(
          padding: const EdgeInsets.all(16),
          children: [
        _HeroCard(shipment: primary),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(
              child: FilledButton(
                onPressed: () {
                  Navigator.of(context).push(
                    MaterialPageRoute<void>(
                      builder: (_) => const CustomerBookScreen(),
                    ),
                  );
                },
                child: const Text('Request quote / booking'),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: OutlinedButton(
                onPressed: () => ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Open Shipments to review the current cargo journey and receipt confirmation.'),
                  ),
                ),
                child: const Text('Open shipment tracking'),
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(
              child: _SummaryCard(
                title: 'Active shipments',
                value: '${shipments.length}',
                helper: 'Djibouti corridor files in motion',
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _SummaryCard(
                title: 'Documents ready',
                value:
                    '${primary.documents.where((doc) => doc.status != 'Pending').length}',
                helper: 'Linked files available now',
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: _SummaryCard(
                title: 'Finance events',
                value: '${primary.documents.length}',
                helper: 'Invoices and receipts to review',
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _SummaryCard(
                title: 'Support threads',
                value: '$supportOpen',
                helper: 'Open questions and follow-up',
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: _ActionCard(
                title: 'Next actions',
                items: const [
                  'Follow the next milestone and ETA.',
                  'Review cargo items and shipment documents.',
                  'Confirm goods received after unload and item check.',
                ],
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _ActionCard(
                title: 'Exceptions',
                items: shipments
                    .where((entry) => entry.shipment.exceptionChip.isNotEmpty)
                    .take(3)
                    .map((entry) =>
                        '${entry.tripCode} · ${entry.shipment.bookingNumber}: ${entry.shipment.exceptionChip}')
                    .toList(),
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        _SectionCard(
          title: 'Shipment documents',
          child: Column(
            children: primary.documents
                .map(
                  (document) => _DocumentRow(
                    type: document.type,
                    reference: document.reference,
                    meta: '${primary.bookingNumber} · ${document.date}',
                    status: document.status,
                  ),
                )
                .toList(),
          ),
        ),
        const SizedBox(height: 16),
        _SectionCard(
          title: 'Recent activity',
          child: Column(
            children: [
              ...primary.timeline.take(5).map(
                    (event) => _ActivityRow(
                      label: event.label,
                      meta: '${event.timestamp} · ${event.location}',
                      note: event.note,
                    ),
                  ),
              const SizedBox(height: 8),
                FilledButton.tonal(
                  onPressed: () => ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('Open Shipments to inspect $primaryTripCode and ${primary.bookingNumber}.'),
                    ),
                  ),
                  child: const Text('Open current shipment'),
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

class _HeroCard extends StatelessWidget {
  const _HeroCard({required this.shipment});

  final CustomerShipment shipment;

  @override
  Widget build(BuildContext context) {
    const stages = [
      'Booking',
      'Ocean',
      'Djibouti',
      'Inland Transit',
      'Dry Port',
      'Delivery',
      'Empty Return',
    ];
    final activeIndex = stages.indexWhere(
      (stage) =>
          shipment.currentStage.toLowerCase().contains(stage.toLowerCase()),
    );

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFF16324D),
        borderRadius: BorderRadius.circular(24),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  'Active shipment',
                  style: TextStyle(
                    color: Colors.white.withValues(alpha: 0.76),
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              _TopChip(label: shipment.serviceType),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            shipment.bookingNumber,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 24,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            '${shipment.blNumber} · ${shipment.containerNumber} · ${shipment.sealNumber}',
            style: TextStyle(
              color: Colors.white.withValues(alpha: 0.82),
              height: 1.4,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            shipment.route,
            style: TextStyle(
              color: Colors.white.withValues(alpha: 0.74),
              height: 1.4,
            ),
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(
                  child: _HeroFact(
                      label: 'Current stage', value: shipment.currentStage)),
              Expanded(child: _HeroFact(label: 'ETA', value: shipment.eta)),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: List.generate(stages.length, (index) {
              final isDone = index < activeIndex;
              final isActive = index == activeIndex;
              return Expanded(
                child: Padding(
                  padding: EdgeInsets.only(
                      right: index == stages.length - 1 ? 0 : 6),
                  child: Container(
                    height: 8,
                    decoration: BoxDecoration(
                      color: isDone || isActive
                          ? const Color(0xFF7ED0FF)
                          : Colors.white.withValues(alpha: 0.18),
                      borderRadius: BorderRadius.circular(999),
                    ),
                  ),
                ),
              );
            }),
          ),
          const SizedBox(height: 10),
          Text(
            'Last updated ${shipment.lastUpdated}',
            style: TextStyle(
              color: Colors.white.withValues(alpha: 0.68),
              fontSize: 12,
            ),
          ),
        ],
      ),
    );
  }
}

class _HeroFact extends StatelessWidget {
  const _HeroFact({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: TextStyle(
            color: Colors.white.withValues(alpha: 0.64),
            fontSize: 12,
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          value,
          style: const TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.w700,
          ),
        ),
      ],
    );
  }
}

class _SummaryCard extends StatelessWidget {
  const _SummaryCard({
    required this.title,
    required this.value,
    required this.helper,
  });

  final String title;
  final String value;
  final String helper;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: const TextStyle(
                color: Color(0xFF5B677A),
                fontSize: 12,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              value,
              style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 6),
            Text(
              helper,
              style: const TextStyle(color: Color(0xFF5B677A), height: 1.35),
            ),
          ],
        ),
      ),
    );
  }
}

class _ActionCard extends StatelessWidget {
  const _ActionCard({required this.title, required this.items});

  final String title;
  final List<String> items;

  @override
  Widget build(BuildContext context) {
    return _SectionCard(
      title: title,
      child: Column(
        children: items
            .map(
              (item) => Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Padding(
                      padding: EdgeInsets.only(top: 6),
                      child:
                          Icon(Icons.circle, size: 8, color: Color(0xFF16324D)),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        item,
                        style: const TextStyle(height: 1.4),
                      ),
                    ),
                  ],
                ),
              ),
            )
            .toList(),
      ),
    );
  }
}

class _SectionCard extends StatelessWidget {
  const _SectionCard({required this.title, required this.child});

  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 14),
            child,
          ],
        ),
      ),
    );
  }
}

class _ActivityRow extends StatelessWidget {
  const _ActivityRow({
    required this.label,
    required this.meta,
    required this.note,
  });

  final String label;
  final String meta;
  final String note;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 10,
            height: 10,
            margin: const EdgeInsets.only(top: 5),
            decoration: const BoxDecoration(
              color: Color(0xFF16324D),
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label,
                    style: const TextStyle(fontWeight: FontWeight.w700)),
                const SizedBox(height: 2),
                Text(meta, style: const TextStyle(color: Color(0xFF5B677A))),
                const SizedBox(height: 4),
                Text(note, style: const TextStyle(height: 1.35)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _DocumentRow extends StatelessWidget {
  const _DocumentRow({
    required this.type,
    required this.reference,
    required this.meta,
    required this.status,
  });

  final String type;
  final String reference;
  final String meta;
  final String status;

  @override
  Widget build(BuildContext context) {
    final ready = status.toLowerCase() != 'pending';
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFF7F9FC),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              color: const Color(0xFF16324D).withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(
              Icons.description_outlined,
              color: Color(0xFF16324D),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  type,
                  style: const TextStyle(fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 4),
                Text(
                  reference,
                  style: const TextStyle(height: 1.3),
                ),
                const SizedBox(height: 2),
                Text(
                  meta,
                  style: const TextStyle(
                    color: Color(0xFF5B677A),
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Text(
            status,
            style: TextStyle(
              color: ready ? const Color(0xFF0F766E) : const Color(0xFFB7791F),
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}

class _TopChip extends StatelessWidget {
  const _TopChip({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.14),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: const TextStyle(
          color: Colors.white,
          fontSize: 11,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}
