part of 'auth_bloc.dart';

@immutable
abstract class AuthState {}

final class AuthInitial extends AuthState {}

class AuthLoadingState extends AuthState {}

class AuthSuccessState extends AuthState {
  final String role;

  AuthSuccessState({required this.role});
}

class AuthFailureState extends AuthState {
  String errMsg;
  AuthFailureState({required this.errMsg});
}

class AuthLoggedOutState extends AuthState {}

class AuthAuthenticatedState extends AuthState {
  final String role;

  AuthAuthenticatedState({required this.role});
}
