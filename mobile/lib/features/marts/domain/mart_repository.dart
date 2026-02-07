import '../data/mart_remote_data_source.dart';

class MartRepository {
  final MartRemoteDataSource _remote;

  MartRepository({MartRemoteDataSource? remote})
      : _remote = remote ?? MartRemoteDataSource();

  Future<Map<String, dynamic>> getMart(String martId) {
    return _remote.getMart(martId);
  }

  Future<Map<String, dynamic>> updateMart(String martId,
      {required Map<String, dynamic> updates}) {
    return _remote.updateMart(martId, updates: updates);
  }

  Future<double> getTaxRate(String martId) async {
    final mart = await _remote.getMart(martId);
    final raw = mart['taxRate'];
    if (raw is num) return raw.toDouble();
    return double.tryParse(raw?.toString() ?? '') ?? 0.0;
  }

  Future<double> updateTaxRate(String martId, double taxRate) async {
    final mart = await _remote.updateMart(martId, updates: {'taxRate': taxRate});
    final raw = mart['taxRate'];
    if (raw is num) return raw.toDouble();
    return double.tryParse(raw?.toString() ?? '') ?? taxRate;
  }
}
