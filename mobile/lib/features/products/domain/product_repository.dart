import '../data/product_remote_data_source.dart';
import 'product_model.dart';

class ProductRepository {
  final ProductRemoteDataSource _remote;

  ProductRepository({ProductRemoteDataSource? remote})
      : _remote = remote ?? ProductRemoteDataSource();

  Future<List<Product>> listProducts(
          {String? category, String? name, bool lowStock = false}) =>
      _remote.listProducts(category: category, name: name, lowStock: lowStock);

  Future<Product> getProduct(String id) => _remote.getProduct(id);

  Future<Map<String, dynamic>> createProduct(Map<String, String> fields,
          {List<int>? imageBytes, String? filename}) =>
      _remote.createProduct(fields, imageBytes: imageBytes, filename: filename);

  Future<Map<String, dynamic>> updateProduct(
          String id, Map<String, String> fields,
          {List<int>? imageBytes, String? filename}) =>
      _remote.updateProduct(id, fields,
          imageBytes: imageBytes, filename: filename);

  Future<void> deleteProduct(String id) => _remote.deleteProduct(id);

    Future<Product?> findByBarcode(String code) => _remote.findByBarcode(code);
}
