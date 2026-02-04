part of 'auth_bloc.dart';

@immutable
sealed class AuthEvent {}

class SigninClickedEvent extends AuthEvent {
  String username;
  String password;
  // String confirmPassword;

  SigninClickedEvent({
    required this.username,
    required this.password,
  });
}

class AuthCheckRequested extends AuthEvent {}

class LogoutRequested extends AuthEvent {}
