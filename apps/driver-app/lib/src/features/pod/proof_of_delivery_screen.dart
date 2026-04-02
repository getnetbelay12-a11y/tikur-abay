import 'package:flutter/material.dart';

class ProofOfDeliveryScreen extends StatelessWidget {
  const ProofOfDeliveryScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Proof of Delivery')),
      body: const Center(child: Text('Delivery proof upload goes here.')),
    );
  }
}

