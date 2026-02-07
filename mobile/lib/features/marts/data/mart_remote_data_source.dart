import '../../../services/api/api_client.dart';
import '../../../services/api/api_config.dart';
import '../../../services/api/auth_storage.dart';

class MartRemoteDataSource {
  final ApiClient _client;

  MartRemoteDataSource({ApiClient? client, AuthStorage? storage})
      : _client = client ??
            ApiClient(
              baseUrl: ApiConfig.baseUrl,
              authStorage: storage ?? AuthStorage(),
            );

  Future<Map<String, dynamic>> getMart(String martId) async {
    final res = await _client.getJson(
      '${ApiConfig.apiPrefix}/marts/$martId',
      authed: true,
    );
    final data = res['data'] ?? res;
    return Map<String, dynamic>.from(data as Map);
  }

  Future<Map<String, dynamic>> updateMart(String martId,
      {Map<String, dynamic>? updates}) async {
    final res = await _client.putJson(
      '${ApiConfig.apiPrefix}/marts/$martId',
      body: updates ?? <String, dynamic>{},
      authed: true,
    );
    final data = res['data'] ?? res;
    return Map<String, dynamic>.from(data as Map);
  }
}
