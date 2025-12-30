part of 'home_bloc.dart';

@immutable
sealed class HomeEvent {}

class AddUserSchedulesEvent extends HomeEvent {
  MedicationModel medInfo;

  AddUserSchedulesEvent({required this.medInfo});
}

class FetchUserSchedulesEvent extends HomeEvent {
  FetchUserSchedulesEvent();
}
