import 'dart:async';

import 'package:bloc/bloc.dart';
import 'package:meta/meta.dart';
import '../../../../services/app_constants.dart';

import '../../../../services/global.dart';
import '../../data/auth_repository.dart';
import '../../../../services/api/api_client.dart';

part 'auth_event.dart';
part 'auth_state.dart';

String baseUrl = AppConstants.baseUrl;

class AuthBloc extends Bloc<AuthEvent, AuthState> {
  final AuthRepository _authRepository;

  AuthBloc({AuthRepository? authRepository})
      : _authRepository = authRepository ?? AuthRepository(),
        super(AuthInitial()) {
    on<AuthCheckRequested>(_authCheckRequested);
    on<SigninClickedEvent>(_signinClickedEvent);
    on<LogoutRequested>(_logoutRequested);
  }

  String _normalizeRole(String rawRole) {
    final r = rawRole.trim();
    const roleMap = {
      'systemAdmin': 'system_admin',
      'system_admin': 'system_admin',
      'owner': 'owner',
      'manager': 'manager',
      'cashier': 'cashier',
      'storeKeeper': 'store_keeper',
      'store_keeper': 'store_keeper',
    };
    return roleMap[r] ?? (r.isEmpty ? 'owner' : r);
  }

  FutureOr<void> _authCheckRequested(
    AuthCheckRequested event,
    Emitter<AuthState> emit,
  ) async {
    try {
      final saved = await _authRepository.readSavedUser();
      if (saved == null || saved.token.isEmpty) {
        emit(AuthLoggedOutState());
        return;
      }

      await Global.storageServices.saveUserId(saved.id ?? saved.username);
      await Global.storageServices.saveUserRole(_normalizeRole(saved.role));

      emit(AuthAuthenticatedState(role: _normalizeRole(saved.role)));
    } catch (_) {
      emit(AuthLoggedOutState());
    }
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
      final user = await _authRepository.login(
          username: event.username, password: event.password);

      await Global.storageServices.saveUserId(user.id ?? user.username);
      await Global.storageServices.saveUserRole(_normalizeRole(user.role));

      emit(AuthSuccessState(role: _normalizeRole(user.role)));
    } catch (e) {
      if (e is ApiException) {
        emit(AuthFailureState(errMsg: e.message));
      } else {
        emit(AuthFailureState(errMsg: 'Login failed'));
      }
    } // signin logic
  }

  FutureOr<void> _logoutRequested(
    LogoutRequested event,
    Emitter<AuthState> emit,
  ) async {
    await _authRepository.logout();
    await Global.storageServices.clearUserAuth();
    emit(AuthLoggedOutState());
  }
}
