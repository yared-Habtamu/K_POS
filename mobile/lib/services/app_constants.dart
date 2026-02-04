import 'api/api_config.dart';

class AppConstants {
  static const String IsUserNew = 'Is_User_New';
  static const String USER_NAME = 'NAME';
  static const String USER_EMAIL = 'EMAIL';
  static const String USER_DATA = 'user_data';
  static const String UserId = 'uid';
  static const String UserRole = 'user_role';
  // Backend API base URL. Use ApiConfig to select the correct
  // URL per platform (web vs emulator/device).
  static String get baseUrl => ApiConfig.baseUrl;
}
