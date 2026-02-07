import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class StorageServices {
  /// Single secure storage instance
  final FlutterSecureStorage _storage;

  StorageServices(this._storage);

  /// Keys
  static const _isUserNewKey = "is_user_new";
  static const _notificationTimerKey = "is_timer_created";
  static const _notificationAllowedKey = "notification_allowed";
  static const _userIdKey = "user_id";
  static const _userRoleKey = "user_role";
  static const _userNameKey = "user_name";

  // --------------------------------------------------
  // Device First Open
  // --------------------------------------------------

  Future<void> setDeviceOpenedFirst(bool value) async {
    await _storage.write(
      key: _isUserNewKey,
      value: value.toString(),
    );
  }

  Future<bool> getDeviceFirstOpen() async {
    final value = await _storage.read(key: _isUserNewKey);
    return value == null ? true : value == "true";
  }

  // --------------------------------------------------
  // Notification Timer
  // --------------------------------------------------

  Future<void> setNotificationSchedule(bool value) async {
    await _storage.write(
      key: _notificationTimerKey,
      value: value.toString(),
    );
  }

  Future<bool> getNotificationSchedule() async {
    final value = await _storage.read(key: _notificationTimerKey);
    return value == "true";
  }

  // --------------------------------------------------
  // Notification Settings
  // --------------------------------------------------

  Future<void> setNotificationSettings(bool value) async {
    await _storage.write(
      key: _notificationAllowedKey,
      value: value.toString(),
    );
  }

  Future<bool> getNotificationSettings() async {
    final value = await _storage.read(key: _notificationAllowedKey);
    return value == null ? true : value == "true";
  }

  // --------------------------------------------------
  // User Auth
  // --------------------------------------------------

  Future<void> saveUserId(String value) async {
    await _storage.write(key: _userIdKey, value: value);
  }

  Future<String?> getUserId() async {
    return await _storage.read(key: _userIdKey);
  }

  Future<void> saveUserRole(String value) async {
    await _storage.write(key: _userRoleKey, value: value);
  }

  Future<String?> getUserRole() async {
    return await _storage.read(key: _userRoleKey);
  }

  Future<void> saveUserName(String value) async {
    await _storage.write(key: _userNameKey, value: value);
  }

  Future<String?> getUserName() async {
    return await _storage.read(key: _userNameKey);
  }

  Future<void> clearUserAuth() async {
    await _storage.delete(key: _userIdKey);
    await _storage.delete(key: _userRoleKey);
    await _storage.delete(key: _userNameKey);
  }

  /// Nuclear option (logout + wipe everything)
  Future<void> clearAll() async {
    await _storage.deleteAll();
  }
}
