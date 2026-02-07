import 'package:flutter/material.dart';
import '../features/auth/domain/auth_user.dart';
import '../services/api/auth_storage.dart';

class UserProvider extends ChangeNotifier {
  final AuthStorage _storage;

  UserProvider({
    required AuthStorage storage,
  }) : _storage = storage;

  AuthUser? _user;
  bool _isLoading = false;

  AuthUser? get user => _user;

  bool get isLoggedIn => _user != null;

  String? get token => _user?.token;

  String? get martId => _user?.martId;

  String? get role => _user?.role;

  bool get isLoading => _isLoading;

  // --------------------------------------------------
  // 🔥 AUTO LOAD (ONLY WHEN NEEDED)
  // --------------------------------------------------

  Future<AuthUser?> ensureUserLoaded() async {
    /// Already loaded → return immediately
    if (_user != null) return _user;

    /// Prevent parallel loads
    if (_isLoading) return null;

    _isLoading = true;

    try {
      final savedUserJson = await _storage.readUser();

      if (savedUserJson != null) {
        _user = AuthUser.fromJson(savedUserJson);
        notifyListeners();
      }

      return _user;
    } catch (e) {
      debugPrint("User load error: $e");
      return null;
    } finally {
      _isLoading = false;
    }
  }

  // --------------------------------------------------
  // LOGIN
  // --------------------------------------------------

  Future<void> setUser(AuthUser user) async {
    _user = user;

    await _storage.saveUser(user.toJson());
    await _storage.saveToken(user.token);

    notifyListeners();
  }

  // --------------------------------------------------
  // LOGOUT
  // --------------------------------------------------

  Future<void> logout() async {
    _user = null;

    await _storage.clear();

    notifyListeners();
  }
}
