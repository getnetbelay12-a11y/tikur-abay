import 'package:flutter/material.dart';

class LocationSharingScreen extends StatelessWidget {
  const LocationSharingScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Container(
          height: 260,
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [Color(0xFFE7D5B4), Color(0xFFC98E4A)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(24),
          ),
          child: const Center(
            child: Text(
              'Live Route Map Placeholder',
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700),
            ),
          ),
        ),
        const SizedBox(height: 16),
        const Card(
          child: ListTile(
            contentPadding: EdgeInsets.all(16),
            leading: Icon(Icons.gps_fixed),
            title: Text('Location sharing active'),
            subtitle: Padding(
              padding: EdgeInsets.only(top: 6),
              child: Text('Last synced 2 minutes ago near Djibouti corridor.'),
            ),
          ),
        ),
        const SizedBox(height: 12),
        const Card(
          child: ListTile(
            contentPadding: EdgeInsets.all(16),
            leading: Icon(Icons.speed),
            title: Text('Speed'),
            subtitle: Padding(
              padding: EdgeInsets.only(top: 6),
              child: Text('42 km/h'),
            ),
          ),
        ),
      ],
    );
  }
}
