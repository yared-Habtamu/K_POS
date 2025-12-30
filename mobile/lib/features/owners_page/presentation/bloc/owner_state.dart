part of 'owner_bloc.dart';

@immutable
sealed class OwnerState {}

final class OwnerInitial extends OwnerState {}

final class OwnerSuccessState extends OwnerState {
  OwnerSuccessState();
}

final class OwnerFailureState extends OwnerState {
  String? msgFailure;

  OwnerFailureState({
    required this.msgFailure,
  });
}

final class OwnerLoadingState extends OwnerState {}
