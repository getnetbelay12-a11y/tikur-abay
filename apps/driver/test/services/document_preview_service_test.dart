import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:tikur_abay_driver/services/document_preview_service.dart';

void main() {
  late HttpOverrides? previousOverrides;

  setUpAll(() {
    previousOverrides = HttpOverrides.current;
    HttpOverrides.global = _PreviewTestHttpOverrides();
  });

  tearDownAll(() {
    HttpOverrides.global = previousOverrides;
  });

  setUp(() {
    _PreviewMockHttpRegistry.clear();
  });

  group('DocumentPreviewService', () {
    test('returns preview metadata when download lookup succeeds', () async {
      _PreviewMockHttpRegistry.setJson(
        'GET',
        '/api/v1/documents/doc-1/download',
        {
          'downloadUrl': 'https://example.com/doc-1.pdf',
          'mimeType': 'application/pdf',
        },
      );

      final result = await DocumentPreviewService.fetchPreview('doc-1');

      expect(result.isSuccess, isTrue);
      expect(result.data?.downloadUrl, 'https://example.com/doc-1.pdf');
      expect(result.data?.mimeType, 'application/pdf');
      expect(result.data?.isPdf, isTrue);
    });

    test('returns backend message when download lookup fails', () async {
      _PreviewMockHttpRegistry.setJson(
        'GET',
        '/api/v1/documents/doc-2/download',
        {'message': 'Preview unavailable.'},
        statusCode: 500,
      );

      final result = await DocumentPreviewService.fetchPreview('doc-2');

      expect(result.isSuccess, isFalse);
      expect(result.message, 'Preview unavailable.');
    });
  });
}

class _PreviewMockHttpRegistry {
  static final Map<String, _PreviewMockHttpResponse> _responses = {};

  static void clear() => _responses.clear();

  static void setJson(
    String method,
    String path,
    Object? body, {
    int statusCode = 200,
  }) {
    _responses[_key(method, path)] = _PreviewMockHttpResponse(
      statusCode: statusCode,
      body: jsonEncode(body),
    );
  }

  static _PreviewMockHttpResponse resolve(String method, Uri url) {
    return _responses[_key(method, _pathWithQuery(url))] ??
        const _PreviewMockHttpResponse(statusCode: 200, body: '{}');
  }

  static String _key(String method, String path) =>
      '${method.toUpperCase()} $path';

  static String _pathWithQuery(Uri url) =>
      '${url.path}${url.hasQuery ? '?${url.query}' : ''}';
}

class _PreviewMockHttpResponse {
  const _PreviewMockHttpResponse({
    required this.statusCode,
    required this.body,
  });

  final int statusCode;
  final String body;
}

class _PreviewTestHttpOverrides extends HttpOverrides {
  @override
  HttpClient createHttpClient(SecurityContext? context) =>
      _PreviewTestHttpClient();
}

class _PreviewTestHttpClient implements HttpClient {
  @override
  Future<HttpClientRequest> getUrl(Uri url) async =>
      _PreviewTestHttpRequest(method: 'GET', url: url);

  @override
  Future<HttpClientRequest> openUrl(String method, Uri url) async =>
      _PreviewTestHttpRequest(method: method, url: url);

  @override
  void close({bool force = false}) {}

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class _PreviewTestHttpRequest implements HttpClientRequest {
  _PreviewTestHttpRequest({
    required this.method,
    required this.url,
  });

  @override
  final String method;

  final Uri url;

  @override
  final HttpHeaders headers = _PreviewTestHttpHeaders();

  @override
  void write(Object? obj) {}

  @override
  Future<HttpClientResponse> close() async {
    final response = _PreviewMockHttpRegistry.resolve(method, url);
    return _PreviewTestHttpResponse(response);
  }

  @override
  Encoding get encoding => utf8;

  @override
  set encoding(Encoding encoding) {}

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class _PreviewTestHttpHeaders implements HttpHeaders {
  @override
  ContentType? contentType;

  @override
  void set(String name, Object value, {bool preserveHeaderCase = false}) {}

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class _PreviewTestHttpResponse extends Stream<List<int>>
    implements HttpClientResponse {
  _PreviewTestHttpResponse(this._response);

  final _PreviewMockHttpResponse _response;

  @override
  int get statusCode => _response.statusCode;

  @override
  int get contentLength => utf8.encode(_response.body).length;

  @override
  HttpHeaders get headers => _PreviewTestHttpHeaders();

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
