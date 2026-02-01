part of 'employee_bloc.dart';

@immutable
sealed class EmployeeEvent {}

class FetchEmployeeDataEvent extends EmployeeEvent{}

class UpdateEmployeeDataEvent extends EmployeeEvent{}

class UpdatePermissionOfEmployeeEvent extends EmployeeEvent{}

