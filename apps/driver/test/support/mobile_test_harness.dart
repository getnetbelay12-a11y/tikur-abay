import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:tikur_abay_driver/services/driver_api.dart';
import 'package:tikur_abay_driver/services/document_focus_session.dart';
import 'package:tikur_abay_driver/services/document_upload_service.dart';

void setupMobileWidgetTestHarness() {
  late HttpOverrides? previousOverrides;

  setUpAll(() {
    previousOverrides = HttpOverrides.current;
    HttpOverrides.global = TestHttpOverrides();
  });

  setUp(() {
    SharedPreferences.setMockInitialValues({});
    MockHttpRegistry.clear();
    DriverSession.accessToken = null;
    DriverSession.refreshToken = null;
    DriverSession.user = null;
    DocumentFocusSession.clear(customer: true);
    DocumentFocusSession.clear(customer: false);
    DocumentUploadService.clearOverrides();
  });

  tearDownAll(() {
    HttpOverrides.global = previousOverrides;
  });
}

class MockHttpRegistry {
  static final Map<String, MockHttpResponse Function(CapturedRequest request)>
      _handlers = {};

  static void clear() => _handlers.clear();

  static void setJson(
    String method,
    String path,
    Object? body, {
    int statusCode = 200,
  }) {
    _handlers[_key(method, path)] = (_) => MockHttpResponse(
          statusCode: statusCode,
          body: jsonEncode(body),
        );
  }

  static MockHttpResponse resolve(
    String method,
    Uri url,
    String body,
  ) {
    final handler = _handlers[_key(method, _pathWithQuery(url))];
    if (handler != null) {
      return handler(CapturedRequest(method: method, url: url, body: body));
    }
    return const MockHttpResponse(statusCode: 200, body: '{}');
  }

  static String _key(String method, String path) =>
      '${method.toUpperCase()} $path';

  static String _pathWithQuery(Uri url) =>
      '${url.path}${url.hasQuery ? '?${url.query}' : ''}';
}

class CapturedRequest {
  const CapturedRequest({
    required this.method,
    required this.url,
    required this.body,
  });

  final String method;
  final Uri url;
  final String body;
}

class MockHttpResponse {
  const MockHttpResponse({
    required this.statusCode,
    required this.body,
  });

  final int statusCode;
  final String body;
}

class TestHttpOverrides extends HttpOverrides {
  @override
  HttpClient createHttpClient(SecurityContext? context) => TestHttpClient();
}

class TestHttpClient implements HttpClient {
  @override
  Future<HttpClientRequest> getUrl(Uri url) async =>
      TestHttpClientRequest(method: 'GET', url: url);

  @override
  Future<HttpClientRequest> postUrl(Uri url) async =>
      TestHttpClientRequest(method: 'POST', url: url);

  @override
  Future<HttpClientRequest> openUrl(String method, Uri url) async =>
      TestHttpClientRequest(method: method, url: url);

  @override
  void close({bool force = false}) {}

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class TestHttpClientRequest implements HttpClientRequest {
  TestHttpClientRequest({
    required this.method,
    required this.url,
  });

  @override
  final String method;
  final Uri url;
  final StringBuffer _buffer = StringBuffer();

  @override
  final HttpHeaders headers = TestHttpHeaders();

  @override
  void write(Object? obj) {
    if (obj != null) {
      _buffer.write(obj);
    }
  }

  @override
  Future<HttpClientResponse> close() async {
    final response = MockHttpRegistry.resolve(method, url, _buffer.toString());
    return TestHttpClientResponse(response);
  }

  @override
  Encoding get encoding => utf8;

  @override
  set encoding(Encoding encoding) {}

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class TestHttpHeaders implements HttpHeaders {
  @override
  ContentType? contentType;

  @override
  void set(String name, Object value, {bool preserveHeaderCase = false}) {}

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class TestHttpClientResponse extends Stream<List<int>>
    implements HttpClientResponse {
  TestHttpClientResponse(this._response);

  final MockHttpResponse _response;

  @override
  int get statusCode => _response.statusCode;

  @override
  int get contentLength => utf8.encode(_response.body).length;

  @override
  HttpHeaders get headers => TestHttpHeaders();

  @override
  bool get isRedirect => false;

  @override
  X509Certificate? get certificate => null;

  @override
  HttpConnectionInfo? get connectionInfo => null;

  @override
  List<Cookie> get cookies => const [];

  @override
  Future<Socket> detachSocket() {
    throw UnimplementedError();
  }

  @override
  List<RedirectInfo> get redirects => const [];

  @override
  String get reasonPhrase => 'OK';

  @override
  Future<HttpClientResponse> redirect(
          [String? method, Uri? url, bool? followLoops]) async =>
      this;

  @override
  bool get persistentConnection => false;

  @override
  StreamSubscription<List<int>> listen(
    void Function(List<int> event)? onData, {
    Function? onError,
    void Function()? onDone,
    bool? cancelOnError,
  }) {
    return Stream<List<int>>.fromIterable([utf8.encode(_response.body)]).listen(
      onData,
      onError: onError,
      onDone: onDone,
      cancelOnError: cancelOnError,
    );
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}
