import 'package:get_it/get_it.dart';
import 'package:pos_app/features/common_use_pages/employee_managment/presentation/bloc/employee_bloc.dart';
import 'package:pos_app/features/owners_page/presentation/bloc/owner_bloc.dart';

import 'features/auth/presentation/bloc/auth_bloc.dart';

final serviceLocator = GetIt.instance;

Future<void> initDependencies() async {
  _intiAuth();
}

void _intiAuth() {
  serviceLocator.registerFactory<AuthBloc>(
    () => AuthBloc(),
  );

  //home page initialization
  serviceLocator.registerFactory<OwnerBloc>(
    () => OwnerBloc(),
  );

  serviceLocator.registerFactory<EmployeeBloc>(
        () => EmployeeBloc(),
  );
}
