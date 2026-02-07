import 'package:pos_app/services/api/api_client.dart';
import 'package:pos_app/services/api/api_config.dart';
import 'package:pos_app/services/api/auth_storage.dart';

class TodaySalesRepository {
  Future<Map<String, dynamic>> fetchTodaySales() async {
    final auth = AuthStorage();
    final user = await auth.readUser();

    String? martId;
    final role =
        (user != null && user['role'] != null) ? user['role'].toString() : null;
    if (role == 'system_admin' && user != null && user['martId'] != null) {
      martId = user['martId'].toString();
    }

    final client = ApiClient(baseUrl: ApiConfig.baseUrl, authStorage: auth);
    final path =
        '${ApiConfig.apiPrefix}/reports/today-sales${martId != null ? '?martId=$martId' : ''}';

    final res = await client.getJson(path);
    // backend returns either { data: ... } or the payload directly
    final payload = res['data'] ?? res;
    return payload as Map<String, dynamic>;
  }
}
