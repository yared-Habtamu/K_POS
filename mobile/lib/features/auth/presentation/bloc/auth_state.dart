part of 'auth_bloc.dart';

@immutable
sealed class AuthState {}

final class AuthInitial extends AuthState {}

class AuthLoadingState extends AuthState{}

class AuthSuccessState extends AuthState{}

class AuthFailureState extends AuthState{
  String errMsg;
  AuthFailureState({required this.errMsg});
}
