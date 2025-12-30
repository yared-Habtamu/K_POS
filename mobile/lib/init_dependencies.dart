import 'package:get_it/get_it.dart';
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
}
