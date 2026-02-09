import 'dart:convert';

import 'package:bloc/bloc.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:meta/meta.dart';

import '../../../../services/api/api_client.dart';
import '../../../manager/domain/payment_model.dart' as mgr_models;
import 'dart:math';
import '../../domain/expense_model.dart';

part 'owner_event.dart';
part 'owner_state.dart';

class OwnerBloc extends Bloc<OwnerEvent, OwnerState> {
  final ApiClient apiClient;

  OwnerBloc(this.apiClient) : super(OwnerState(expenses: [])) {
    on<OwnerExpenseFetchEvent>(_fetch);
    on<OwnerExpenseAddEvent>(_add);
    on<OwnerExpenseDeleteEvent>(_delete);
    on<OwnerReportFetchEvent>(_fetchReport);
  }

  //-------------------------------------------
  // FETCH
  //-------------------------------------------

  Future<void> _fetch(
    OwnerExpenseFetchEvent event,
    Emitter<OwnerState> emit,
  ) async {
    debugPrint("✅ [EXPENSE] FETCH START");

    emit(state.copyWith(loading: true, error: null));

    try {
      String path = "/expenses";

      if (event.martId != null) {
        path += "?martId=${event.martId}";
      }

      debugPrint("➡️ PATH -> $path");

      final res = await apiClient.getJson(path);

      debugPrint("✅ RESPONSE RECEIVED - > $res");

      if (res['data'] is! List) {
        throw Exception("Invalid expense response");
      }

      final expenseList = (res['data'] as List)
          .map<Expense>((e) => Expense.fromJson(e))
          .toList();

      debugPrint("✅ PARSED -> ${expenseList.length}");

      emit(state.copyWith(
        expenses: expenseList,
        loading: false,
      ));
    } catch (e, st) {
      debugPrint("❌ FETCH CRASH -> $e");
      debugPrintStack(stackTrace: st);

      emit(state.copyWith(
        loading: false,
        error: "Failed to load expenses",
      ));
    }
  }

  Future<void> _add(
    OwnerExpenseAddEvent event,
    Emitter<OwnerState> emit,
  ) async {
    try {
      debugPrint("✅ ADDING EXPENSE");

      final res = await apiClient.postJson(
        "/expenses",
        body: event.expense.toJson(),
      );

      final newExpense = Expense.fromJson(res);

      emit(state.copyWith(
        expenses: [newExpense, ...state.expenses],
      ));
    } catch (e) {
      emit(state.copyWith(
        error: "Failed to add expense",
      ));
    }
  }

  //-------------------------------------------
  // DELETE
  //-------------------------------------------

  Future<void> _delete(
    OwnerExpenseDeleteEvent event,
    Emitter<OwnerState> emit,
  ) async {
    try {
      debugPrint("🗑 DELETE -> ${event.id}");

      await apiClient.deleteJson("/expenses/${event.id}");

      final updated = state.expenses.where((e) => e.id != event.id).toList();

      emit(state.copyWith(expenses: updated));
    } catch (e) {
      emit(state.copyWith(
        error: "Delete failed",
      ));
    }
  }

  Future<void> _fetchReport(
    OwnerReportFetchEvent event,
    Emitter<OwnerState> emit,
  ) async {
    emit(state.copyWith(loading: true, error: null));

    try {
      final range = event.range ?? 'monthly';
      String martQuery = '';
      if (event.martId != null && event.martId!.isNotEmpty) {
        martQuery = '&martId=${event.martId}';
      }

      // 1) Summary endpoint (payment methods + total series)
      final summaryPath = '/reports/summary?range=$range${martQuery}';
      final summaryRes = await apiClient.getJson(summaryPath);

      final double totalSales = (summaryRes['totalSales'] ?? 0).toDouble();
      final transactions = (summaryRes['count'] ?? 0) as int? ?? 0;
      final avgOrder = transactions == 0 ? 0.0 : totalSales / transactions;

      final rawPayments = summaryRes['salesByPaymentMethod'] as List?;
      final seriesRaw = summaryRes['series'] as List?;
      final salesSeries = seriesRaw
              ?.map<double>((e) => (e['total'] ?? 0).toDouble())
              .toList() ??
          <double>[];

      final random = Random();

      final paymentMethods = rawPayments?.map<mgr_models.PaymentMethod>((e) {
            final name = e['method'] ?? 'Unknown';
            final amt = (e['total'] ?? 0).toDouble();
            final color =
                HSVColor.fromAHSV(1, random.nextDouble() * 360, 0.65, 0.85)
                    .toColor();
            return mgr_models.PaymentMethod(
                name: name, amount: amt, color: color);
          }).toList() ??
          <mgr_models.PaymentMethod>[];

      // 2) Mart endpoint for top products
      final martPath = '/reports/mart?range=$range${martQuery}';
      final martRes = await apiClient.getJson(martPath);

      final productList = martRes['topProducts'] as List?;

      final profit = (martRes['profit'] ?? 0).toDouble();

      final topProducts = productList?.map<mgr_models.TopProduct>((e) {
            return mgr_models.TopProduct(
              name: e['name'] ?? 'Unknown',
              revenue: (e['revenue'] ?? 0).toDouble(),
              sold: (e['sold'] ?? 0) as int?,
              productId: e['productId']?.toString(),
            );
          }).toList() ??
          <mgr_models.TopProduct>[];

      emit(state.copyWith(
        loading: false,
        totalSales: totalSales,
        totalOrders: transactions,
        avgOrder: avgOrder,
        profit: profit,
        salesSeries: salesSeries,
        paymentMethods: paymentMethods,
        topProducts: topProducts,
      ));
    } catch (e, st) {
      debugPrint('❌ Owner report fetch failed -> $e');
      debugPrintStack(stackTrace: st);

      emit(state.copyWith(loading: false, error: 'Failed to load report'));
    }
  }
}
