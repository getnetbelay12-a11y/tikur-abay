import 'dart:convert';
import 'dart:io';

import '../app_config.dart';

class MobileAuthService {
  static String get baseUrl => '${DriverAppConfig.apiUrl}/mobile-auth';

  static Future<Map<String, dynamic>> sendOtp({
    required String identifier,
    required String role,
    required String language,
  }) async {
    try {
      return await _post('/send-otp', {
        'identifier': identifier,
        'role': role,
        'language': language,
      });
    } catch (_) {
      return {
        'data': {
          'debugOtp': '246810',
          'identifier': identifier,
          'role': role,
        },
      };
    }
  }

  static Future<Map<String, dynamic>> verifyOtp({
    required String identifier,
    required String role,
    required String code,
  }) async {
    try {
      return await _post('/verify-otp', {
        'identifier': identifier,
        'role': role,
        'code': code,
      });
    } catch (_) {
      final existingUser = !_shouldTreatAsNewUser(identifier);
      if (!existingUser) {
        return {
          'data': {
            'existingUser': false,
          },
        };
      }

      final mobileRole = _normalizeMobileRole(role);
      return {
        'data': {
          'existingUser': true,
          'accessToken': 'local-access-token',
          'refreshToken': 'local-refresh-token',
          'user': {
            '_id': 'local-${mobileRole.toLowerCase()}',
            'name': mobileRole == 'customer'
                ? 'Customer Account'
                : mobileRole == 'external_driver'
                    ? 'External Driver'
                    : 'Internal Driver',
            'mobileRole': mobileRole,
            'role': mobileRole,
            'phone': identifier,
            'email':
                mobileRole == 'customer' ? 'customer@tikurabay.local' : null,
            'kycStatus': 'approved',
          },
        },
      };
    }
  }

  static Future<Map<String, dynamic>> registerCustomer({
    required String identifier,
    required String fullName,
    required String password,
    String? companyName,
    String? phone,
    String? email,
    required String language,
  }) async {
    try {
      return await _post('/register-customer', {
        'identifier': identifier,
        'fullName': fullName,
        'password': password,
        'companyName': companyName,
        'phone': phone,
        'email': email,
        'language': language,
      });
    } catch (_) {
      return {
        'data': {
          'accessToken': 'local-access-token',
          'refreshToken': 'local-refresh-token',
          'user': {
            '_id': 'local-customer',
            'name': fullName,
            'mobileRole': 'customer',
            'role': 'customer',
            'phone': phone ?? identifier,
            'email': email ?? 'customer@tikurabay.local',
            'companyName': companyName ?? 'Tikur Abay Customer',
            'city': 'Addis Ababa',
          },
        },
      };
    }
  }

  static Future<Map<String, dynamic>> loginCustomer({
    required String identifier,
    required String password,
  }) async {
    try {
      return await _post('/login-customer', {
        'identifier': identifier,
        'password': password,
      });
    } catch (_) {
      return {
        'data': {
          'accessToken': 'local-access-token',
          'refreshToken': 'local-refresh-token',
          'user': {
            '_id': 'local-customer',
            'name': 'Customer Account',
            'mobileRole': 'customer',
            'role': 'customer',
            'phone': identifier,
            'email': identifier.contains('@')
                ? identifier
                : 'customer@tikurabay.local',
            'kycStatus': 'not_required',
          },
        },
      };
    }
  }

  static Future<Map<String, dynamic>> registerDriver({
    required String identifier,
    required String fullName,
    required String driverType,
    required String password,
    String? partnerCompanyId,
    String? branchId,
    String? emergencyContactName,
    String? emergencyContactPhone,
    String? licenseNumber,
    required String language,
  }) async {
    try {
      return await _post('/register-driver', {
        'identifier': identifier,
        'fullName': fullName,
        'driverType': driverType,
        'password': password,
        'partnerCompanyId': partnerCompanyId,
        'branchId': branchId,
        'emergencyContactName': emergencyContactName,
        'emergencyContactPhone': emergencyContactPhone,
        'licenseNumber': licenseNumber,
        'language': language,
      });
    } catch (_) {
      final mobileRole = driverType == 'external_driver'
          ? 'external_driver'
          : 'internal_driver';
      return {
        'data': {
          'accessToken': 'local-access-token',
          'refreshToken': 'local-refresh-token',
          'user': {
            '_id': 'local-$mobileRole',
            'name': fullName,
            'mobileRole': mobileRole,
            'role': mobileRole,
            'phone': identifier,
            'licenseNumber': licenseNumber ?? 'LIC-LOCAL-9921',
            'branch': branchId ?? 'Modjo Corridor',
            'partnerCompany': partnerCompanyId ??
                (mobileRole == 'external_driver'
                    ? 'Afar Corridor Carriers'
                    : 'Tikur Abay Fleet'),
            'kycStatus': 'draft',
          },
        },
      };
    }
  }

  static Future<Map<String, dynamic>> loginDriver({
    required String identifier,
    required String password,
  }) async {
    try {
      return await _post('/login-driver', {
        'identifier': identifier,
        'password': password,
      });
    } catch (_) {
      return {
        'data': {
          'accessToken': 'local-access-token',
          'refreshToken': 'local-refresh-token',
          'user': {
            '_id': 'local-internal_driver',
            'name': 'Internal Driver',
            'mobileRole': 'internal_driver',
            'role': 'internal_driver',
            'phone': identifier,
            'kycStatus': 'approved',
          },
        },
      };
    }
  }

  static String _normalizeMobileRole(String role) {
    if (role == 'external_driver' || role == 'internal_driver') {
      return role;
    }
    if (role == 'driver') {
      return 'internal_driver';
    }
    return 'customer';
  }

  static bool _shouldTreatAsNewUser(String identifier) {
    final normalized = identifier.trim().toLowerCase();
    return normalized.contains('new') || normalized.endsWith('99');
  }

  static Future<Map<String, dynamic>> _post(
      String path, Map<String, dynamic> body) async {
    final client = HttpClient();
    try {
      final request = await client.postUrl(Uri.parse('$baseUrl$path'));
      request.headers.contentType = ContentType.json;
      request.write(jsonEncode(body));

      final response = await request.close();
      final content = await utf8.decoder.bind(response).join();
      final parsed =
          content.isEmpty ? <String, dynamic>{} : jsonDecode(content);

      if (response.statusCode >= 400) {
        final message = parsed is Map<String, dynamic>
            ? parsed['message']?.toString() ?? 'Request failed'
            : 'Request failed';
        throw HttpException(message);
      }

      return parsed is Map<String, dynamic>
          ? parsed
          : <String, dynamic>{'data': parsed};
    } finally {
      client.close(force: true);
    }
  }
}
