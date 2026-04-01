import 'package:flutter/material.dart';

import '../../services/document_focus_session.dart';
import '../../services/driver_api.dart';
import 'document_screen.dart';

class DocumentRouteScreen extends StatelessWidget {
  const DocumentRouteScreen({
    required this.baseTitle,
    this.focusCategory,
    this.focusLabel,
    this.focusEntityType,
    this.focusEntityId,
    super.key,
  });

  final String baseTitle;
  final String? focusCategory;
  final String? focusLabel;
  final String? focusEntityType;
  final String? focusEntityId;

  bool get _isCustomerRole {
    final role =
        (DriverSession.user?['mobileRole'] ?? DriverSession.user?['role'] ?? '')
            .toString();
    return role == 'customer';
  }

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<int>(
      valueListenable: DocumentFocusSession.revision,
      builder: (context, _, __) {
        final focus = DocumentFocusSession.read(customer: _isCustomerRole);
        final activeLabel = focus.label ?? focus.category;
        final title = (activeLabel != null && activeLabel.isNotEmpty)
            ? '$baseTitle: $activeLabel'
            : baseTitle;
        return Scaffold(
          appBar: AppBar(title: Text(title)),
          body: DocumentScreen(
            focusCategory: focusCategory,
            focusLabel: focusLabel,
            focusEntityType: focusEntityType,
            focusEntityId: focusEntityId,
          ),
        );
      },
    );
  }
}
