import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class AuthStorage {
  static const _tokenKey = 'auth_token';
  static const _userKey = 'auth_user';

  final FlutterSecureStorage _secureStorage;

  AuthStorage({FlutterSecureStorage? secureStorage})
      : _secureStorage = secureStorage ?? const FlutterSecureStorage();

  Future<void> saveToken(String token) async {
    await _secureStorage.write(key: _tokenKey, value: token);
  }

  Future<String?> readToken() async {
    return _secureStorage.read(key: _tokenKey);
  }

  Future<void> saveUser(Map<String, dynamic> userJson) async {
    await _secureStorage.write(key: _userKey, value: jsonEncode(userJson));
  }

  Future<Map<String, dynamic>?> readUser() async {
    final raw = await _secureStorage.read(key: _userKey);
    if (raw == null || raw.isEmpty) return null;
    return jsonDecode(raw) as Map<String, dynamic>;
  }

  Future<void> clear() async {
    await _secureStorage.delete(key: _tokenKey);
    await _secureStorage.delete(key: _userKey);
  }
}
