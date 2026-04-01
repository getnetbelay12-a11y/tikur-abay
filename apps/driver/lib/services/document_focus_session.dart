import 'package:flutter/foundation.dart';

class DocumentFocusSession {
  static String? _customerCategory;
  static String? _customerLabel;
  static String? _driverCategory;
  static String? _driverLabel;
  static final ValueNotifier<int> revision = ValueNotifier<int>(0);

  static ({String? category, String? label}) read({
    required bool customer,
  }) {
    return customer
        ? (category: _customerCategory, label: _customerLabel)
        : (category: _driverCategory, label: _driverLabel);
  }

  static void write({
    required bool customer,
    String? category,
    String? label,
  }) {
    if (customer) {
      _customerCategory = category;
      _customerLabel = label;
    } else {
      _driverCategory = category;
      _driverLabel = label;
    }
    revision.value++;
  }

  static void clear({required bool customer}) {
    write(customer: customer, category: null, label: null);
  }
}
