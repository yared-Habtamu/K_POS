import 'dart:convert';

import '../../../services/api/api_client.dart';
import '../../../services/api/api_config.dart';
import '../../../services/api/auth_storage.dart';
import '../domain/product_model.dart';

class ProductRemoteDataSource {
  final ApiClient _client;

  ProductRemoteDataSource({ApiClient? client, AuthStorage? storage})
      : _client = client ??
            ApiClient(
                baseUrl: ApiConfig.baseUrl,
                authStorage: storage ?? AuthStorage());

  Future<List<Product>> listProducts(
      {String? category, String? name, bool lowStock = false}) async {
    final q = <String, String>{};
    if (category != null) q['category'] = category;
    if (name != null) q['name'] = name;
    if (lowStock) q['lowStock'] = 'true';
    final path = q.isEmpty
        ? '${ApiConfig.apiPrefix}/products'
        : '${ApiConfig.apiPrefix}/products?${Uri(queryParameters: q).query}';
    final res = await _client.getJson(path);
    final data = res['data'] ?? res;
    if (data is List) {
      return data
          .map((e) => Product.fromJson(Map<String, dynamic>.from(e)))
          .toList();
    }
    return [];
  }

  Future<Product> getProduct(String id) async {
    final res = await _client.getJson('${ApiConfig.apiPrefix}/products/$id');
    final data = res['data'] ?? res;
    if (data is Map<String, dynamic>) return Product.fromJson(data);
    return Product.fromJson(Map<String, dynamic>.from(data as Map));
  }

  /// Creates product. Returns a map with either {'product': Product} when
  /// created immediately, or {'requestId': '<id>'} when submitted for
  /// approval (owners).
  Future<Map<String, dynamic>> createProduct(Map<String, String> fields,
      {List<int>? imageBytes, String? filename}) async {
    final res = await _client.postMultipart('${ApiConfig.apiPrefix}/products',
        fields: fields, fileBytes: imageBytes, filename: filename);
    // If backend returned a product object, return it; otherwise return request metadata
    if (res.containsKey('_id') ||
        (res['data'] is Map && (res['data'] as Map).containsKey('_id'))) {
      final data = res['data'] ?? res;
      return {
        'product': Product.fromJson(Map<String, dynamic>.from(data as Map))
      };
    }
    // e.g., { message: 'Product submitted for manager approval', requestId }
    return {'requestId': res['requestId'] ?? res['requestId']?.toString()};
  }

  /// Updates product. Returns map similar to createProduct (product or requestId).
  Future<Map<String, dynamic>> updateProduct(
      String id, Map<String, String> fields,
      {List<int>? imageBytes, String? filename}) async {
    final res = await _client.putMultipart(
        '${ApiConfig.apiPrefix}/products/$id',
        fields: fields,
        fileBytes: imageBytes,
        filename: filename);
    if (res.containsKey('_id') ||
        (res['data'] is Map && (res['data'] as Map).containsKey('_id'))) {
      final data = res['data'] ?? res;
      return {
        'product': Product.fromJson(Map<String, dynamic>.from(data as Map))
      };
    }
    return {'requestId': res['requestId'] ?? res['requestId']?.toString()};
  }

  Future<void> deleteProduct(String id) async {
    await _client.deleteJson('${ApiConfig.apiPrefix}/products/$id');
  }

  Future<Product?> findByBarcode(String code) async {
    try {
      final res = await _client
          .getJson('${ApiConfig.apiPrefix}/products/by-barcode/$code');
      final data = res['data'] ?? res;
      return Product.fromJson(Map<String, dynamic>.from(data as Map));
    } catch (e) {
      return null;
    }
  }
}
