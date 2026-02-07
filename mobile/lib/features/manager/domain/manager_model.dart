
enum SalesPeriod { daily, weekly, monthly }

extension SalesPeriodExt on SalesPeriod {
  String get name => toString().split('.').last;
}

class DashboardStats {
  final double todaySalesEtb;
  final double salesDeltaPct;
  final int transactions;
  final double transactionsDeltaPct;
  final double profitEtb;
  final double profitDeltaPct;
  final int alerts;

  const DashboardStats({
    required this.todaySalesEtb,
    required this.salesDeltaPct,
    required this.transactions,
    required this.transactionsDeltaPct,
    required this.profitEtb,
    required this.profitDeltaPct,
    required this.alerts,
  });
}

class TopProduct {
  final String label;
  final double value;

  TopProduct({required this.label, required this.value});
}

// --- Mock Data Generators (Move to Repository later) ---

DashboardStats mockOwnerStats() => const DashboardStats(
  todaySalesEtb: 8292,
  salesDeltaPct: 12.5,
  transactions: 24,
  transactionsDeltaPct: 8.2,
  profitEtb: 5592,
  profitDeltaPct: 5.3,
  alerts: 3,
);

List<double> mockSales(SalesPeriod period) {
  switch (period) {
    case SalesPeriod.daily:
      return [1200, 1800, 900, 2200, 1600, 1400, 2100];
    case SalesPeriod.weekly:
      return [0, 4500, 0, 0, 0, 3200, 0];
    case SalesPeriod.monthly:
      return [800, 1200, 1600, 900, 1400, 1800, 1500, 2100, 1700, 2300, 1900, 2500];
  }
}

List<TopProduct> mockTopProducts() => [
  TopProduct(label: 'Blue Magic', value: 7.2),
  TopProduct(label: 'Coca Cola', value: 5.0),
  TopProduct(label: 'Water 1L', value: 3.5),
  TopProduct(label: 'Bread', value: 2.8),
];