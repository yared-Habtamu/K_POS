import 'package:flutter/foundation.dart' show kIsWeb;

class ApiConfig {
  // Backend API base URL used by web app defaults to http://localhost:4000
  // In Flutter/Android emulator, localhost is 10.0.2.2
  // Update this value per environment or override with the
  // --dart-define=API_BASE_URL=<url> build/run flag.
  static String get baseUrl {
    // When running on the web, the browser can reach the backend
    // at http://localhost:4000 (or the host machine IP). Use that
    // instead of the Android emulator's 10.0.2.2 address.
    if (kIsWeb) return 'http://localhost:4000';

    // For non-web targets, allow overriding via build-time define,
    // default to Android emulator loopback which maps to host machine.
    return const String.fromEnvironment(
      'API_BASE_URL',
      defaultValue: 'http://localhost:4000',
    );
  }

  static const String apiPrefix = '/api';

  static String url(String path) {
    if (path.startsWith('/')) return '$baseUrl$path';
    return '$baseUrl/$path';
  }

  static String apiUrl(String path) {
    final p = path.startsWith('/') ? path : '/$path';
    return '$baseUrl$apiPrefix$p';
  }
}
