import 'package:pos_app/services/api/api_client.dart';
import 'package:pos_app/services/api/api_config.dart';
import 'package:pos_app/services/api/auth_storage.dart';

class DailyReportRepository {
  Future<Map<String, dynamic>> fetchDailyReport({String? date}) async {
    final auth = AuthStorage();
    final user = await auth.readUser();
    final martId = user?['martId'];

    final client = ApiClient(baseUrl: ApiConfig.baseUrl, authStorage: auth);
    final q = martId != null
        ? '?martId=$martId${date != null ? '&date=$date' : ''}'
        : '';
    final res = await client.getJson('${ApiConfig.apiPrefix}/reports/daily$q');
    return res['data'] ?? res;
  }

  Future<List<dynamic>> fetchSales({String? date}) async {
    final auth = AuthStorage();
    final user = await auth.readUser();
    final martId = user?['martId'];

    final client = ApiClient(baseUrl: ApiConfig.baseUrl, authStorage: auth);
    final q = martId != null
        ? '?martId=$martId${date != null ? '&date=$date' : ''}'
        : '';
    final res = await client.getJson('${ApiConfig.apiPrefix}/sales$q');
    return (res['data'] ?? res) as List<dynamic>;
  }

  Future<List<dynamic>> fetchSubmittedReports({String? date}) async {
    final auth = AuthStorage();
    final user = await auth.readUser();
    final martId = user?['martId'];

    final client = ApiClient(baseUrl: ApiConfig.baseUrl, authStorage: auth);
    final q = martId != null
        ? '?martId=$martId${date != null ? '&date=$date' : ''}'
        : '';
    final res = await client.getJson('${ApiConfig.apiPrefix}/daily-reports$q');
    return (res['data'] ?? res) as List<dynamic>;
  }
}
