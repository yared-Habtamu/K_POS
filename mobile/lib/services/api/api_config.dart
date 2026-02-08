import 'package:flutter/foundation.dart'
    show kIsWeb, defaultTargetPlatform, TargetPlatform;

class ApiConfig {
  // Backend API base URL used by web app defaults to http://localhost:4000
  // For Android emulator use http://10.0.2.2, otherwise localhost.
  // Update this value per environment or override with the
  // --dart-define=API_BASE_URL=<url> build/run flag.
  static String get baseUrl {
    // When running on the web, the browser can reach the backend
    // at http://localhost:4000 (or the host machine IP). Use that
    // instead of the Android emulator's loopback address.
    if (kIsWeb) return 'http://localhost:4000';

    // Allow overriding via build-time define first (empty string means not set)
    const overridden = String.fromEnvironment('API_BASE_URL', defaultValue: '');
    if (overridden.isNotEmpty) return overridden;

    // Defaults based on platform
    if (defaultTargetPlatform == TargetPlatform.android) {
      // Android emulator maps host machine localhost to 10.0.2.2
      return 'http://10.0.2.2:4000';
    }

    return 'http://localhost:4000';
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
