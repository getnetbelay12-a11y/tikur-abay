import 'package:flutter/material.dart';

import '../../services/logistics_demo_data.dart';

class CustomerPaymentsScreen extends StatefulWidget {
  const CustomerPaymentsScreen({super.key});

  @override
  State<CustomerPaymentsScreen> createState() => _CustomerPaymentsScreenState();
}

class _CustomerPaymentsScreenState extends State<CustomerPaymentsScreen> {
  String _filter = 'All';

  @override
  Widget build(BuildContext context) {
    final payments = _filter == 'All'
        ? LogisticsDemoData.payments
        : LogisticsDemoData.payments
            .where((payment) => payment.status == _filter)
            .toList();

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const Text(
          'Payments',
          style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
        ),
        const SizedBox(height: 8),
        const Text(
          'Track invoices, receipts, and any action still required on your shipments.',
          style: TextStyle(color: Color(0xFF5B677A)),
        ),
        const SizedBox(height: 14),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: ['All', 'Paid', 'Under review']
              .map(
                (value) => ChoiceChip(
                  label: Text(value),
                  selected: _filter == value,
                  onSelected: (_) => setState(() => _filter = value),
                ),
              )
              .toList(),
        ),
        const SizedBox(height: 16),
        ...payments.map(
          (payment) => Card(
            margin: const EdgeInsets.only(bottom: 12),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          payment.invoiceNumber,
                          style: const TextStyle(fontWeight: FontWeight.w800),
                        ),
                      ),
                      Text(
                        payment.status,
                        style: TextStyle(
                          color: payment.status == 'Paid'
                              ? const Color(0xFF0F766E)
                              : const Color(0xFFB7791F),
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text('Shipment ${payment.shipmentRef}'),
                  Text('Amount ${payment.amount} · Due ${payment.dueDate}'),
                  Text('Receipt ${payment.receiptStatus}'),
                  const SizedBox(height: 12),
                  Wrap(
                    spacing: 10,
                    runSpacing: 10,
                    children: [
                      FilledButton.tonal(
                        onPressed: () {},
                        child: const Text('View invoice'),
                      ),
                      FilledButton.tonal(
                        onPressed: () {},
                        child: const Text('View receipt'),
                      ),
                      FilledButton.tonal(
                        onPressed: () =>
                            ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text(
                                'Support has been notified for finance follow-up.'),
                          ),
                        ),
                        child: const Text('Contact support'),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }
}
