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

  AuthBloc({required AuthRepository authRepository})
      : _authRepository = authRepository,
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
    // Do NOT map empty role to a default. Return empty string for missing role.
    if (r.isEmpty) return '';
    return roleMap[r] ?? r.toLowerCase();
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

      final normalized = _normalizeRole(saved.role);
      if (normalized.isEmpty) {
        // Saved user has no valid role — clear stored auth and treat as logged out
        await _authRepository.logout();
        emit(AuthLoggedOutState());
        return;
      }
      emit(AuthAuthenticatedState(role: normalized));
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
      print(".........point break 1......");
      final user = await _authRepository.login(
          username: event.username, password: event.password);
      print("......MartID :  - >  ${user.martId}.....");
      final normalized = _normalizeRole(user.role);
      if (normalized.isEmpty) {
        // Server returned no role — clear any saved auth and inform UI
        await _authRepository.logout();
        emit(AuthFailureState(
            errMsg:
                'Login succeeded but user role is missing. Please try again later.'));
        return;
      }

      emit(AuthSuccessState(role: normalized));
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
