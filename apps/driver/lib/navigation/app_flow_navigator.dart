import 'package:flutter/material.dart';

import '../main.dart';
import '../screens/auth/customer_login_screen.dart';
import '../screens/auth/customer_registration_screen.dart';
import '../screens/auth/driver_login_screen.dart';
import '../screens/auth/driver_kyc_upload_screen.dart';
import '../screens/auth/driver_registration_screen.dart';
import '../screens/auth/login_screen.dart';
import '../screens/auth/otp_verification_screen.dart';

class AppFlowNavigator {
  static Future<void> openCustomerLogin(BuildContext context) {
    return Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => const CustomerLoginScreen()),
    );
  }

  static Future<void> openDriverLogin(BuildContext context) {
    return Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => const DriverLoginScreen()),
    );
  }

  static Future<void> openOtpVerification(
    BuildContext context, {
    required String identifier,
    required String role,
    String? debugOtp,
  }) {
    return Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => OtpVerificationScreen(
          identifier: identifier,
          role: role,
          debugOtp: debugOtp,
        ),
      ),
    );
  }

  static Future<void> replaceWithRegistration(
    BuildContext context, {
    required String identifier,
    required String role,
  }) {
    return Navigator.of(context).pushReplacement(
      MaterialPageRoute(
        builder: (_) => role == 'customer'
            ? CustomerRegistrationScreen(identifier: identifier)
            : DriverRegistrationScreen(identifier: identifier),
      ),
    );
  }

  static Future<void> openDriverKycUpload(
    BuildContext context, {
    required String role,
  }) {
    return Navigator.of(context).pushReplacement(
      MaterialPageRoute(
        builder: (_) => DriverKycUploadScreen(role: role),
      ),
    );
  }

  static Future<void> resetToSessionHome(BuildContext context) {
    return Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => const MobileRoleHome()),
      (_) => false,
    );
  }

  static Future<void> resetToRoleHome(
    BuildContext context, {
    required String role,
    String? kycStatus,
  }) {
    return Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(
        builder: (_) => _homeForRole(
          role: role,
          kycStatus: kycStatus,
        ),
      ),
      (_) => false,
    );
  }

  static Future<void> resetToRoleLogin(
    BuildContext context, {
    String? role,
  }) {
    final normalizedRole = _normalizeRole(role);
    final Widget destination = switch (normalizedRole) {
      'customer' => const CustomerLoginScreen(),
      'internal_driver' || 'external_driver' => const DriverLoginScreen(),
      _ => const LoginScreen(),
    };
    return Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => destination),
      (_) => false,
    );
  }

  static Future<void> resetToHome(BuildContext context) {
    return resetToSessionHome(context);
  }

  static Future<void> resetToLogin(BuildContext context) {
    return resetToRoleLogin(context);
  }

  static Widget _homeForRole({
    required String role,
    String? kycStatus,
  }) {
    final normalizedRole = _normalizeRole(role);
    if (normalizedRole == 'customer') {
      return const CustomerHomeShell();
    }
    if (_isDriverRole(normalizedRole)) {
      if (_requiresKycHold(kycStatus)) {
        return DriverKycPendingScreen(status: kycStatus!);
      }
      return const DriverHomeShell();
    }
    return const MobileRoleHome();
  }

  static String _normalizeRole(String? role) {
    final value = (role ?? '').toString();
    if (value == 'external_driver' ||
        value == 'internal_driver' ||
        value == 'customer') {
      return value;
    }
    if (value == 'driver') {
      return 'internal_driver';
    }
    return value;
  }

  static bool _isDriverRole(String role) {
    return role == 'internal_driver' ||
        role == 'external_driver' ||
        role == 'driver';
  }

  static bool _requiresKycHold(String? kycStatus) {
    switch ((kycStatus ?? '').trim().toLowerCase()) {
      case 'submitted':
      case 'under_review':
      case 'rejected':
      case 'suspended':
        return true;
      default:
        return false;
    }
  }
}
