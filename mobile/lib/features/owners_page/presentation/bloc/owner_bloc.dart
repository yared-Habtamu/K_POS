import 'dart:convert';

import 'package:bloc/bloc.dart';
import 'package:flutter/cupertino.dart';
import 'package:meta/meta.dart';

import '../../../../services/api/api_client.dart';
import '../../domain/expense_model.dart';

part 'owner_event.dart';
part 'owner_state.dart';

class OwnerBloc extends Bloc<OwnerEvent, OwnerState> {
  final ApiClient apiClient;

  OwnerBloc(this.apiClient)
      : super(OwnerState(expenses: [])) {
    on<OwnerExpenseFetchEvent>(_fetch);
    on<OwnerExpenseAddEvent>(_add);
    on<OwnerExpenseDeleteEvent>(_delete);
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

      final updated =
      state.expenses.where((e) => e.id != event.id).toList();

      emit(state.copyWith(expenses: updated));

    } catch (e) {

      emit(state.copyWith(
        error: "Delete failed",
      ));
    }
  }
}
