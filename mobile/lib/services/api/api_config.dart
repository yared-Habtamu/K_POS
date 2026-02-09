import 'package:flutter/foundation.dart';

class ApiConfig {
  static String get baseUrl {
    // Production backend
    const prodUrl = 'https://pos-yjx9.onrender.com';

    // Web should hit production backend
    if (kIsWeb) return prodUrl;

    // Allow overriding via build-time define
    const overridden =
        String.fromEnvironment('API_BASE_URL', defaultValue: '');
    if (overridden.isNotEmpty) return overridden;

    // Android emulator maps host machine localhost to 10.0.2.2
    if (defaultTargetPlatform == TargetPlatform.android) {
      return 'http://10.0.2.2:4000';
    }

    // Desktop / iOS local backend
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
