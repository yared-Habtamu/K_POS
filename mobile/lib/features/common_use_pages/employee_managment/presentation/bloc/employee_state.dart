part of 'employee_bloc.dart';

@immutable
sealed class EmployeeState {}

final class EmployeeInitial extends EmployeeState {}

class LoadingEmployeeState extends EmployeeState {}

class FetchEmployeeSuccessState extends EmployeeState {
  List<Employee> employees = [];

  FetchEmployeeSuccessState({required this.employees});
}

class UpdateEmployeeDataSuccessState extends EmployeeState {}

class FailureEmployeeState extends EmployeeState {
  final String? message;
  FailureEmployeeState({required this.message});
}
