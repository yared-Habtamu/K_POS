import 'package:flutter/cupertino.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../features/auth/domain/user_model.dart';
import 'app_constants.dart';
import 'global.dart'; // Ensure this points to your Firebase UserM

class UserProvider extends ChangeNotifier {
  static final UserProvider _instance = UserProvider._internal();

  factory UserProvider() => _instance;

  UserProvider._internal();

  UserM? _user;
  bool _isLoading = false;
  String _selectedAvatarPath = "assets/avatars/male_avatar2.png";

  UserM? get user => _user;

  bool get isLoading => _isLoading;

  String get avatarPath => _selectedAvatarPath;

  /// ----------------------------------------------------------------
  /// INITIALIZATION
  /// ----------------------------------------------------------------

  Future<bool> initUser() async {
    _setLoading(true);

    try {
      final prefs = Global.storageServices;
      // 2. Get UUID from Local Storage
      final String uuid = prefs.getUserId();

      print("......getting current user data user id is: $uuid....");
      if (uuid.isEmpty) {
        _setLoading(false);
        return false;
      }

      // 3. Fetch User Data from datastore using UUID
      print("......getting current user data user data is:....");
      final user = "";
      if (user.isNotEmpty) {
        print("......getting current user data  is: ${_user?.username}....");
        notifyListeners();
        _setLoading(false);
        return true;
      } else {
        // User document not found in Firestore
        await logout();
        _setLoading(false);
        return false;
      }
    } catch (e) {
      debugPrint("UserProvider Error: $e");
      _setLoading(false);
      return false;
    }
  }

  /// ----------------------------------------------------------------
  /// STATE MODIFIERS
  /// ----------------------------------------------------------------

  Future<String?> getUuid() async {
    final id = Global.storageServices.getUserId();
    if (id.isEmpty) return null;
    return id;
  }

  Future<String?> getRole() async {
    final role = Global.storageServices.getUserRole();
    if (role.isEmpty) return null;
    return role;
  }

  Future<void> updateLocalAvatar(String assetPath) async {
    _selectedAvatarPath = assetPath;
    notifyListeners();

    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('user_local_avatar_path', assetPath);
  }

  Future<void> refreshUser() async {
    await initUser();
  }

  Future<void> logout() async {
    _user = null;
    _selectedAvatarPath = "assets/avatars/male_avatar2.png";

    // 1. Clear Local Storage
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(AppConstants.UserId);
    await prefs.remove(AppConstants.UserRole);

    // 2. Firebase Sign Out
    // await _auth.signOut();

    notifyListeners();
  }

  void _setLoading(bool value) {
    _isLoading = value;
    notifyListeners();
  }
}
