import 'package:flutter/material.dart';

import '../../services/logistics_demo_data.dart';

class DriverTransitItemDetailsScreen extends StatelessWidget {
  const DriverTransitItemDetailsScreen({required this.items, super.key});

  final List<CustomerShipmentItem> items;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Item details')),
      body: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: items.length,
        separatorBuilder: (_, __) => const SizedBox(height: 12),
        itemBuilder: (context, index) {
          final item = items[index];
          return Card(
            child: Padding(
              padding: const EdgeInsets.all(18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Line ${item.lineNumber}',
                    style: const TextStyle(
                      fontSize: 12,
                      color: Color(0xFF5B677A),
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    item.description,
                    style: const TextStyle(
                        fontSize: 16, fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 8),
                  Text(
                      '${item.packageCount} ${item.packageType} · ${item.grossWeightKg} kg gross'),
                  Text('${item.netWeightKg} kg net · ${item.invoiceRef}'),
                  const SizedBox(height: 6),
                  Text(
                    item.remarks,
                    style:
                        const TextStyle(color: Color(0xFF5B677A), height: 1.35),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}
