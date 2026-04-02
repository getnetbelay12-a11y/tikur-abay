import 'package:flutter/material.dart';

void main() {
  runApp(const TikurAbayDriverApp());
}

class TikurAbayDriverApp extends StatelessWidget {
  const TikurAbayDriverApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'Tikur Abay Driver',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF0E3A8A)),
        useMaterial3: true,
      ),
      home: const DriverHomePage(),
    );
  }
}

class DriverHomePage extends StatelessWidget {
  const DriverHomePage({super.key});

  @override
  Widget build(BuildContext context) {
    final cards = [
      'Assigned Trips',
      'Start Trip',
      'Upload Loading Photos',
      'Upload Documents',
      'Seal Number',
      'Live Location',
      'Checkpoints',
      'Incidents',
      'Proof of Delivery',
      'Complete Trip',
    ];

    return Scaffold(
      appBar: AppBar(
        title: const Text('Tikur Abay Driver'),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: GridView.builder(
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              mainAxisSpacing: 12,
              crossAxisSpacing: 12,
              childAspectRatio: 1.25,
            ),
            itemCount: cards.length,
            itemBuilder: (context, index) {
              return Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Align(
                    alignment: Alignment.topLeft,
                    child: Text(
                      cards[index],
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w700,
                          ),
                    ),
                  ),
                ),
              );
            },
          ),
        ),
      ),
    );
  }
}
