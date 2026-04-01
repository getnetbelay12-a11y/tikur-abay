import 'package:flutter/material.dart';

class DocumentPrioritySummary {
  const DocumentPrioritySummary({
    required this.title,
    required this.emptyMessage,
    required this.policies,
  });

  final String title;
  final String emptyMessage;
  final List<Map<String, dynamic>> policies;
}

class DocumentPriorityHelper {
  static int priorityRank(String? priority) {
    switch ((priority ?? '').toLowerCase()) {
      case 'high':
        return 0;
      case 'medium':
        return 1;
      default:
        return 2;
    }
  }

  static Color priorityColor(String? priority) {
    switch ((priority ?? '').toLowerCase()) {
      case 'high':
        return const Color(0xFFD64545);
      case 'medium':
        return const Color(0xFFB7791F);
      default:
        return const Color(0xFF52606D);
    }
  }

  static String actionLabel(String? priority) {
    switch ((priority ?? '').toLowerCase()) {
      case 'high':
        return 'Upload first';
      case 'medium':
        return 'Prepare next';
      default:
        return 'Keep ready';
    }
  }

  static List<Map<String, dynamic>> missingPoliciesFromDocuments(
    List<dynamic> policies,
    List<dynamic> documents,
  ) {
    final uploadedCategories = documents
        .whereType<Map>()
        .map((item) => Map<String, dynamic>.from(item))
        .where((doc) {
          final state =
              (doc['requirementState'] ?? doc['status'] ?? '').toString();
          return state == 'uploaded' || state == 'available';
        })
        .map((doc) => doc['category']?.toString() ?? '')
        .where((category) => category.isNotEmpty)
        .toSet();

    return _sortPolicies(
      policies
          .whereType<Map>()
          .map((item) => Map<String, dynamic>.from(item))
          .where((policy) => !uploadedCategories
              .contains(policy['category']?.toString() ?? ''))
          .toList(),
    );
  }

  static List<Map<String, dynamic>> missingPoliciesFromCategories(
    List<dynamic> policies,
    Set<String> availableCategories,
  ) {
    return _sortPolicies(
      policies
          .whereType<Map>()
          .map((item) => Map<String, dynamic>.from(item))
          .where((policy) => !availableCategories
              .contains(policy['category']?.toString() ?? ''))
          .toList(),
    );
  }

  static DocumentPrioritySummary? buildSummary({
    required String title,
    required String emptyMessage,
    required List<dynamic> policies,
    required List<dynamic> documents,
    int limit = 3,
  }) {
    final outstanding = missingPoliciesFromDocuments(policies, documents);
    if (outstanding.isEmpty) {
      return null;
    }
    return DocumentPrioritySummary(
      title: title,
      emptyMessage: emptyMessage,
      policies: outstanding.take(limit).toList(),
    );
  }

  static List<Map<String, dynamic>> _sortPolicies(
    List<Map<String, dynamic>> policies,
  ) {
    policies.sort((left, right) {
      final priorityCompare = priorityRank(left['priority']?.toString())
          .compareTo(priorityRank(right['priority']?.toString()));
      if (priorityCompare != 0) {
        return priorityCompare;
      }
      final leftOrder = (left['displayOrder'] as num?)?.toInt() ?? 999;
      final rightOrder = (right['displayOrder'] as num?)?.toInt() ?? 999;
      return leftOrder.compareTo(rightOrder);
    });
    return policies;
  }
}
