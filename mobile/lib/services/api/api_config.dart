class ApiConfig {
  // 🔥 Single backend URL (used everywhere: web, mobile, desktop)
  static const String baseUrl = 'https://pos-yjx9.onrender.com';

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
