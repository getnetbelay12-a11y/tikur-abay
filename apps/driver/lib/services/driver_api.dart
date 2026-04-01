import 'dart:convert';
import 'dart:io';
import 'dart:async';

import 'package:shared_preferences/shared_preferences.dart';

import '../app_config.dart';
import 'realtime_service.dart';

class DriverSession {
  static String? accessToken;
  static String? refreshToken;
  static Map<String, dynamic>? user;
}

class DriverApi {
  static const String _baseUrl = DriverAppConfig.apiUrl;
  static final _baseUrlCandidates = _buildBaseUrlCandidates();
  static const String _lastDriverIdentifierKey =
      'tikur_abay_last_driver_identifier';
  static const String _fixedE2eDriverPhone = '+251900000015';
  static String get baseUrl => _baseUrl;
  static Future<void>? _refreshInFlight;

  static List<String> _buildBaseUrlCandidates() {
    final unique = <String>[];
    for (final value in [
      _baseUrl,
      'http://localhost:6012/api/v1',
      'http://127.0.0.1:6012/api/v1',
      'http://[::1]:6012/api/v1',
    ]) {
      if (!unique.contains(value)) {
        unique.add(value);
      }
    }
    return List<String>.unmodifiable(unique);
  }

  static Future<void> hydrateSession() async {
    final prefs = await SharedPreferences.getInstance();
    DriverSession.accessToken = prefs.getString('tikur_abay_access_token');
    DriverSession.refreshToken = prefs.getString('tikur_abay_refresh_token');
    final rawUser = prefs.getString('tikur_abay_user');
    if (rawUser != null && rawUser.isNotEmpty) {
      try {
        DriverSession.user = jsonDecode(rawUser) as Map<String, dynamic>;
      } catch (_) {
        DriverSession.user = null;
      }
    }
  }

  static Future<void> persistSession({
    required String? accessToken,
    required String? refreshToken,
    required Map<String, dynamic>? user,
  }) async {
    DriverSession.accessToken = accessToken;
    DriverSession.refreshToken = refreshToken;
    DriverSession.user = user;

    final prefs = await SharedPreferences.getInstance();
    if (accessToken == null || accessToken.isEmpty) {
      await prefs.remove('tikur_abay_access_token');
    } else {
      await prefs.setString('tikur_abay_access_token', accessToken);
    }
    if (refreshToken == null || refreshToken.isEmpty) {
      await prefs.remove('tikur_abay_refresh_token');
    } else {
      await prefs.setString('tikur_abay_refresh_token', refreshToken);
    }
    if (user == null) {
      await prefs.remove('tikur_abay_user');
    } else {
      await prefs.setString('tikur_abay_user', jsonEncode(user));
      final mobileRole = (user['mobileRole'] ?? user['role'] ?? '').toString();
      final phone = user['phone']?.toString();
      if ((mobileRole == 'internal_driver' ||
              mobileRole == 'external_driver') &&
          phone != null &&
          phone.isNotEmpty) {
        await prefs.setString(_lastDriverIdentifierKey, phone);
      }
    }
  }

  static Future<String?> lastDriverIdentifier() async {
    final prefs = await SharedPreferences.getInstance();
    final stored = prefs.getString(_lastDriverIdentifierKey);
    if (stored == null || stored.isEmpty || stored != _fixedE2eDriverPhone) {
      await prefs.setString(_lastDriverIdentifierKey, _fixedE2eDriverPhone);
      return _fixedE2eDriverPhone;
    }
    return stored;
  }

  static String _tripClosureStateKey(String tripId) =>
      'tikur_abay_trip_closure_state:$tripId';

