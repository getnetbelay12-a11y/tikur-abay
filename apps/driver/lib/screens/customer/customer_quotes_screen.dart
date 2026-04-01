import 'package:flutter/material.dart';

class CustomerQuotesScreen extends StatelessWidget {
  const CustomerQuotesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            const SizedBox(height: 12),
            const Text(
              "Customer Quotes",
              style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 20),
            Expanded(
              child: ListView(
                children: const [
                  _QuoteCard(
                    route: "Addis Ababa → Djibouti",
                    cargo: "Container",
                    price: "285,000 ETB",
                    status: "Approved",
                  ),
                  _QuoteCard(
                    route: "Adama → Dire Dawa",
                    cargo: "Machinery",
                    price: "160,000 ETB",
                    status: "Pending",
                  ),
                  _QuoteCard(
                    route: "Addis Ababa → Kombolcha",
                    cargo: "Food Supply",
                    price: "110,000 ETB",
                    status: "Booked",
                  ),
                ],
              ),
            )
          ],
        ),
      ),
    );
  }
}

class _QuoteCard extends StatelessWidget {
  final String route;
  final String cargo;
  final String price;
  final String status;

  const _QuoteCard({
    required this.route,
    required this.cargo,
    required this.price,
    required this.status,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 14),
      child: ListTile(
        title: Text(route),
        subtitle: Text(cargo),
        trailing: Column(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text(price, style: const TextStyle(fontWeight: FontWeight.bold)),
            Text(status),
          ],
        ),
      ),
    );
  }
}
