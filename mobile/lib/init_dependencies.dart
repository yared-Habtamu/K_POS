import 'package:get_it/get_it.dart';

import 'features/auth/presentation/bloc/auth_bloc.dart';
import 'features/home/presentation/bloc/home_bloc.dart';

final serviceLocator = GetIt.instance;

Future<void> initDependencies() async {
  _intiAuth();
}

void _intiAuth() {
  serviceLocator.registerFactory<AuthBloc>(
    () => AuthBloc(),
  );

  //home page initialization
  serviceLocator.registerFactory<HomeBloc>(
    () => HomeBloc(),
  );
}
