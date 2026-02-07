part of 'owner_bloc.dart';

class OwnerState {
  final List<Expense> expenses;
  final bool loading;
  final String? error;

  OwnerState({
    required this.expenses,
    this.loading = false,
    this.error,
  });

  OwnerState copyWith({
    List<Expense>? expenses,
    bool? loading,
    String? error,
  }) {
    return OwnerState(
      expenses: expenses ?? this.expenses,
      loading: loading ?? this.loading,
      error: error,
    );
  }
}
