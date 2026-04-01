import 'package:flutter/material.dart';

import '../app_language.dart';
import '../screens/notifications/notifications_screen.dart';
import '../screens/profile/profile_screen.dart';
import '../screens/chat/chat_screen.dart';
import '../screens/trips/status_update_screen.dart';
import '../screens/trips/trip_detail_screen.dart';
import '../screens/trips/trip_timeline_screen.dart';

class MobileRouteNavigator {
  static Future<void> openNotifications(BuildContext context) {
    return Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => const NotificationsScreen()),
    );
  }

  static Future<void> openProfile(
    BuildContext context, {
    String? title,
  }) {
    return Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => Scaffold(
          appBar:
              AppBar(title: Text(title ?? t('profile', fallback: 'Profile'))),
          body: const ProfileScreen(),
        ),
      ),
    );
  }

  static Future<void> openTripDetail(
    BuildContext context, {
    required String tripId,
  }) {
    return Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => TripDetailScreen(tripId: tripId)),
    );
  }

  static Future<bool?> openStatusUpdate(
    BuildContext context, {
    required String tripId,
  }) {
    return Navigator.of(context).push<bool>(
      MaterialPageRoute(builder: (_) => StatusUpdateScreen(tripId: tripId)),
    );
  }

  static Future<void> openTripTimeline(
    BuildContext context, {
    required String tripId,
  }) {
    return Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => TripTimelineScreen(tripId: tripId)),
    );
  }

  static Future<void> openDispatcherChat(
    BuildContext context, {
    String? title,
  }) {
    return Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => Scaffold(
          appBar: AppBar(title: Text(title ?? t('chat', fallback: 'Chat'))),
          body: const ChatScreen(),
        ),
      ),
    );
  }
}
