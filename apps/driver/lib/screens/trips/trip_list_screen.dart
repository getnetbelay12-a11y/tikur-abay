import 'package:flutter/material.dart';

import '../../navigation/mobile_route_navigator.dart';
import '../../app_language.dart';
import '../../services/driver_api.dart';
import '../../widgets/dashboard_cards.dart';

class TripListScreen extends StatefulWidget {
  const TripListScreen({super.key});

  @override
  State<TripListScreen> createState() => _TripListScreenState();
}

class _TripListScreenState extends State<TripListScreen> {
  late Future<List<dynamic>> _tripsFuture;

  @override
  void initState() {
    super.initState();
    _tripsFuture = DriverApi.fetchTrips();
  }

  Future<void> _reload() async {
    final future = DriverApi.fetchTrips();
    setState(() {
      _tripsFuture = future;
    });
    await future.catchError((_) => <dynamic>[]);
  }

  Widget _buildDemoTripsFallback() {
    return RefreshIndicator(
      onRefresh: _reload,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          DashboardInfoCard(
            title: t('driverTripsTitle', fallback: 'Driver trips'),
            subtitle: t('driverTripsFallbackSubtitle',
                fallback:
                    'Live trip data is unavailable right now. Demo trip guidance is shown instead so the driver workspace stays presentable.'),
            icon: Icons.local_shipping_outlined,
          ),
          const SizedBox(height: 12),
          DashboardInfoCard(
            title: t('noAssignedTrip', fallback: 'No assigned trip right now.'),
            subtitle: t('driverDemoNoTrip',
                fallback:
                    'No trip is assigned yet. Keep your profile and KYC readiness in good shape so dispatch can activate you quickly.'),
            icon: Icons.route_outlined,
          ),
          const SizedBox(height: 12),
          DashboardInfoCard(
            title:
                t('nextRecommendedAction', fallback: 'Next recommended action'),
            subtitle: t('nextRecommendedActionSubtitle',
                fallback:
                    'Keep Fayda and driver license ready, then return here after approval to start trip execution.'),
            icon: Icons.auto_awesome_outlined,
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<dynamic>>(
      future: _tripsFuture,
      builder: (context, snapshot) {
        final trips = snapshot.data ?? const [];
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }
        if (snapshot.hasError) {
          return _buildDemoTripsFallback();
        }
        return RefreshIndicator(
          onRefresh: _reload,
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(t('driverTrips', fallback: 'Trips'),
                          style: Theme.of(context).textTheme.titleMedium),
                      const SizedBox(height: 8),
                      Text(t('assignedTripsRecentMovements',
                          fallback:
                              'Assigned trips, recent movements, and next required action.')),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),
              if (trips.isEmpty)
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Text(t('No assigned trip right now.',
                        fallback: 'No assigned trip right now.')),
                  ),
                )
              else
                ...trips.map((item) {
                  final trip = item as Map<String, dynamic>;
                  final tripId =
                      trip['_id']?.toString() ?? trip['id']?.toString() ?? '';
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: Card(
                      child: ListTile(
                        contentPadding: const EdgeInsets.all(16),
                        onTap: tripId.isEmpty
                            ? null
                            : () => MobileRouteNavigator.openTripDetail(
                                  context,
                                  tripId: tripId,
                                ),
                        title: Text(trip['tripCode']?.toString() ?? 'Trip'),
                        subtitle: Padding(
                          padding: const EdgeInsets.only(top: 8),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                  '${trip['origin'] ?? 'Origin'} → ${trip['destination'] ?? 'Destination'}'),
                              const SizedBox(height: 6),
                              Text(
                                  '${t('Status', fallback: 'Status')}: ${(trip['status'] ?? 'assigned').toString().replaceAll('_', ' ')}'),
                            ],
                          ),
                        ),
                        trailing: const Icon(Icons.chevron_right),
                      ),
                    ),
                  );
                }),
            ],
          ),
        );
      },
    );
  }
}
