import 'package:pos_app/services/api/api_client.dart';
import 'package:pos_app/services/api/api_config.dart';
import 'package:pos_app/services/api/auth_storage.dart';

class CustomersRepository {
  Future<List<dynamic>> fetchCustomers() async {
    final auth = AuthStorage();
    final user = await auth.readUser();
    final martId = user?['martId'];

    final client = ApiClient(baseUrl: ApiConfig.baseUrl, authStorage: auth);
    final q = martId != null ? '?martId=$martId' : '';
    final res = await client.getJson('${ApiConfig.apiPrefix}/customers$q');
    return (res['data'] ?? res) as List<dynamic>;
  }

  Future<Map<String, dynamic>> createCustomer(
      {required String name, required String phoneNumber, String? city}) async {
    final auth = AuthStorage();
    final user = await auth.readUser();
    final martId = user?['martId'];

    final client = ApiClient(baseUrl: ApiConfig.baseUrl, authStorage: auth);
    final payload = {
      'name': name,
      'phoneNumber': phoneNumber,
      if (city != null && city.isNotEmpty) 'city': city,
      if (martId != null) 'martId': martId,
    };
    final res = await client.postJson('${ApiConfig.apiPrefix}/customers',
        body: payload);
    return (res['data'] ?? res) as Map<String, dynamic>;
  }
}
