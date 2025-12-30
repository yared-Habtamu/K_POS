part of 'home_bloc.dart';

@immutable
sealed class HomeState {}

final class HomeInitial extends HomeState {}

final class HomeSuccessState extends HomeState {
  final List<MedicationModel> medications;

  HomeSuccessState({required this.medications});
}

final class HomeFailureState extends HomeState {
  String? msgFailure;

  HomeFailureState({
    required this.msgFailure,
  });
}

final class HomeLoadingState extends HomeState {}
