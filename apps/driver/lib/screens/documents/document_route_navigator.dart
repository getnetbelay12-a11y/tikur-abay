import 'package:flutter/material.dart';

import 'document_route_screen.dart';

class DocumentRouteNavigator {
  static Future<void> open(
    BuildContext context, {
    required String baseTitle,
    String? focusCategory,
    String? focusLabel,
    String? focusEntityType,
    String? focusEntityId,
  }) {
    return Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => DocumentRouteScreen(
          baseTitle: baseTitle,
          focusCategory: focusCategory,
          focusLabel: focusLabel,
          focusEntityType: focusEntityType,
          focusEntityId: focusEntityId,
        ),
      ),
    );
  }
}
