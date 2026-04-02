import 'package:flutter/material.dart';

class LiveTrackingScreen extends StatelessWidget {
  const LiveTrackingScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Live Tracking')),
      body: const Center(child: Text('GPS sharing and map preview go here.')),
    );
  }
}

