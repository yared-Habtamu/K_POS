import 'dart:async';

import 'package:bloc/bloc.dart';
import 'package:meta/meta.dart';
import '../../../../services/app_constants.dart';

import '../../../../services/global.dart';
import '../../data/auth_remote_request.dart';

part 'auth_event.dart';
part 'auth_state.dart';

String baseUrl = AppConstants.baseUrl;

class AuthBloc extends Bloc<AuthEvent, AuthState> {
  final authService = AuthService();

  AuthBloc() : super(AuthInitial()) {
    on<SigninClickedEvent>(_signinClickedEvent);
  }

  FutureOr<void> _signinClickedEvent(
    SigninClickedEvent event,
    Emitter<AuthState> emit,
  ) async {
    emit(AuthLoadingState());
    if (event.username.isEmpty || event.password.isEmpty) {
      emit(AuthFailureState(errMsg: "required input is empty"));
      return;
    }
    try {
      final user = await authService.signIn(
        username: event.username,
        password: event.password,
      );
      if (user != null) {
        await Global.storageServices.saveUserId(user.uid ?? "");
        await Global.storageServices.saveUserRole(user.role);
        emit(AuthSuccessState(role: user.role));
      } else {
        emit(AuthFailureState(errMsg: "Login failed"));
      }
    } catch (e) {
      emit(AuthFailureState(errMsg: e.toString()));
    } // signin logic
  }
}
