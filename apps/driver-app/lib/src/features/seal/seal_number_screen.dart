import 'package:flutter/material.dart';

class SealNumberScreen extends StatelessWidget {
  const SealNumberScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Seal Number')),
      body: const Center(child: Text('Seal scan or manual entry goes here.')),
    );
  }
}

