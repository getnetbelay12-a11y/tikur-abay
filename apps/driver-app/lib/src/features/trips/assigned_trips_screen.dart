import 'package:flutter/material.dart';

class AssignedTripsScreen extends StatelessWidget {
  const AssignedTripsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Assigned Trips')),
      body: const Center(child: Text('Assigned trip list goes here.')),
    );
  }
}

