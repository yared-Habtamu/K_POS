import '../data/sale_remote_data_source.dart';
import 'sale_model.dart';

class SaleRepository {
  final SaleRemoteDataSource _remote;

  SaleRepository({SaleRemoteDataSource? remote})
      : _remote = remote ?? SaleRemoteDataSource();

  Future<Sale> createSale({
    required List<Map<String, dynamic>> items,
    required double subtotal,
    Map<String, dynamic>? discount,
    List<Map<String, dynamic>>? extraCharges,
    String? receiptId,
    String? paymentMethod,
    String? martId,
  }) {
    return _remote.createSale(
      items: items,
      subtotal: subtotal,
      discount: discount,
      extraCharges: extraCharges,
      receiptId: receiptId,
      paymentMethod: paymentMethod,
      martId: martId,
    );
  }

  Future<List<Sale>> listSales({String? date, String? martId}) {
    return _remote.listSales(date: date, martId: martId);
  }
}
