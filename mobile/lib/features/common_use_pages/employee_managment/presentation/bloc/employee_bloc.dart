import 'dart:async';

import 'package:bloc/bloc.dart';
import 'package:meta/meta.dart';
import 'package:pos_app/features/common_use_pages/employee_managment/data/employee_remote_datastore.dart';

import '../../../../../core/error/exceptions.dart';
import '../../domain/employee_model.dart';

part 'employee_event.dart';
part 'employee_state.dart';

class EmployeeBloc extends Bloc<EmployeeEvent, EmployeeState> {
  EmployeeBloc() : super(EmployeeInitial()) {
    on<FetchEmployeeDataEvent>(_fetchEmployeeDataEvent);
    on<UpdateEmployeeDataEvent>(_updateEmployeeDataEvent);
    on<UpdatePermissionOfEmployeeEvent>(_updatePermissionOfEmployeeEvent);
  }
  FutureOr<void> _fetchEmployeeDataEvent(
      FetchEmployeeDataEvent event, Emitter<EmployeeState> emit) async {
    emit(LoadingEmployeeState());
    try {
      ///
      final employees = await EmployeeRemoteDataSource.fetchEmployees(
          allowedRolesToFetch: []);
      emit(FetchEmployeeSuccessState(employees: employees));
    }  on AppException catch (e) {
      // CASE 1: Our Custom Friendly Error
      // We know exactly what this is (No Internet, Bad Request, etc.)
      emit(FailureEmployeeState(message: e.message));

    } catch (e) {
      emit(FailureEmployeeState(message: "Something unexpected went wrong. Please try again."));
      print(e.toString());
    }
  }

  FutureOr<void> _updateEmployeeDataEvent(
      UpdateEmployeeDataEvent event, Emitter<EmployeeState> emit) async {}

  FutureOr<void> _updatePermissionOfEmployeeEvent(
      UpdatePermissionOfEmployeeEvent event,
      Emitter<EmployeeState> emit) async {}
}
