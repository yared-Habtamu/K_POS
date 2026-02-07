import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:get_it/get_it.dart';
import 'package:pos_app/features/auth/data/auth_repository.dart';
import 'package:pos_app/features/common_use_pages/employee_managment/presentation/bloc/employee_bloc.dart';
import 'package:pos_app/features/manager/presentation/bloc/manager_bloc.dart';
import 'package:pos_app/features/owners_page/presentation/bloc/owner_bloc.dart';
import 'package:pos_app/services/api/api_client.dart';
import 'package:pos_app/services/api/api_config.dart';
import 'package:pos_app/services/api/auth_storage.dart';
import 'package:pos_app/services/global.dart';

import 'features/auth/presentation/bloc/auth_bloc.dart';

final serviceLocator = GetIt.instance;

Future<void> initDependencies() async {
  _intiAuth();
}

void _intiAuth() {
  serviceLocator.registerLazySingleton<ApiClient>(
    () => ApiClient(
      baseUrl: ApiConfig.baseUrl + ApiConfig.apiPrefix,
      authStorage: serviceLocator(),
    ),
  );
  serviceLocator.registerLazySingleton<AuthStorage>(
    () => AuthStorage(secureStorage: const FlutterSecureStorage()),
  );

  serviceLocator.registerLazySingleton<AuthRepository>(
    () => AuthRepository(
      client: serviceLocator<ApiClient>(),
      storage: serviceLocator<AuthStorage>(),
    ),
  );

  serviceLocator.registerFactory<AuthBloc>(
    () => AuthBloc(
      authRepository: serviceLocator(),
    ),
  );

  //home page initialization
  serviceLocator.registerFactory<OwnerBloc>(
    () => OwnerBloc(serviceLocator()),
  );

  serviceLocator.registerFactory<EmployeeBloc>(
    () => EmployeeBloc(),
  );
  serviceLocator.registerFactory<ManagerBloc>(
    () => ManagerBloc(
      apiClient: serviceLocator(),
    ),
  );
}
