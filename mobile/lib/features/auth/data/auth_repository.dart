import '../../../services/api/api_client.dart';
import '../../../services/api/api_config.dart';
import '../../../services/api/auth_storage.dart';
import '../domain/auth_user.dart';

class AuthRepository {
  final ApiClient _client;
  final AuthStorage _storage;

  AuthRepository({ApiClient? client, AuthStorage? storage})
      : _storage = storage ?? AuthStorage(),
        _client = client ??
            ApiClient(
              baseUrl: ApiConfig.baseUrl,
              authStorage: storage ?? AuthStorage(),
            );

  Future<AuthUser> login(
      {required String username, required String password}) async {
    final data = await _client.postJson(
      '${ApiConfig.apiPrefix}/auth/login',
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
