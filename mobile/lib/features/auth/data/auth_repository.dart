import 'package:pos_app/services/api/api_client.dart';
import 'package:pos_app/services/global.dart';

import '../../../services/api/api_client.dart';
import '../../../services/api/api_config.dart';
import '../../../services/api/auth_storage.dart';
import '../domain/auth_user.dart';

class AuthRepository {
  final ApiClient _client;
  final AuthStorage _storage;

  AuthRepository({
    required ApiClient client,
    required AuthStorage storage,
  })  : _storage = storage,
        _client = client;

  Future<AuthUser> login({
    required String username,
    required String password,
  }) async {
    print(".........point break 2......");
    final data = await _client.postJson(
      '/auth/login',
      authed: false,
      body: {
        'username': username,
        'password': password,
      },
    );

    final token = data['token']?.toString();
    final user = data['user'];

    if (token == null || token.isEmpty || user is! Map) {
      throw ApiException(message: 'Invalid login response');
    }

    final authUser = AuthUser.fromJson({
      ...user.map((k, v) => MapEntry(k.toString(), v)),
      'token': token,
    });

    await _storage.saveToken(token);
    await _storage.saveUser(authUser.toJson());
    await Global.storageServices.setDeviceOpenedFirst(false);
    print(".........point break 4(user data)  - > ${authUser.role} .........");
    return authUser;
  }

  Future<AuthUser?> readSavedUser() async {
    final user = await _storage.readUser();
    if (user == null) return null;
    return AuthUser.fromJson(user);
  }

  Future<void> logout() async {
    await _storage.clear();
  }
}
