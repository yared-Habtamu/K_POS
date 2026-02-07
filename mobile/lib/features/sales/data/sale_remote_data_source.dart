import '../../../services/api/api_client.dart';
import '../../../services/api/api_config.dart';
import '../../../services/api/auth_storage.dart';
import '../domain/sale_model.dart';

class SaleRemoteDataSource {
  final ApiClient _client;

  SaleRemoteDataSource({ApiClient? client, AuthStorage? storage})
      : _client = client ??
            ApiClient(
              baseUrl: ApiConfig.baseUrl,
              authStorage: storage ?? AuthStorage(),
            );

  Future<Sale> createSale({
    required List<Map<String, dynamic>> items,
    required double subtotal,
    Map<String, dynamic>? discount,
    List<Map<String, dynamic>>? extraCharges,
    String? receiptId,
    String? paymentMethod,
    String? martId,
  }) async {
    final payload = <String, dynamic>{
      if (martId != null) 'martId': martId,
      if (receiptId != null) 'receiptId': receiptId,
      'items': items,
      'subtotal': subtotal,
      if (discount != null) 'discount': discount,
      if (extraCharges != null) 'extraCharges': extraCharges,
      if (paymentMethod != null) 'paymentMethod': paymentMethod,
      // `total`, `tax` will be computed server-side
    };

    final res = await _client.postJson(
      '${ApiConfig.apiPrefix}/sales',
      body: payload,
      authed: true,
    );

    final data = res['data'] ?? res;
    return Sale.fromJson(Map<String, dynamic>.from(data as Map));
  }

  Future<List<Sale>> listSales({String? date, String? martId}) async {
    final q = <String, String>{};
    if (date != null && date.isNotEmpty) q['date'] = date;
    if (martId != null && martId.isNotEmpty) q['martId'] = martId;

    final path = q.isEmpty
        ? '${ApiConfig.apiPrefix}/sales'
        : '${ApiConfig.apiPrefix}/sales?${Uri(queryParameters: q).query}';

    final res = await _client.getJson(path, authed: true);
    final data = res['data'] ?? res;
    if (data is List) {
      return data
          .map((e) => Sale.fromJson(Map<String, dynamic>.from(e)))
          .toList();
    }
    return [];
  }
}
