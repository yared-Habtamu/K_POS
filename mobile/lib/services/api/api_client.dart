import 'dart:convert';

import 'package:http/http.dart' as http;

import 'auth_storage.dart';

class ApiException implements Exception {
  final int? statusCode;
  final String message;

  ApiException({required this.message, this.statusCode});

  @override
  String toString() => 'ApiException($statusCode): $message';
}

class ApiClient {
  final String baseUrl;
  final AuthStorage authStorage;
  final http.Client _http;

  ApiClient({
    required this.baseUrl,
    required this.authStorage,
    http.Client? httpClient,
  }) : _http = httpClient ?? http.Client();

  Uri _uri(String path) {
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return Uri.parse(path);
    }
    if (path.startsWith('/')) return Uri.parse('$baseUrl$path');
    return Uri.parse('$baseUrl/$path');
  }

  Future<Map<String, String>> _headers({bool authed = true}) async {
    final headers = <String, String>{
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (authed) {
      final token = await authStorage.readToken();
      if (token != null && token.isNotEmpty) {
        headers['Authorization'] = 'Bearer $token';
      }
    }
    return headers;
  }

  Future<Map<String, dynamic>> postJson(
    String path, {
    Map<String, dynamic>? body,
    bool authed = true,
  }) async {
    print(".........point break 3(the api path - > ${_uri(path)}......");
    final res = await _http.post(
      _uri(path),
      headers: await _headers(authed: authed),
      body: jsonEncode(body ?? {}),
    );
    return _decode(res);
  }

  /// Send a multipart/form-data POST request. Useful for file uploads
  /// (e.g., product image upload). `fileField` is the form field name
  /// expected by the backend (default: 'image').
  Future<Map<String, dynamic>> postMultipart(
    String path, {
    Map<String, String>? fields,
    String fileField = 'image',
    List<int>? fileBytes,
    String? filename,
    bool authed = true,
  }) async {
    final uri = _uri(path);
    final headers = await _headers(authed: authed);
    // Multipart request must NOT include explicit Content-Type header
    headers.remove('Content-Type');

    final req = http.MultipartRequest('POST', uri);
    req.headers.addAll(headers);

    if (fields != null) req.fields.addAll(fields);

    if (fileBytes != null && filename != null) {
      final part = http.MultipartFile.fromBytes(fileField, fileBytes,
          filename: filename);
      req.files.add(part);
    }

    final streamed = await req.send();
    final res = await http.Response.fromStream(streamed);
    return _decode(res);
  }

  /// Multipart PUT request, mirrors postMultipart.
  Future<Map<String, dynamic>> putMultipart(
    String path, {
    Map<String, String>? fields,
    String fileField = 'image',
    List<int>? fileBytes,
    String? filename,
    bool authed = true,
  }) async {
    final uri = _uri(path);
    final headers = await _headers(authed: authed);
    headers.remove('Content-Type');

    final req = http.MultipartRequest('PUT', uri);
    req.headers.addAll(headers);
    if (fields != null) req.fields.addAll(fields);

    if (fileBytes != null && filename != null) {
      final part = http.MultipartFile.fromBytes(fileField, fileBytes,
          filename: filename);
      req.files.add(part);
    }

    final streamed = await req.send();
    final res = await http.Response.fromStream(streamed);
    return _decode(res);
  }

  Future<Map<String, dynamic>> getJson(
    String path, {
    bool authed = true,
  }) async {
    print("...point break 2 ....");
    final res = await _http.get(
      _uri(path),
      headers: await _headers(authed: authed),
    );
    print("...point break 3(after success....");
    return _decode(res);
  }

  Future<Map<String, dynamic>> deleteJson(
    String path, {
    bool authed = true,
  }) async {
    final res = await _http.delete(
      _uri(path),
      headers: await _headers(authed: authed),
    );
    return _decode(res);
  }

  Map<String, dynamic> _decode(http.Response res) {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      if (res.body.isEmpty) return <String, dynamic>{};
      final decoded = jsonDecode(res.body);
      if (decoded is Map<String, dynamic>) return decoded;
      return <String, dynamic>{'data': decoded};
    }

    // Try to extract a helpful error message from the response body.
    try {
      final decoded = jsonDecode(res.body);
      if (decoded is Map<String, dynamic>) {
        final msg =
            decoded['message']?.toString() ?? decoded['error']?.toString();
        throw ApiException(
            statusCode: res.statusCode, message: msg ?? 'Request failed');
      }
      throw ApiException(
          statusCode: res.statusCode,
          message:
              res.body.isNotEmpty ? res.body.toString() : 'Request failed');
    } catch (e) {
      // If body isn't JSON, include raw body text for easier debugging.
      final bodyText = res.body;
      throw ApiException(
          statusCode: res.statusCode,
          message: bodyText.isNotEmpty ? bodyText : 'Request failed');
    }
  }
}
