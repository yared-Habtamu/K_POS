import 'package:shared_preferences/shared_preferences.dart';

import 'app_constants.dart';

class StorageServices {
  late SharedPreferences _prefs;

  Future<StorageServices> init() async {
    _prefs = await SharedPreferences.getInstance();
    return this;
  }

  Future<bool> setDeviceOpenedFirst(bool value) async {
    return await _prefs.setBool(AppConstants.IsUserNew, value);
  }

  bool GetDeviceFirstOpen() {
    return _prefs.getBool(AppConstants.IsUserNew) ?? true;
  }

  Future<bool> setNotificationSchedule(String key, bool value) async {
    return await _prefs.setBool(key, value);
  }

  bool getNotificationSchedule() {
    return _prefs.getBool("isTimerCreated") ?? false;
  }

  Future<bool> setNotificationSettings(String key, bool value) async {
    return await _prefs.setBool(key, value);
  }

  bool getNotificationSettings() {
    return _prefs.getBool("notificationAllowed") ?? true;
  }

  Future<void> saveUserData(String key, String value) async {
    await _prefs.setString(key, value);
  }

  Future<void> saveUserId(String value) async {
    await _prefs.setString(AppConstants.UserId, value);
  }

  String getUserId() {
    return _prefs.getString(AppConstants.UserId) ?? "";
  }

  Future<void> saveUserRole(String value) async {
    await _prefs.setString(AppConstants.UserRole, value);
  }

  String getUserRole() {
    return _prefs.getString(AppConstants.UserRole) ?? "";
  }

  String getUserName() {
    return _prefs.getString(AppConstants.USER_NAME) ?? "";
  }

// Future<void> saveUserData(String key, UserData value) async {
//   await _prefs.setString(key, jsonEncode(value.toJson()));
// }

// UserData? getUserData(String key) {
//   String? jsonString = _prefs.getString(key);
//   if (jsonString != null) {
//     return UserData.fromJson(jsonDecode(jsonString));
//   }
//   return null;
// }
}
