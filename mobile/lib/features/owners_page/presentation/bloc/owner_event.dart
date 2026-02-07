part of 'owner_bloc.dart';

@immutable
sealed class OwnerEvent {}

class OwnerExpenseFetchEvent extends OwnerEvent {
  final String? martId;

  OwnerExpenseFetchEvent({this.martId});
}

class OwnerExpenseAddEvent extends OwnerEvent {
  final Expense expense;

  OwnerExpenseAddEvent(this.expense);
}

class OwnerExpenseDeleteEvent extends OwnerEvent {
  final String id;

  OwnerExpenseDeleteEvent(this.id);
}