  static Future<Map<String, dynamic>> readTripClosureState(
      String tripId) async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_tripClosureStateKey(tripId));
    if (raw == null || raw.isEmpty) return const <String, dynamic>{};
    try {
      final parsed = jsonDecode(raw);
      return parsed is Map<String, dynamic>
          ? parsed
          : const <String, dynamic>{};
    } catch (_) {
      return const <String, dynamic>{};
    }
  }

  static Future<void> writeTripClosureState(
    String tripId,
    Map<String, dynamic> state,
  ) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_tripClosureStateKey(tripId), jsonEncode(state));
  }

  static Future<void> logout() async {
    final refreshToken = DriverSession.refreshToken;
    try {
      if (refreshToken != null && refreshToken.isNotEmpty) {
        await _request(
          'POST',
          '/auth/logout',
          body: {'refreshToken': refreshToken},
          withAuth: false,
          allowRefreshRetry: false,
        );
      }
    } catch (_) {
      // best effort
    } finally {
      DriverRealtimeService.instance.disconnect();
      await persistSession(accessToken: null, refreshToken: null, user: null);
    }
  }

  static Future<Map<String, dynamic>> login({
    required String email,
    required String password,
  }) async {
    final result = await _request(
      'POST',
      '/auth/login',
      body: {'email': email, 'password': password},
      withAuth: false,
    );
    await persistSession(
      accessToken: result['accessToken'] as String?,
      refreshToken: result['refreshToken'] as String?,
      user: result['user'] as Map<String, dynamic>?,
    );
    return result;
  }

  static Future<Map<String, dynamic>> register(
      Map<String, dynamic> body) async {
    final result =
        await _request('POST', '/auth/register', body: body, withAuth: false);
    await persistSession(
      accessToken: result['accessToken'] as String?,
      refreshToken: result['refreshToken'] as String?,
      user: result['user'] as Map<String, dynamic>?,
    );
    return result;
  }

  static Future<Map<String, dynamic>?> fetchMe() async {
    final me = await _map('/auth/me');
    if (me != null) {
      await persistSession(
        accessToken: DriverSession.accessToken,
        refreshToken: DriverSession.refreshToken,
        user: me,
      );
    }
    return me;
  }

  static Future<Map<String, dynamic>?> fetchPreferences() async =>
      _map('/me/preferences');
  static Future<Map<String, dynamic>> updateLanguagePreference(
          String language) async =>
      _request('PATCH', '/me/preferences/language',
          body: {'language': language});

  static Future<List<dynamic>> fetchTrips() async => _list('/trips');
  static Future<Map<String, dynamic>?> fetchCustomerWorkspace() async =>
      _map('/customer/workspace');
  static Future<Map<String, dynamic>?> fetchCorridorCustomerPortal() async =>
      _map('/corridor/customer-portal');
  static Future<Map<String, dynamic>?> fetchCorridorShipment(
    String shipmentRef,
  ) async =>
      _map('/corridor/shipments/$shipmentRef');
  static Future<Map<String, dynamic>?> fetchCorridorDriverTransitPack() async =>
      _map('/corridor/driver/transit-pack');
  static Future<Map<String, dynamic>?> fetchImportSettlementWorkspace(
    String shipmentIdOrRef,
  ) async =>
      _map(
        '/import-settlement/shipments/${Uri.encodeComponent(shipmentIdOrRef)}/workspace',
      );
  static Future<List<dynamic>> fetchImportSettlementQueue({
    String? financeStatus,
    String? releaseStatus,
  }) async {
    final params = <String, String>{};
    if (financeStatus != null && financeStatus.isNotEmpty) {
      params['financeStatus'] = financeStatus;
    }
    if (releaseStatus != null && releaseStatus.isNotEmpty) {
      params['releaseStatus'] = releaseStatus;
    }
    final query = params.isEmpty
        ? ''
        : '?${params.entries.map((entry) => '${Uri.encodeQueryComponent(entry.key)}=${Uri.encodeQueryComponent(entry.value)}').join('&')}';
    return _list('/import-settlement/shipments/queue$query');
  }

  static Future<Map<String, dynamic>> createDriverExpenseClaim(
    String shipmentIdOrRef,
    Map<String, dynamic> body,
  ) async =>
      _request(
        'POST',
        '/import-settlement/shipments/${Uri.encodeComponent(shipmentIdOrRef)}/driver-expense-claims',
        body: body,
      );
  static Future<List<dynamic>> fetchMyBookings() async => _list('/bookings/my');
  static Future<Map<String, dynamic>> createBooking(
          Map<String, dynamic> body) async =>
      _request('POST', '/bookings', body: body);
  static Future<List<dynamic>> fetchAvailableFleet() async =>
      _list('/fleet/available');
  static Future<Map<String, dynamic>> requestQuote(
          Map<String, dynamic> body) async =>
      _request('POST', '/quotes/request', body: body);
  static Future<List<dynamic>> fetchMyQuotes() async => _list('/quotes/my');
  static Future<List<dynamic>> fetchMyAgreements() async =>
      _list('/agreements/my');
  static Future<Map<String, dynamic>> signAgreement(
          String id, Map<String, dynamic> body) async =>
      _request('POST', '/agreements/$id/sign', body: body);
  static Future<Map<String, dynamic>?> fetchTrip(String id) async =>
      _map('/trips/$id');
  static Future<List<dynamic>> fetchTripEvents(String id) async =>
      _list('/trips/$id/events');
  static Future<Map<String, dynamic>> updateTripStatus(
          String id, String status) async =>
      _request('PATCH', '/trips/$id/status', body: {'status': status});
  static Future<Map<String, dynamic>> submitCorridorCheckpointUpdate({
    required String tripId,
    required String location,
    required String status,
    required bool sealIntact,
    String? note,
  }) async =>
      _request(
        'POST',
        '/trips/$tripId/checkpoint-update',
        body: {
          'location': location,
          'status': status,
          'sealIntact': sealIntact,
          if (note != null && note.isNotEmpty) 'note': note,
        },
      );

  static Future<Map<String, dynamic>> performCorridorTripAction({
    required String tripId,
    required String action,
    Map<String, dynamic>? body,
  }) async =>
      _request(
        'POST',
        '/trips/$tripId/actions/$action',
        body: body ?? const <String, dynamic>{},
      );

  static Future<Map<String, dynamic>> submitLiveGpsPoint({
    required String vehicleId,
    String? tripId,
    required double latitude,
    required double longitude,
    double? speed,
    double? heading,
    double? accuracy,
    String source = 'driver_app',
  }) async =>
      _request(
        'POST',
        '/tracking/gps-points',
        body: {
          'vehicleId': vehicleId,
          if (tripId != null && tripId.isNotEmpty) 'tripId': tripId,
          'latitude': latitude,
          'longitude': longitude,
          if (speed != null) 'speed': speed,
          if (heading != null) 'heading': heading,
          if (accuracy != null) 'accuracy': accuracy,
          'source': source,
        },
      );

  static Future<List<dynamic>> fetchReports() async => _list('/driver-reports');
  static Future<Map<String, dynamic>> createReport(
          Map<String, dynamic> body) async =>
      _request('POST', '/driver-reports', body: body);
  static Future<List<dynamic>> fetchActivityLogs() async =>
      _list('/activity-logs');
  static Future<Map<String, dynamic>> createActivityLog(
          Map<String, dynamic> body) async =>
      _request('POST', '/activity-logs', body: body);
  static Future<List<dynamic>> fetchFuelLogs({String? tripId}) async {
    final query = tripId == null || tripId.isEmpty
        ? ''
        : '?tripId=${Uri.encodeQueryComponent(tripId)}';
    return _list('/fuel-logs$query');
  }

  static Future<Map<String, dynamic>> createFuelLog(
          Map<String, dynamic> body) async =>
      _request('POST', '/fuel-logs', body: body);
  static Future<List<dynamic>> fetchIncidentReports() async =>
      _list('/incident-reports');
  static Future<Map<String, dynamic>> createIncidentReport(
          Map<String, dynamic> body) async =>
      _request('POST', '/incident-reports', body: body);

  static Future<List<dynamic>> fetchChatRooms({
    String? shipmentId,
    String? roomType,
  }) async {
    final params = <String, String>{};
    if (shipmentId != null && shipmentId.isNotEmpty) {
      params['shipmentId'] = shipmentId;
    }
    if (roomType != null && roomType.isNotEmpty) {
      params['roomType'] = roomType;
    }
    final query = params.isEmpty
        ? ''
        : '?${params.entries.map((entry) => '${Uri.encodeQueryComponent(entry.key)}=${Uri.encodeQueryComponent(entry.value)}').join('&')}';
    return _list('/chat/rooms$query');
  }

  static Future<Map<String, dynamic>> resolveChatRoom(
    Map<String, dynamic> body,
  ) async => _request('POST', '/chat/rooms/resolve', body: body);

  static Future<Map<String, dynamic>> fetchChatMessages(
    String roomId, {
    int limit = 40,
  }) async {
    final response = await _map('/chat/rooms/$roomId/messages?limit=$limit');
    if (response is Map<String, dynamic>) {
      return response;
    }
    return const <String, dynamic>{'items': <dynamic>[]};
  }

  static Future<Map<String, dynamic>> sendChatMessage(
    String roomId,
    String text,
  ) async =>
      _request('POST', '/chat/rooms/$roomId/messages', body: {'content': text});

  static Future<Map<String, dynamic>> markChatRead(String roomId) async =>
      _request('POST', '/chat/rooms/$roomId/read', body: const {});

  static Future<List<dynamic>> fetchDocuments() async => _list('/documents');
  static Future<List<dynamic>> fetchDocumentPolicy({
    String? entityType,
    bool mobileUploadOnly = false,
  }) async {
    final params = <String, String>{};
    if (entityType != null && entityType.isNotEmpty) {
      params['entityType'] = entityType;
    }
    if (mobileUploadOnly) {
      params['mobileUploadOnly'] = 'true';
    }
    final query = params.isEmpty
        ? ''
        : '?${params.entries.map((entry) => '${Uri.encodeQueryComponent(entry.key)}=${Uri.encodeQueryComponent(entry.value)}').join('&')}';
    return _list('/documents/policy$query');
  }

  static Future<Map<String, dynamic>?> fetchDocumentDownload(String id) async =>
      _map('/documents/$id/download');
  static Future<Map<String, dynamic>> uploadDocument(
          Map<String, dynamic> body) async =>
      _request('POST', '/documents/upload', body: body);

  static Future<List<dynamic>> fetchNotifications() async =>
      _list('/notifications');
  static Future<Map<String, dynamic>> markNotificationRead(String id) async =>
      _request('PATCH', '/notifications/$id/read');
  static Future<List<dynamic>> fetchMyPayments() async => _list('/payments/my');
  static Future<Map<String, dynamic>> payInvoice(
          Map<String, dynamic> body) async =>
      _request('POST', '/payments/pay', body: body);
  static Future<Map<String, dynamic>> createDriverKyc(
          Map<String, dynamic> body) async =>
      _request('POST', '/driver-kyc', body: body);
  static Future<Map<String, dynamic>?> fetchDriverKyc(String id) async =>
      _map('/driver-kyc/$id');
  static Future<Map<String, dynamic>> createAvailabilityReport(
          Map<String, dynamic> body) async =>
      _request('POST', '/availability-reports', body: body);
  static Future<Map<String, dynamic>> createLeaveRequest(
          Map<String, dynamic> body) async =>
      _request('POST', '/leave-requests', body: body);

  static Future<Map<String, dynamic>> _request(
    String method,
    String path, {
    Map<String, dynamic>? body,
    bool withAuth = true,
    bool allowRefreshRetry = true,
  }) async {
    Object? lastError;
    for (final baseUrl in _baseUrlCandidates) {
      final client = HttpClient();
      try {
        final request =
            await client.openUrl(method, Uri.parse('$baseUrl$path'));
        request.headers.contentType = ContentType.json;
        if (withAuth && DriverSession.accessToken != null) {
          request.headers.set(
            HttpHeaders.authorizationHeader,
            'Bearer ${DriverSession.accessToken}',
          );
        }
        if (body != null) {
          request.write(jsonEncode(body));
        }
        final response = await request.close();
        final content = await utf8.decoder.bind(response).join();
        final parsed =
            content.isEmpty ? <String, dynamic>{} : jsonDecode(content);
        if (response.statusCode == 401 && withAuth && allowRefreshRetry) {
          final refreshed = await _tryRefresh();
          if (refreshed) {
            return _request(
              method,
              path,
              body: body,
              withAuth: withAuth,
              allowRefreshRetry: false,
            );
          }
        }
        if (response.statusCode >= 400) {
          final message = parsed is Map<String, dynamic>
              ? (parsed['message']?.toString() ?? 'Request failed')
              : 'Request failed';
          throw HttpException(message);
        }
        return parsed is Map<String, dynamic>
            ? parsed
            : <String, dynamic>{'data': parsed};
      } on SocketException catch (error) {
        lastError = error;
        continue;
      } on HandshakeException catch (error) {
        lastError = error;
        continue;
      } finally {
        client.close(force: true);
      }
    }
    throw HttpException(lastError?.toString() ?? 'Request failed');
  }

  static Future<List<dynamic>> _list(String path) async {
    final result = await _request('GET', path);
    final data = result['data'];
    return data is List ? data : [];
  }

  static Future<Map<String, dynamic>?> _map(String path) async {
    final result = await _request('GET', path);
    if (result.isEmpty) return null;
    return result;
  }

  static Future<bool> _tryRefresh() async {
    if (_refreshInFlight != null) {
      await _refreshInFlight;
      return DriverSession.accessToken != null;
    }

    final refreshToken = DriverSession.refreshToken;
    if (refreshToken == null || refreshToken.isEmpty) {
      await persistSession(accessToken: null, refreshToken: null, user: null);
      DriverRealtimeService.instance.disconnect();
      return false;
    }

    final completer = Completer<void>();
    _refreshInFlight = completer.future;
    try {
      final result = await _request(
        'POST',
        '/auth/refresh-token',
        body: {'refreshToken': refreshToken},
        withAuth: false,
        allowRefreshRetry: false,
      );
      await persistSession(
        accessToken: result['accessToken'] as String?,
        refreshToken: result['refreshToken'] as String?,
        user: result['user'] as Map<String, dynamic>?,
      );
      DriverRealtimeService.instance.reconnect();
      completer.complete();
      return true;
    } catch (_) {
      DriverRealtimeService.instance.disconnect();
      await persistSession(accessToken: null, refreshToken: null, user: null);
      completer.complete();
      return false;
    } finally {
      _refreshInFlight = null;
    }
  }
}
